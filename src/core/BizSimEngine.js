import { BIZSIM_CONFIG } from '../config/constants.js';
import { DEFAULT_DATA, DEFAULT_WORLD_SIMULATION } from '../config/defaultData.js';
import { PROMPTS } from '../config/prompts.js';
import { upgradeLegacyBuiltInBlocks } from '../config/promptModules.js';
import { createDefaultTemplateStructure } from '../config/promptModules.js';
import { compileTemplateWithUserPref, migrateOldCorePromptBlockToScaffold } from './BizSimEngine.scaffold.js';
import { getCharacterVariablesSafe, getCurrentMessageIdSafe, getMessageVariablesSafe, insertOrAssignVariablesSafe } from '../utils/stCompat.js';
import { deepClone, getByPath } from '../utils/object.js';
import { BIZSIM_ENGINE_PROMPT_METHODS } from './BizSimEngine.prompt.js';
import { BIZSIM_ENGINE_METHODS } from './BizSimEngine.methods.js';
import { BIZSIM_ENGINE_VALIDATION_METHODS } from './BizSimEngine.validation.js';
import { BIZSIM_ENGINE_CONTEXT_METHODS } from './BizSimEngine.context.js';
import { PromptPresetManager } from '../ui/BizSimUI.presets.js';

export class BizSimEngine {
  constructor() {
    this.config = deepClone(BIZSIM_CONFIG);
    this.data = null;
    this.worldSimulation = null;
    this.lastPromptSnapshot = '';
    this.lastPromptBuiltAt = null;
    this.promptTemplates = {
      COMPOSE_PROMPT: PROMPTS.COMPOSE_PROMPT,
      BREAK_PROMPT: PROMPTS.BREAK_PROMPT,
      CORE_PROMPT_BLOCK: PROMPTS.CORE_PROMPT_BLOCK,
      EMPIRE_AUDIT: PROMPTS.EMPIRE_AUDIT,
    };
    this.initialized = false;
    this.presetManager = null;
  }

  async initialize() {
    try {
      // 1. 从角色变量读取设置
      const charVars = await getCharacterVariablesSafe();
      const savedSettings = getByPath(charVars, `${this.config.VAR_PATH}.settings`);

      if (savedSettings) {
        if (savedSettings.LLM) {
          this.config.LLM = { ...this.config.LLM, ...savedSettings.LLM };
        }
        if (savedSettings.SIMULATION) {
          this.config.SIMULATION = { ...this.config.SIMULATION, ...savedSettings.SIMULATION };
        }
        if (savedSettings.AUDIT) {
          this.config.AUDIT = { ...this.config.AUDIT, ...savedSettings.AUDIT };
        }
        if (savedSettings.prompts) {
          this.promptTemplates = { ...this.promptTemplates, ...savedSettings.prompts };
          // Backward compatibility: migrate legacy key to the new core prompt key.
          if (!this.promptTemplates.CORE_PROMPT_BLOCK && this.promptTemplates.WORLD_SIMULATION) {
            this.promptTemplates.CORE_PROMPT_BLOCK = this.promptTemplates.WORLD_SIMULATION;
          }
        }
      }

      // 2. 从楼层变量读取数据
      const messageId = getCurrentMessageIdSafe();
      const floorVars = getMessageVariablesSafe(messageId);

      if (floorVars) {
        const scoped = this.resolveFloorStatDataSource(floorVars);
        if (scoped) {
          // 提取 empireData 从 savedData?.empireData 或 savedData?.bizsim_assets
          const assetsData = this.extractAssetStatPayload(scoped);
          if (assetsData) {
            this.data = this.buildEmpireDataFromSemanticAssets(assetsData);
          }

          // 提取 worldSimulation 从 savedData?.worldSimulation 或 savedData?.bizsim_world_state
          const worldData = this.extractWorldSimulationPayload(scoped);
          if (worldData) {
            this.worldSimulation = worldData;
          }
        }
      }

      // 3. 如果没有找到楼层数据，使用默认值
      if (!this.data) {
        this.data = this.getDefaultEmpireData();
      }
      if (!this.worldSimulation) {
        this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
      }

      // 初始化 tplRaw 和 tpl（支持模块化架构）
      this.initializePromptTemplates();

      // 初始化预设管理器
      this.presetManager = new PromptPresetManager(this);

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[BizSim] 初始化失败:', error);
      this.data = this.getDefaultEmpireData();
      this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
      this.initialized = false;
      return false;
    }
  }

