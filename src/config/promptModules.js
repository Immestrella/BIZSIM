/**
 * 内置提示词块库
 * 从 defaultPrompts 直接引用，作为模块化编辑的默认数据源
 */

import {
  DEFAULT_CORE_PROMPT_MODULES,
  DEFAULT_CORE_PROMPT_BLOCK_ORDER,
} from './defaultPrompts.js';

const MODULE_META = {
  break_prompt: {
    id: 'break_prompt',
    name: '总闸门 - 最高优先级约束层',
    description: '首段强约束，锁定仅输出合法 JSON 且禁止额外文本',
    role: 'system',
    isBuiltIn: true,
    priority: 0,
    trimmable: false,
    summarizable: false,
  },
  constraint_layer: {
    id: 'constraint_layer',
    name: '约束层 - 身份定义与唯一输出要求',
    description: '最高优先级约束，定义引擎身份和输出格式',
    role: 'system',
    isBuiltIn: true,
    priority: 0,
    trimmable: false,
    summarizable: false,
  },
  rule_layer: {
    id: 'rule_layer',
    name: '规则层 - 推演/审计/表格生命周期规则',
    description: '世界推演、事业审计和表格生命周期的核心约束',
    role: 'system',
    isBuiltIn: true,
    priority: 0,
    trimmable: false,
    summarizable: false,
  },
  execution_steps: {
    id: 'execution_steps',
    name: '执行步骤 - 推演前的必要准备',
    description: '确保以正确的顺序和逻辑完成推演',
    role: 'system',
    isBuiltIn: true,
    priority: 1,
    trimmable: false,
    summarizable: false,
  },
  history_floor_info: {
    id: 'history_floor_info',
    name: '历史楼层信息 - 聊天正文',
    description: '最近聊天正文，作为历史语境输入',
    role: 'system',
    isBuiltIn: true,
    priority: 3,
    trimmable: true,
    summarizable: true,
  },
  worldbook_context: {
    id: 'worldbook_context',
    name: '世界书模块 - 条目注入',
    description: '当前选择的世界书与条目内容',
    role: 'system',
    isBuiltIn: true,
    priority: 2,
    trimmable: true,
    summarizable: true,
  },
  historical_asset_vars: {
    id: 'historical_asset_vars',
    name: '历史资产变量模块（不含最新楼层）',
    description: '历史楼层（不含最新楼层）中的资产变量快照',
    role: 'system',
    isBuiltIn: true,
    priority: 3,
    trimmable: true,
    summarizable: true,
  },
  historical_world_vars: {
    id: 'historical_world_vars',
    name: '历史世界演化模块（不含最新楼层）',
    description: '历史楼层（不含最新楼层）中的世界推演变量快照',
    role: 'system',
    isBuiltIn: true,
    priority: 3,
    trimmable: true,
    summarizable: true,
  },
  current_asset_context: {
    id: 'current_asset_context',
    name: '当前资产模块',
    description: '当前楼层资产状态 JSON',
    role: 'system',
    isBuiltIn: true,
    priority: 1,
    trimmable: false,
    summarizable: false,
  },
  current_world_context: {
    id: 'current_world_context',
    name: '当前世界演化模块',
    description: '当前楼层世界演化 JSON',
    role: 'system',
    isBuiltIn: true,
    priority: 1,
    trimmable: false,
    summarizable: false,
  },
  output_template: {
    id: 'output_template',
    name: '输出模板 - 完整的 JSON 输出结构',
    description: '定义推演结果的标准化格式',
    role: 'system',
    isBuiltIn: true,
    priority: 0,
    trimmable: false,
    summarizable: false,
  },
  output_enforcer_user: {
    id: 'output_enforcer_user',
    name: '执行锚点 - User 角色收束输出',
    description: '现在开始输出 Json，必须严格遵守以上所有约束和模板',
    role: 'user',
    isBuiltIn: true,
    priority: 0,
    trimmable: false,
    summarizable: false,
  },
};

export const BUILTIN_PROMPT_MODULES = DEFAULT_CORE_PROMPT_BLOCK_ORDER.reduce((acc, id) => {
  acc[id] = {
    ...MODULE_META[id],
    text: DEFAULT_CORE_PROMPT_MODULES[id],
  };
  return acc;
}, {});

/**
 * 从内置块库创建默认的 template structure
 * @returns {Object} 包含 scaffold 数组和 specialIndex 的模板结构
 */
export function createDefaultTemplateStructure() {
  const scaffold = DEFAULT_CORE_PROMPT_BLOCK_ORDER.map((id, index) => {
    const module = BUILTIN_PROMPT_MODULES[id];
    return {
      id,
      name: module.name,
      role: module.role,
      text: module.text,
      isBuiltIn: true,
      order: index,
      priority: Number.isInteger(module.priority) ? module.priority : 1,
      trimmable: module.trimmable === true,
      summarizable: module.summarizable === true,
    };
  });

  return {
    version: '2.0',
    builtInSyncMode: 'follow-defaults',
    scaffold,
    specialIndex: undefined
  };
}

/**
 * 列出所有内置块的 ID
 */
export function getBuiltInBlockIds() {
  return Object.keys(BUILTIN_PROMPT_MODULES);
}

/**
 * 获取内置块的元数据（不包含 text 内容）
 */
export function getBuiltInBlockMetadata(id) {
  const module = BUILTIN_PROMPT_MODULES[id];
  if (!module) return null;
  const { text, ...metadata } = module;
  return metadata;
}

const DISALLOWED_PLACEHOLDER_PATTERN = /\{\{(HISTORY|FLOOR_DATA|WORLD_STATE|HISTORY_BLOCK|FLOOR_DATA_BLOCK|WORLD_STATE_BLOCK)\}\}/;

function isValidCurrentScaffold(scaffold) {
  if (!Array.isArray(scaffold) || scaffold.length === 0) return false;

  const builtInIdSet = new Set(
    scaffold
      .filter((block) => block && block.isBuiltIn === true)
      .map((block) => String(block.id || '').trim())
      .filter(Boolean)
  );

  const hasAllRequiredBuiltIns = DEFAULT_CORE_PROMPT_BLOCK_ORDER.every((id) => builtInIdSet.has(id));
  if (!hasAllRequiredBuiltIns) return false;

  const hasDisallowedPlaceholders = scaffold.some((block) => DISALLOWED_PLACEHOLDER_PATTERN.test(String(block?.text || '')));
  return !hasDisallowedPlaceholders;
}

export function ensureCurrentTemplateStructure(tplRawLike) {
  if (!tplRawLike || !isValidCurrentScaffold(tplRawLike.scaffold)) {
    return createDefaultTemplateStructure();
  }

  return tplRawLike;
}
