import { buildPromptFromScaffold } from './BizSimEngine.scaffold.js';

export const BIZSIM_ENGINE_PROMPT_METHODS = {
  buildContextBlock(title, body) {
    if (!body) return '';
    return `【${title}】\n${body}`;
  },

  async buildSimulationPrompt({ historyText = '', empireDataText = '', worldStateText = '', useHistory = true } = {}) {
    const breakPrompt = String(this.getPromptTemplate('BREAK_PROMPT') || '').trim();
    const composeTemplate = String(this.getPromptTemplate('COMPOSE_PROMPT') || '{{BREAK_PROMPT}\n\n{{CORE_PROMPT_BLOCK}}').trim();

    const includeEmpireData = this.config.SIMULATION?.includeEmpireData !== false;
    const includeWorldState = this.config.SIMULATION?.includeWorldState !== false;

    const currentWorldbookContext = await this.buildWorldbookContext();
    const historicalStatContext = includeEmpireData
      ? this.buildFloorVariableContext(this.config.SIMULATION?.assetHistoryFloors || 10, '历史楼层资产统计', 'stat')
      : '';
    const historicalWorldContext = includeWorldState
      ? this.buildFloorVariableContext(this.config.SIMULATION?.worldHistoryFloors || 10, '历史楼层世界推演', 'world')
      : '';
    const currentFloorStatJson = includeEmpireData ? this.buildCurrentFloorAssetStatJson() : '';
    const currentFloorWorldJson = includeWorldState ? this.buildCurrentFloorWorldSimulationJson() : '';

    const historyBlocks = [];
    if (useHistory && historyText) historyBlocks.push(this.buildContextBlock('最近聊天正文', historyText));
    if (currentWorldbookContext) historyBlocks.push(this.buildContextBlock('世界书条目', currentWorldbookContext));
    if (historicalStatContext) historyBlocks.push(this.buildContextBlock('历史楼层资产统计', historicalStatContext));
    if (historicalWorldContext) historyBlocks.push(this.buildContextBlock('历史楼层世界推演', historicalWorldContext));
    if (currentFloorStatJson) historyBlocks.push(this.buildContextBlock('当前楼层资产统计', currentFloorStatJson));
    if (currentFloorWorldJson) historyBlocks.push(this.buildContextBlock('当前楼层世界推演', currentFloorWorldJson));

    const empireBlocks = [];
    if (includeEmpireData && currentFloorStatJson) empireBlocks.push(this.buildContextBlock('当前楼层资产统计', currentFloorStatJson));
    if (includeEmpireData && empireDataText) empireBlocks.push(this.buildContextBlock('当前资产状态', empireDataText));

    const worldBlocks = [];
    if (includeWorldState && currentFloorWorldJson) worldBlocks.push(this.buildContextBlock('当前楼层世界推演', currentFloorWorldJson));
    if (includeWorldState && worldStateText) worldBlocks.push(this.buildContextBlock('当前世界推演状态', worldStateText));

    const historySection = historyBlocks.filter(Boolean).join('\n\n');
    const empireSection = empireBlocks.filter(Boolean).join('\n\n');
    const worldSection = worldBlocks.filter(Boolean).join('\n\n');

    const simulationModeNote = this.getSimulationModeNote();
    const modeSection = this.buildContextBlock('推演模式说明', simulationModeNote);

    // 使用新的 scaffold 模型构建核心提示词块
    const tpl = this.config.SIMULATION?.tpl;
    let corePromptBlock;
    const usingModularScaffold = !!(tpl && Array.isArray(tpl.scaffold));

    if (usingModularScaffold) {
      // 新的 scaffold 模型
      corePromptBlock = buildPromptFromScaffold(tpl, {
        historyText: [modeSection, historySection].filter(Boolean).join('\n\n'),
        empireText: empireSection,
        worldText: worldSection,
      });
    } else {
      // 回退到旧的字符串替换方式（向后兼容）
      const corePromptRaw = String(this.getPromptTemplate('CORE_PROMPT_BLOCK') || '').trim();
      corePromptBlock = corePromptRaw
        .replace('{{HISTORY}}', [modeSection, historySection].filter(Boolean).join('\n\n'))
        .replace('{{EMPIRE_DATA}}', empireSection)
        .replace('{{WORLD_STATE}}', worldSection);
    }

    const coreAlreadyContainsBreak = !!(breakPrompt && corePromptBlock && corePromptBlock.includes(breakPrompt));
    const effectiveBreakPrompt = usingModularScaffold ? '' : (coreAlreadyContainsBreak ? '' : breakPrompt);

    const moduleMap = {
      BREAK_PROMPT: effectiveBreakPrompt,
      CORE_PROMPT_BLOCK: corePromptBlock,
      MODE_NOTE_BLOCK: modeSection,
      HISTORY_BLOCK: historySection,
      WORLDBOOK_BLOCK: this.buildContextBlock('世界书条目', currentWorldbookContext),
      FLOOR_STAT_HISTORY_BLOCK: this.buildContextBlock('历史楼层资产统计', historicalStatContext),
      FLOOR_WORLD_HISTORY_BLOCK: this.buildContextBlock('历史楼层世界推演', historicalWorldContext),
      CURRENT_FLOOR_STAT_BLOCK: this.buildContextBlock('当前楼层资产统计', currentFloorStatJson),
      CURRENT_FLOOR_WORLD_BLOCK: this.buildContextBlock('当前楼层世界推演', currentFloorWorldJson),
      EMPIRE_DATA_BLOCK: empireSection,
      WORLD_STATE_BLOCK: worldSection,
    };

    let composedPrompt = composeTemplate.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => moduleMap[key] || '');

    // 强制兜底：无论用户如何自定义 COMPOSE_PROMPT，最终发送内容必须包含最高优先级 BREAK_PROMPT。
    if (!usingModularScaffold && breakPrompt && !composedPrompt.includes(breakPrompt)) {
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
