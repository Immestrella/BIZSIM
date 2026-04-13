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
import { PromptPresetManager } from '../ui/BizSimUI.presets.js';

import { BIZSIM_ENGINE_CONTEXT_METHODS } from './BizSimEngine.context.js'

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
      // 1. 从角色变量读取设置（全局持久）
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
          if (!this.promptTemplates.CORE_PROMPT_BLOCK && this.promptTemplates.WORLD_SIMULATION) {
            this.promptTemplates.CORE_PROMPT_BLOCK = this.promptTemplates.WORLD_SIMULATION;
          }
        }
      }

      // 2. 从楼层变量读取数据（每楼独立）
      const messageId = getCurrentMessageIdSafe();
      const floorVars = messageId !== null && messageId !== undefined
        ? getMessageVariablesSafe(messageId)
        : null;

      if (floorVars) {
        const scoped = this.resolveFloorStatDataSource(floorVars);
        const savedData = scoped || floorVars;

        const empireData = savedData?.empireData || savedData?.bizsim_assets;
        const worldSimulation = savedData?.worldSimulation || savedData?.bizsim_world_state;

        if (empireData) {
          this.data = empireData;
        } else {
          this.data = this.getDefaultEmpireData();
        }

        if (worldSimulation) {
          this.worldSimulation = worldSimulation;
        } else {
          this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
        }
      } else {
        this.data = this.getDefaultEmpireData();
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
      // 1. 保存设置到角色变量（全局持久）
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

      // 2. 保存数据到楼层变量（每楼独立）
      const messageId = getCurrentMessageIdSafe();
      if (messageId !== null && messageId !== undefined) {
        const { assetsKey, worldStateKey } = this.getFloorNamespaceKeys();
        const semanticAssets = this.normalizeBizsimAssetsPayload(
          this.buildSemanticAssetsFromEmpireData(this.data)
        );
        const dataPayload = {
          stat_data: {
            [assetsKey]: semanticAssets,
            [worldStateKey]: this.worldSimulation,
          },
        };
        insertOrAssignVariablesSafe(dataPayload, { type: 'message', message_id: messageId });
      }

      return true;
    } catch (error) {
      console.error('[BizSim] 保存失败:', error);
      return false;
    }
  }
      return false;
    }
  }

  getPromptTemplate(key) {
    return this.promptTemplates?.[key] || PROMPTS[key] || '';
  }


Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_PROMPT_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_VALIDATION_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_CONTEXT_METHODS);
  async reloadFromFloorVariables() {
    try {
      console.log('[BizSim Debug] reloadFromFloorVariables() 开始执行');
      const messageId = getCurrentMessageIdSafe();
      console.log('[BizSim Debug] currentMessageId:', messageId);

      const variables = messageId !== null && messageId !== undefined
        ? getMessageVariablesSafe(messageId)
        : null;
      console.log('[BizSim Debug] variables:', variables);

      if (variables) {
        const scoped = this.resolveFloorStatDataSource(variables);
        const savedData = scoped || variables;
        console.log('[BizSim Debug] savedData:', savedData);

        // 只提取资产数据（设置从角色变量读取，不在此处更新）
        const empireData = savedData?.empireData || savedData?.bizsim_assets;
        const worldSimulation = savedData?.worldSimulation || savedData?.bizsim_world_state;

        if (empireData) {
          console.log('[BizSim Debug] 找到 empireData，正在加载...');
          this.data = empireData;
        } else {
          console.log('[BizSim Debug] empireData 为空，使用默认值');
          this.data = this.getDefaultEmpireData();
        }

        if (worldSimulation) {
          console.log('[BizSim Debug] 找到 worldSimulation，正在加载...');
          this.worldSimulation = worldSimulation;
        } else {
          console.log('[BizSim Debug] worldSimulation 为空，使用默认值');
          this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
        }

        console.log('[BizSim] 已从楼层变量重新加载数据');
        console.log('[BizSim Debug] 加载后的 this.data:', this.data);
        return true;
      }

      // 变量系统中无数据，重置为默认
      console.log('[BizSim Debug] 楼层变量为空，重置为默认值');
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
