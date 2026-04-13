/**
 * 内置提示词块库
 * 从 defaultPrompts 直接引用，作为模块化编辑的默认数据源
 */

import {
  DEFAULT_CORE_PROMPT_MODULES,
  DEFAULT_CORE_PROMPT_BLOCK_ORDER,
  DEFAULT_CORE_PROMPT_BLOCK,
} from './defaultPrompts.js';

const MODULE_META = {
  break_prompt: {
    id: 'break_prompt',
    name: '总闸门 - 最高优先级约束层',
    description: '首段强约束，锁定仅输出合法 JSON 且禁止额外文本',
    role: 'system',
    isBuiltIn: true,
  },
  constraint_layer: {
    id: 'constraint_layer',
    name: '约束层 - 身份定义与唯一输出要求',
    description: '最高优先级约束，定义引擎身份和输出格式',
    role: 'system',
    isBuiltIn: true,
  },
  rule_layer: {
    id: 'rule_layer',
    name: '规则层 - 推演/审计/表格生命周期规则',
    description: '世界推演、事业审计和表格生命周期的核心约束',
    role: 'system',
    isBuiltIn: true,
  },
  execution_steps: {
    id: 'execution_steps',
    name: '执行步骤 - 推演前的必要准备',
    description: '确保以正确的顺序和逻辑完成推演',
    role: 'system',
    isBuiltIn: true,
  },
  input_context: {
    id: 'input_context',
    name: '输入上下文 - 数据输入源',
    description: '提供推演所需的原始数据和占位符',
    role: 'system',
    isBuiltIn: true,
  },
  output_template: {
    id: 'output_template',
    name: '输出模板 - 完整的 JSON 输出结构',
    description: '定义推演结果的标准化格式',
    role: 'system',
    isBuiltIn: true,
  },
  output_enforcer_user: {
    id: 'output_enforcer_user',
    name: '执行锚点 - User 角色收束输出',
    description: '现在开始输出 Json，必须严格遵守以上所有约束和模板',
    role: 'user',
    isBuiltIn: true,
  },
};

const strictCore = DEFAULT_CORE_PROMPT_BLOCK.trim();
const rebuiltCore = DEFAULT_CORE_PROMPT_BLOCK_ORDER
  .map((id) => DEFAULT_CORE_PROMPT_MODULES[id] || '')
  .join('\n\n')
  .trim();

const useModular = strictCore && strictCore === rebuiltCore;

export const BUILTIN_PROMPT_MODULES = useModular
  ? DEFAULT_CORE_PROMPT_BLOCK_ORDER.reduce((acc, id) => {
    acc[id] = {
      ...MODULE_META[id],
      text: DEFAULT_CORE_PROMPT_MODULES[id],
    };
    return acc;
  }, {})
  : {
    constraint_layer: {
      ...MODULE_META.constraint_layer,
      name: '约束层 - 旧版整体迁移',
      description: '默认模块校验失败时使用完整提示词兜底',
      text: DEFAULT_CORE_PROMPT_BLOCK,
    },
  };

/**
 * 从内置块库创建默认的 template structure
 * @returns {Object} 包含 scaffold 数组和 specialIndex 的模板结构
 */
