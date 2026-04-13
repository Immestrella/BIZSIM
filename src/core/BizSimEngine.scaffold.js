/**
 * BizSim 提示词 Scaffold 编译与管理
 * 核心函数：规范化、编译、验证
 */

/**
 * 规范化模板结构，补齐默认值，验证字段
 * @param {Object} tplRawLike - 可能是完整结构、旧 CORE_PROMPT_BLOCK、或部分结构
 * @returns {Object} 标准化后的 TemplateStructure
 */
export function normalizeTemplateStructure(tplRawLike) {
  if (!tplRawLike || typeof tplRawLike !== 'object') {
    return null;
  }

  const normalized = {
    version: tplRawLike.version || '2.0',
    scaffold: Array.isArray(tplRawLike.scaffold) ? tplRawLike.scaffold : [],
    specialIndex: Number.isInteger(tplRawLike.specialIndex) ? tplRawLike.specialIndex : undefined,
    specialRoleType: tplRawLike.specialRoleType || 'system'
  };

  // 验证 scaffold 数组中的每个块
  normalized.scaffold = normalized.scaffold.map((block, idx) => {
    if (!block || typeof block !== 'object') {
      console.warn(`[normalizeTemplateStructure] 块 ${idx} 无效，跳过`);
      return null;
    }

    return {
      id: block.id || `block_${idx}`,
      name: block.name || block.id || `块 ${idx}`,
      role: ['system', 'user', 'assistant'].includes(block.role) ? block.role : 'system',
      text: typeof block.text === 'string' ? block.text : '',
      isBuiltIn: block.isBuiltIn === true,
      isUserPref: block.isUserPref === true,
      order: Number.isInteger(block.order) ? block.order : idx
    };
  }).filter(b => b !== null);

  // 验证 specialIndex 是否有效
  if (Number.isInteger(normalized.specialIndex)) {
    const maxIdx = normalized.scaffold.length + 1; // +1 是因为可以插在最后
    if (normalized.specialIndex < 0 || normalized.specialIndex > maxIdx) {
      console.warn(`[normalizeTemplateStructure] specialIndex ${normalized.specialIndex} 超出范围，已调整`);
      normalized.specialIndex = Math.min(normalized.specialIndex, maxIdx);
    }
  }

  return normalized;
}

/**
 * 检测模板中是否有 specialIndex
 */
export function hasSpecialIndex(tpl) {
  return tpl && Number.isInteger(tpl.specialIndex);
}

/**
 * 验证模板的完整性和合法性
 * @param {Object} tpl - 模板结构
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateTemplateIntegrity(tpl) {
  const errors = [];

  if (!tpl || typeof tpl !== 'object') {
    errors.push('模板为null或非对象');
    return { valid: false, errors };
  }

  // 检查 scaffold 数组
  if (!Array.isArray(tpl.scaffold)) {
    errors.push('scaffold 不是数组');
    return { valid: false, errors };
  }

  if (tpl.scaffold.length === 0) {
    errors.push('scaffold 数组为空');
  }

  // 检查块的唯一性
  const blockIds = tpl.scaffold.map(b => b.id);
  const uniqueIds = new Set(blockIds);
  if (blockIds.length !== uniqueIds.size) {
    errors.push('存在重复的块 ID');
  }

  // 检查块内容
  tpl.scaffold.forEach((block, idx) => {
    if (!block.id) errors.push(`块 ${idx} 缺少 id`);
    if (typeof block.text !== 'string') errors.push(`块 ${idx} 的 text 不是字符串`);
    if (!['system', 'user', 'assistant'].includes(block.role)) {
      errors.push(`块 ${idx} 的 role 无效: ${block.role}`);
    }
  });

  // 检查 specialIndex
  if (Number.isInteger(tpl.specialIndex)) {
    const maxValid = tpl.scaffold.length;
    if (tpl.specialIndex < 0 || tpl.specialIndex > maxValid) {
      errors.push(`specialIndex ${tpl.specialIndex} 超出有效范围 [0, ${maxValid}]`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 将用户偏好编译融入原始模板
 * 这是最关键的函数，实现 insertAt 精确位置的插入
 *
 * @param {Object} tplRaw - 原始模板结构
 * @param {Object} userPref - 用户偏好对象
 * @returns {Object} 编译后的模板结构（融入了 userPref）
 */