  initializePromptTemplates() {
    const cfg = this.config.SIMULATION;

    // 情景 A：从旧配置迁移，CORE_PROMPT_BLOCK 是字符串且无 tplRaw → 转换为 scaffold
    if (!cfg.tplRaw && typeof this.promptTemplates.CORE_PROMPT_BLOCK === 'string' && this.promptTemplates.CORE_PROMPT_BLOCK.trim()) {
      try {
        cfg.tplRaw = migrateOldCorePromptBlockToScaffold(this.promptTemplates.CORE_PROMPT_BLOCK);
      } catch (e) {
        console.warn('[BizSim] 迁移旧 CORE_PROMPT_BLOCK 失败，使用默认模版', e);
        cfg.tplRaw = createDefaultTemplateStructure();
      }
    }

    // 情景 B：首次使用或迁移失败，tplRaw 为空 → 创建默认模版
    if (!cfg.tplRaw) {
      cfg.tplRaw = createDefaultTemplateStructure();
    }

    // 编译 tplRaw → tpl（融入 userPref）
    if (cfg.tplRaw) {
      cfg.tplRaw = upgradeLegacyBuiltInBlocks(cfg.tplRaw);
      cfg.tpl = compileTemplateWithUserPref(cfg.tplRaw, cfg.userPref);
    }
  }

  getDefaultEmpireData() {
    return deepClone(DEFAULT_DATA);
  }

  async saveData() {
    try {
      // 1. 保存设置到角色变量
      const safeLLM = {
        ...this.config.LLM,
        apiKey: this.config.LLM.persistApiKey ? this.config.LLM.apiKey : '',
      };

      const settingsPayload = {
        [this.config.VAR_PATH]: {
          settings: {
            LLM: safeLLM,
            SIMULATION: this.config.SIMULATION,
            AUDIT: this.config.AUDIT,
            prompts: this.promptTemplates,
          },
          lastUpdate: new Date().toISOString(),
          version: this.config.VERSION,
        },
      };

      insertOrAssignVariablesSafe(settingsPayload);

      // 2. 保存数据到楼层变量
      const messageId = getCurrentMessageIdSafe();
      if (messageId !== null && messageId !== undefined) {
        const { assetsKey, worldStateKey } = this.getFloorNamespaceKeys();
        const semanticAssets = this.normalizeBizsimAssetsPayload(this.buildSemanticAssetsFromEmpireData(this.data));

        const floorPayload = {
          stat_data: {
            [assetsKey]: semanticAssets,
            [worldStateKey]: this.worldSimulation,
          },
        };

        insertOrAssignVariablesSafe(floorPayload, { type: 'message', message_id: messageId });
      }

      return true;
    } catch (error) {
      console.error('[BizSim] 保存失败:', error);
      return false;
    }
  }

  getPromptTemplate(key) {
    return this.promptTemplates?.[key] || PROMPTS[key] || '';
  }

  async reloadFromVariables() {
    return this.reloadFromFloorVariables();
  }

  async reloadFromFloorVariables() {
    try {
      console.log('[BizSim Debug] reloadFromFloorVariables() 开始执行');

      // 只从楼层变量读取数据
      const messageId = getCurrentMessageIdSafe();
      console.log('[BizSim Debug] messageId:', messageId);

      const floorVars = getMessageVariablesSafe(messageId);
      console.log('[BizSim Debug] floorVars:', floorVars);

      if (floorVars) {
        const scoped = this.resolveFloorStatDataSource(floorVars);
        console.log('[BizSim Debug] scoped:', scoped);

        if (scoped) {
          // 提取 empireData
          const assetsData = this.extractAssetStatPayload(scoped);
          console.log('[BizSim Debug] assetsData:', assetsData);

          if (assetsData) {
            this.data = this.buildEmpireDataFromSemanticAssets(assetsData);
          }

          // 提取 worldSimulation
          const worldData = this.extractWorldSimulationPayload(scoped);
          console.log('[BizSim Debug] worldData:', worldData);

          if (worldData) {
            this.worldSimulation = worldData;
          }

          // 如果没有找到楼层数据，使用默认值
          if (!this.data) {
            this.data = this.getDefaultEmpireData();
          }
          if (!this.worldSimulation) {
            this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
          }

          console.log('[BizSim] 已从楼层变量重新加载数据');
          console.log('[BizSim Debug] 加载后的 this.data:', this.data);
          return true;
        }
      }

      // 楼层变量中无数据，重置为默认
      console.log('[BizSim Debug] 楼层变量中无数据，重置为默认值');
      this.data = this.getDefaultEmpireData();
      this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
      console.log('[BizSim] 楼层变量中无数据，已重置为默认值');
      console.log('[BizSim Debug] 重置后的 this.data:', this.data);
      return true;
    } catch (error) {
      console.error('[BizSim] 从楼层变量重新加载失败:', error);
      return false;
    }
  }
}

Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_PROMPT_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_VALIDATION_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_CONTEXT_METHODS);