export function createDefaultTemplateStructure() {
  const builtInIds = DEFAULT_CORE_PROMPT_BLOCK_ORDER.filter((id) => BUILTIN_PROMPT_MODULES[id]);
  const fallbackIds = builtInIds.length ? builtInIds : Object.keys(BUILTIN_PROMPT_MODULES);

  const scaffold = fallbackIds.map((id, index) => {
    const module = BUILTIN_PROMPT_MODULES[id];
    return {
      id,
      name: module.name,
      role: module.role,
      text: module.text,
      isBuiltIn: true,
      order: index
    };
  });

  // specialIndex 放在 input_context 块之后（位于输出模板与执行锚点之前）
  const inputContextIndex = scaffold.findIndex(b => b.id === 'input_context');

  return {
    version: '2.0',
    builtInSyncMode: 'follow-defaults',
    scaffold,
    specialIndex: inputContextIndex >= 0 ? inputContextIndex + 1 : undefined
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

function isLegacySimplifiedOutputTemplate(text) {
  if (typeof text !== 'string') return false;
  return text.includes('"集团架构表": {}')
    && text.includes('"业务板块表": []')
    && text.includes('"allTracksAdvanced": false')
    && !text.includes('"实体名称": "${顶层实体全称或势力名称}"');
}

/**
 * 修复历史版本中被简化过的内置模块文本（仅修复已知错误形态）
 */
export function upgradeLegacyBuiltInBlocks(tplRawLike) {
  if (!tplRawLike || !Array.isArray(tplRawLike.scaffold)) return tplRawLike;

  const explicitSyncMode = String(tplRawLike.builtInSyncMode || '').trim();
  const inferredFollowDefaults = tplRawLike.scaffold.every((block) => {
    if (!block || !block.isBuiltIn) return true;
    const defaultText = BUILTIN_PROMPT_MODULES[block.id]?.text;
    if (typeof defaultText !== 'string') return true;
    return block.text === defaultText;
  });
  const shouldSyncBuiltIns = explicitSyncMode === 'follow-defaults'
    || (!explicitSyncMode && inferredFollowDefaults);

  let changed = false;
  let nextScaffold = tplRawLike.scaffold.map((block) => {
    if (!block || !block.isBuiltIn) {
      return block;
    }

    const defaultText = BUILTIN_PROMPT_MODULES[block.id]?.text;

    // 同步最新默认内置块文本，确保修改 defaultPrompts 后前端能立即看到新内容
    if (shouldSyncBuiltIns && typeof defaultText === 'string' && block.text !== defaultText) {
      changed = true;
      block = {
        ...block,
        text: defaultText,
      };
    }

    if (block.id !== 'output_template') {
      return block;
    }

    if (isLegacySimplifiedOutputTemplate(block.text)) {
      changed = true;
      return {
        ...block,
        text: BUILTIN_PROMPT_MODULES.output_template?.text || block.text,
      };
    }

    return block;
  });

  const requiredBuiltInIds = DEFAULT_CORE_PROMPT_BLOCK_ORDER.filter((id) => BUILTIN_PROMPT_MODULES[id]);

  if (shouldSyncBuiltIns) {
    const firstById = new Map();
    const userBlocks = [];

    for (const block of nextScaffold) {
      if (!block || typeof block !== 'object') continue;
      if (block.isBuiltIn && typeof block.id === 'string' && !firstById.has(block.id)) {
        firstById.set(block.id, block);
      } else if (!block.isBuiltIn) {
        userBlocks.push(block);
      }
    }

    const rebuiltBuiltIns = requiredBuiltInIds.map((id) => {
      const existing = firstById.get(id);
      if (existing) {
        const latest = BUILTIN_PROMPT_MODULES[id];
        return {
          ...existing,
          name: latest?.name || existing.name,
          role: latest?.role || existing.role,
          text: latest?.text || existing.text,
          isBuiltIn: true,
        };
      }

      changed = true;
      const latest = BUILTIN_PROMPT_MODULES[id];
      return {
        id,
        name: latest?.name || id,
        role: latest?.role || 'system',
        text: latest?.text || '',
        isBuiltIn: true,
      };
    });

    const rebuilt = [...rebuiltBuiltIns, ...userBlocks].map((block, index) => ({ ...block, order: index }));
    if (rebuilt.length !== nextScaffold.length || rebuilt.some((b, idx) => b.id !== nextScaffold[idx]?.id || b.text !== nextScaffold[idx]?.text)) {
      changed = true;
      nextScaffold = rebuilt;
    }
  }

  // 历史模板可能缺少 break_prompt（旧版本只通过 COMPOSE 注入），这里补齐到首位。
  const hasBreakPrompt = nextScaffold.some((block) => block && block.isBuiltIn && block.id === 'break_prompt');
  if (!hasBreakPrompt && BUILTIN_PROMPT_MODULES.break_prompt?.text) {
    changed = true;
    nextScaffold = [
      {
        id: 'break_prompt',
        name: BUILTIN_PROMPT_MODULES.break_prompt.name,
        role: BUILTIN_PROMPT_MODULES.break_prompt.role,
        text: BUILTIN_PROMPT_MODULES.break_prompt.text,
        isBuiltIn: true,
        order: 0,
      },
      ...nextScaffold,
    ].map((block, index) => ({ ...block, order: index }));
  }

  const inputIndex = nextScaffold.findIndex((block) => block && block.id === 'input_context');
  const maxSpecial = nextScaffold.length;
  let nextSpecialIndex = Number.isInteger(tplRawLike.specialIndex) ? tplRawLike.specialIndex : undefined;
  if (nextSpecialIndex !== undefined && (nextSpecialIndex < 0 || nextSpecialIndex > maxSpecial)) {
    nextSpecialIndex = undefined;
    changed = true;
  }
  if (nextSpecialIndex === undefined && inputIndex >= 0) {
    nextSpecialIndex = Math.min(inputIndex + 1, maxSpecial);
    changed = true;
  }

  if (!changed) return tplRawLike;
  return {
    ...tplRawLike,
    builtInSyncMode: shouldSyncBuiltIns ? 'follow-defaults' : (explicitSyncMode || 'customized'),
    scaffold: nextScaffold,
    specialIndex: nextSpecialIndex,
  };
}
