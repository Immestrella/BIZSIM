import { buildPromptFromScaffold, compileTemplateWithUserPref } from './BizSimEngine.scaffold.js';

export const BIZSIM_ENGINE_PROMPT_METHODS = {
  buildContextBlock(title, body) {
    if (!body) return '';
    return `【${title}】\n${body}`;
  },

  async buildSimulationPrompt({ historyText = '', floorDataText = '', worldStateText = '', useHistory = true } = {}) {
    const breakPrompt = String(this.getPromptTemplate('BREAK_PROMPT') || '').trim();
    const composeTemplate = String(this.getPromptTemplate('COMPOSE_PROMPT') || '{{BREAK_PROMPT}}\n\n{{CORE_PROMPT_BLOCK}}').trim();

    const includeFloorData = this.config.SIMULATION?.includeFloorData !== false;
    const includeWorldState = this.config.SIMULATION?.includeWorldState !== false;

    const currentWorldbookContext = await this.buildWorldbookContext();
    const historicalAssetContext = includeFloorData
      ? this.buildFloorVariableContext(this.config.SIMULATION?.assetHistoryFloors || 10, '历史楼层资产变量', 'stat')
      : '';
    const historicalWorldContext = includeWorldState
      ? this.buildFloorVariableContext(this.config.SIMULATION?.worldHistoryFloors || 10, '历史楼层世界演化', 'world')
      : '';
    const historyFloorInfoBlock = useHistory && historyText
      ? this.buildContextBlock('历史楼层信息', historyText)
      : '';
    const worldbookBlock = currentWorldbookContext
      ? this.buildContextBlock('世界书模块', currentWorldbookContext)
      : '';
    const historicalAssetBlock = historicalAssetContext
      ? this.buildContextBlock('历史资产变量模块（不含最新楼层）', historicalAssetContext)
      : '';
    const historicalWorldBlock = historicalWorldContext
      ? this.buildContextBlock('历史世界演化模块（不含最新楼层）', historicalWorldContext)
      : '';

    let currentAssetText = '';
    if (includeFloorData) {
      const latestSemanticAssets = this.getCurrentFloorSemanticAssets?.();
      if (latestSemanticAssets && typeof latestSemanticAssets === 'object') {
        currentAssetText = JSON.stringify(latestSemanticAssets, null, 2);
      }
    }

    const currentAssetBlock = includeFloorData && currentAssetText
      ? this.buildContextBlock('当前资产模块', currentAssetText)
      : '';
    const currentWorldBlock = includeWorldState && worldStateText
      ? this.buildContextBlock('当前世界演化模块', worldStateText)
      : '';

    const simulationModeNote = this.getSimulationModeNote();
    const modeSection = this.buildContextBlock('推演模式说明', simulationModeNote);

    const tpl = this.config.SIMULATION?.tpl;
    if (!tpl || !Array.isArray(tpl.scaffold)) {
      throw new Error('提示词模板结构无效：缺少模块化 scaffold');
    }

    const placeholders = {
      HISTORY_FLOOR_INFO_BLOCK: historyFloorInfoBlock,
      WORLDBOOK_BLOCK: worldbookBlock,
      HISTORICAL_ASSET_VARS_BLOCK: historicalAssetBlock,
      HISTORICAL_WORLD_VARS_BLOCK: historicalWorldBlock,
      CURRENT_ASSET_BLOCK: currentAssetBlock,
      CURRENT_WORLD_BLOCK: currentWorldBlock,
    };

    const promptTokenBudget = Math.max(1, Number(this.config.SIMULATION?.promptTokenBudget) || 500000);
    const runtimeTpl = compileTemplateWithUserPref(
      this.config.SIMULATION?.tplRaw || tpl,
      this.config.SIMULATION?.userPref,
      {
        tokenBudget: promptTokenBudget,
        placeholders,
      },
    );

    const corePromptBlock = buildPromptFromScaffold(runtimeTpl, {
      historyText: [modeSection, historyFloorInfoBlock].filter(Boolean).join('\n\n'),
      floorText: currentAssetBlock,
      worldText: currentWorldBlock,
      placeholders,
    });

    const moduleMap = {
      BREAK_PROMPT: '',
      CORE_PROMPT_BLOCK: corePromptBlock,
      MODE_NOTE_BLOCK: modeSection,
      HISTORY_FLOOR_INFO_BLOCK: historyFloorInfoBlock,
      WORLDBOOK_BLOCK: worldbookBlock,
      HISTORICAL_ASSET_VARS_BLOCK: historicalAssetBlock,
      HISTORICAL_WORLD_VARS_BLOCK: historicalWorldBlock,
      CURRENT_ASSET_BLOCK: currentAssetBlock,
      CURRENT_WORLD_BLOCK: currentWorldBlock,
    };

    let composedPrompt = composeTemplate.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => moduleMap[key] || '');

    if (breakPrompt && !composedPrompt.includes(breakPrompt)) {
      composedPrompt = `${breakPrompt}\n\n${composedPrompt}`;
    }

    return composedPrompt
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, ''))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },
};