export function compileTemplateWithUserPref(tplRaw, userPref) {
  // 规范化输入
  const tpl = normalizeTemplateStructure(tplRaw);
  if (!tpl) return null;

  const pref = normalizeUserPreference(userPref);

  // 如果偏好禁用，直接返回原始模板
  if (!pref || !pref.enabled) {
    return tpl;
  }

  // 构建用户偏好块
  const userPrefBlock = {
    id: pref.id || `pref_${Date.now()}`,
    name: '用户自定义块',
    role: pref.role,
    text: `${pref.before || '<user_preference>'}${pref.text}${pref.after || '</user_preference>'}`,
    isBuiltIn: false,
    isUserPref: true
  };

  // 计算插入位置（关键逻辑）
  const hasSpecial = Number.isInteger(tpl.specialIndex);
  const logicalTotal = tpl.scaffold.length + (hasSpecial ? 1 : 0);

  // insertAt 是逻辑坐标，需要转换为物理数组下标
  let insertAt = pref.insertAt;
  if (!Number.isInteger(insertAt)) {
    insertAt = logicalTotal; // 默认在最后
  } else {
    insertAt = Math.max(0, Math.min(insertAt, logicalTotal));
  }

  // 关键：如果存在 specialIndex，需要计算物理下标
  let scaffoldInsertIndex = insertAt;
  if (hasSpecial) {
    // 如果 insertAt 在 specialIndex 之前，直接使用；否则需要减 1（因为 special 是虚拟的）
    if (insertAt <= tpl.specialIndex) {
      scaffoldInsertIndex = insertAt;
    } else {
      scaffoldInsertIndex = insertAt - 1;
    }
  }

  // 执行 splice 操作
  const newScaffold = tpl.scaffold.slice();
  newScaffold.splice(scaffoldInsertIndex, 0, userPrefBlock);

  // 调整 specialIndex（如果用户块插在 special 前，special 需要后移）
  let newSpecialIndex = tpl.specialIndex;
  if (hasSpecial && insertAt <= tpl.specialIndex) {
    newSpecialIndex = tpl.specialIndex + 1;
  }

  return {
    ...tpl,
    scaffold: newScaffold,
    specialIndex: newSpecialIndex
  };
}

/**
 * 规范化用户偏好对象
 */
function normalizeUserPreference(prefLike) {
  if (!prefLike || typeof prefLike !== 'object') return null;

  return {
    enabled: prefLike.enabled === true,
    role: ['system', 'user', 'assistant'].includes(prefLike.role) ? prefLike.role : 'user',
    text: typeof prefLike.text === 'string' ? prefLike.text : '',
    insertAt: Number.isInteger(prefLike.insertAt) ? prefLike.insertAt : null,
    before: typeof prefLike.before === 'string' ? prefLike.before : '<user_preference>',
    after: typeof prefLike.after === 'string' ? prefLike.after : '</user_preference>',
    id: prefLike.id || null
  };
}

/**
 * 从 scaffold 和 specialIndex 构建完整的提示词文本
 * 用于 buildSimulationPrompt 中将块拼接成最终提示词
 *
 * @param {Object} tpl - 编译后的模板
 * @param {Object} dynamicContent - 动态内容 { historyText, empireText, worldText }
 * @returns {string} 拼接后的完整提示词
 */
export function buildPromptFromScaffold(tpl, dynamicContent = {}) {
  if (!tpl || !Array.isArray(tpl.scaffold)) return '';

  const scaffold = tpl.scaffold;
  const hasSpecial = Number.isInteger(tpl.specialIndex);
  const { placeholders = {} } = dynamicContent;

  const placeholderMap = { ...placeholders };

  const placeholderPattern = /\{\{[A-Z0-9_]+\}\}/;
  const hasPlaceholders = scaffold.some((block) => typeof block?.text === 'string' && placeholderPattern.test(block.text));

  const parts = [];
  let scaffoldIdx = 0;

  for (let logicalIdx = 0; logicalIdx < scaffold.length + (hasSpecial ? 1 : 0); logicalIdx++) {
    if (hasSpecial && logicalIdx === tpl.specialIndex) {
      // specialIndex 仅作为插入锚点，不再承担上下文注入逻辑。
      continue;
    } else {
      // 插入普通块
      if (scaffoldIdx < scaffold.length) {
        const block = scaffold[scaffoldIdx];
        if (block && block.text) {
          const blockText = String(block.text).replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, key) => {
            const value = placeholderMap[key];
            return value === undefined || value === null ? m : String(value);
          });
          parts.push(blockText);
        }
        scaffoldIdx++;
      }
    }
  }

  // 拼接所有部分，使用双换行符分隔
  return parts.filter(p => p && p.trim()).join('\n\n');
}

