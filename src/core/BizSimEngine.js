import { BIZSIM_CONFIG } from '../config/constants.js';
import { DEFAULT_DATA, DEFAULT_WORLD_SIMULATION } from '../config/defaultData.js';
import { PROMPTS } from '../config/prompts.js';
import { upgradeLegacyBuiltInBlocks } from '../config/promptModules.js';
import { createDefaultTemplateStructure } from '../config/promptModules.js';
import { compileTemplateWithUserPref, migrateOldCorePromptBlockToScaffold } from './BizSimEngine.scaffold.js';
import { getCharacterVariablesSafe, insertOrAssignVariablesSafe } from '../utils/stCompat.js';
import { deepClone, getByPath } from '../utils/object.js';
import { BIZSIM_ENGINE_PROMPT_METHODS } from './BizSimEngine.prompt.js';
import { BIZSIM_ENGINE_METHODS } from './BizSimEngine.methods.js';
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
      const charVars = await getCharacterVariablesSafe();
      const savedData = getByPath(charVars, this.config.VAR_PATH);

      if (savedData) {
        this.data = savedData.empireData || this.getDefaultEmpireData();
        this.worldSimulation = savedData.worldSimulation || deepClone(DEFAULT_WORLD_SIMULATION);

        if (savedData.settings?.LLM) {
          this.config.LLM = { ...this.config.LLM, ...savedData.settings.LLM };
        }
        if (savedData.settings?.SIMULATION) {
          this.config.SIMULATION = { ...this.config.SIMULATION, ...savedData.settings.SIMULATION };
        }
        if (savedData.settings?.AUDIT) {
          this.config.AUDIT = { ...this.config.AUDIT, ...savedData.settings.AUDIT };
        }
        if (savedData.settings?.prompts) {
          this.promptTemplates = { ...this.promptTemplates, ...savedData.settings.prompts };
          // Backward compatibility: migrate legacy key to the new core prompt key.
          if (!this.promptTemplates.CORE_PROMPT_BLOCK && this.promptTemplates.WORLD_SIMULATION) {
            this.promptTemplates.CORE_PROMPT_BLOCK = this.promptTemplates.WORLD_SIMULATION;
          }
        }
      } else {
        this.data = this.getDefaultEmpireData();
        this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
        await this.saveData();
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
      const safeLLM = {
        ...this.config.LLM,
        apiKey: this.config.LLM.persistApiKey ? this.config.LLM.apiKey : '',
      };

      const payload = {
        [this.config.VAR_PATH]: {
          empireData: this.data,
          worldSimulation: this.worldSimulation,
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

      insertOrAssignVariablesSafe(payload);
      return true;
    } catch (error) {
      console.error('[BizSim] 保存失败:', error);
      return false;
    }
  }

  getPromptTemplate(key) {
    return this.promptTemplates?.[key] || PROMPTS[key] || '';
  }
}

Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_PROMPT_METHODS);
