import { BIZSIM_CONFIG } from '../config/constants.js';
import { DEFAULT_DATA, DEFAULT_WORLD_SIMULATION } from '../config/defaultData.js';
import { PROMPTS } from '../config/prompts.js';
import { createDefaultTemplateStructure, ensureCurrentTemplateStructure } from '../config/promptModules.js';
import { compileTemplateWithUserPref } from './BizSimEngine.scaffold.js';
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
          const migratedSimulation = { ...savedSettings.SIMULATION };
          if (migratedSimulation.includeFloorData === undefined && migratedSimulation.includeEmpireData !== undefined) {
            migratedSimulation.includeFloorData = !!migratedSimulation.includeEmpireData;
          }
          this.config.SIMULATION = { ...this.config.SIMULATION, ...migratedSimulation };
        }
        if (savedSettings.AUDIT) {
          this.config.AUDIT = { ...this.config.AUDIT, ...savedSettings.AUDIT };
        }
        if (savedSettings.prompts) {
          this.promptTemplates = { ...this.promptTemplates, ...savedSettings.prompts };
        }
      }

      // 2. 从楼层变量读取数据
      const messageId = getCurrentMessageIdSafe();
      const floorVars = getMessageVariablesSafe(messageId);

      if (floorVars) {
        const scoped = this.resolveFloorStatDataSource(floorVars);
        if (scoped) {
          const assetsData = this.extractAssetStatPayload(scoped);
          if (assetsData) {
            this.data = this.buildFloorDataFromSemanticAssets(assetsData);
          }

          const worldData = this.extractWorldSimulationPayload(scoped);
          if (worldData) {
            this.worldSimulation = worldData;
          }
        }
      }

      // 3. 如果没有找到楼层数据，使用默认值
      if (!this.data) {
        this.data = this.getDefaultFloorData();
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
      this.data = this.getDefaultFloorData();
      this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
      this.initialized = false;
      return false;
    }
  }

  initializePromptTemplates() {
    const cfg = this.config.SIMULATION;

    if (!cfg.tplRaw || !Array.isArray(cfg.tplRaw.scaffold)) {
      cfg.tplRaw = createDefaultTemplateStructure();
    }

    cfg.tplRaw = ensureCurrentTemplateStructure(cfg.tplRaw);

    cfg.tpl = compileTemplateWithUserPref(cfg.tplRaw, cfg.userPref);
  }

  getDefaultFloorData() {
    return deepClone(DEFAULT_DATA);
  }

  async saveSettingsOnly() {
    try {
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
      return true;
    } catch (error) {
      console.error('[BizSim] 保存设置失败:', error);
      return false;
    }
  }

  async saveFloorDataOnly() {
    try {
      const messageId = this.getLatestAssistantMessageIdSafe?.();
      if (messageId === null || messageId === undefined) {
        console.warn('[BizSim] 未找到可写入的 AI 回复楼层，已跳过楼层变量保存');
        return false;
      }

      const { assetsKey, worldStateKey } = this.getFloorNamespaceKeys();
      const semanticAssets = this.normalizeBizsimAssetsPayload(this.buildSemanticAssetsFromFloorData(this.data));
      const floorVars = getMessageVariablesSafe(messageId);
      const currentScoped = this.resolveFloorStatDataSource(floorVars);
      const baseStatData = currentScoped && typeof currentScoped === 'object'
        ? deepClone(currentScoped)
        : {};

      const floorPayload = {
        stat_data: {
          ...baseStatData,
          [assetsKey]: semanticAssets,
          [worldStateKey]: this.worldSimulation,
        },
      };

      insertOrAssignVariablesSafe(floorPayload, { type: 'message', message_id: messageId });
      return true;
    } catch (error) {
      console.error('[BizSim] 保存楼层数据失败:', error);
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
          // 提取 floorData
          const assetsData = this.extractAssetStatPayload(scoped);
          console.log('[BizSim Debug] assetsData:', assetsData);

          if (assetsData) {
            this.data = this.buildFloorDataFromSemanticAssets(assetsData);
          }

          // 提取 worldSimulation
          const worldData = this.extractWorldSimulationPayload(scoped);
          console.log('[BizSim Debug] worldData:', worldData);

          if (worldData) {
            this.worldSimulation = worldData;
          }

          // 如果没有找到楼层数据，使用默认值
          if (!this.data) {
            this.data = this.getDefaultFloorData();
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
      this.data = this.getDefaultFloorData();
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
