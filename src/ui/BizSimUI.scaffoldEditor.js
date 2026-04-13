/**
 * BizSim UI 编辑器 - Scaffold 块编辑器
 * 用于模块化提示词编辑
 */

export function renderScaffoldEditor(container, tpl, handlers = {}) {
  if (!container || !tpl || !Array.isArray(tpl.scaffold)) {
    console.warn('[renderScaffoldEditor] 输入参数不完整');
    return;
  }

  const scaffold = tpl.scaffold;
  const hasSpecial = Number.isInteger(tpl.specialIndex);

  // 构建逻辑视图
  const view = [];
  let scaffoldIdx = 0;
  for (let i = 0; i < scaffold.length + (hasSpecial ? 1 : 0); i++) {
    if (hasSpecial && i === tpl.specialIndex) {
      view.push({ kind: 'special', pos: i });
    } else {
      view.push({ kind: 'block', idx: scaffoldIdx, pos: i });
      scaffoldIdx++;
    }
  }

  // 生成 HTML
  const html = view.map((v, logicalPos) => {
    if (v.kind === 'special') {
      return `<div class="scaffold-block special-slot" data-pos="${logicalPos}">
        <div class="block-header">
          <span class="block-name">自定义插槽</span>
          <button class="btn-toggle-special" data-pos="${logicalPos}" title="移除插槽">✕</button>
        </div>
      </div>`;
    } else {
      const block = scaffold[v.idx];
      return `<div class="scaffold-block" data-block-id="${block.id}" data-idx="${v.idx}" data-pos="${logicalPos}">
        <div class="block-header">
          <span class="block-name">${block.name}</span>
          <span class="block-role">[${block.role}]</span>
          ${block.isBuiltIn ? '<span class="badge-builtin">内置</span>' : '<button class="btn-delete" title="删除块">✕</button>'}
        </div>
        <textarea class="block-content" data-idx="${v.idx}" placeholder="块内容..."></textarea>
        <div class="block-actions">
          <button class="btn-up" data-idx="${v.idx}" ${logicalPos === 0 ? 'disabled' : ''}>↑ 上移</button>
          <button class="btn-down" data-idx="${v.idx}" ${logicalPos >= view.length - 1 ? 'disabled' : ''}>↓ 下移</button>
        </div>
      </div>`;
    }
  }).join('');

  container.innerHTML = `<div class="scaffold-list">${html}</div>`;

  // 绑定事件
  bindScaffoldEditorEvents(container, tpl, handlers, view);
}

function bindScaffoldEditorEvents(container, tpl, handlers, view) {
  const scaffold = tpl.scaffold;

  // 块内容编辑
  container.querySelectorAll('.block-content').forEach((textarea) => {
    const idx = Number.parseInt(textarea.dataset.idx, 10);
    textarea.value = scaffold[idx]?.text || '';

    textarea.addEventListener('input', () => {
      const previousText = scaffold[idx]?.text || '';
      scaffold[idx].text = textarea.value;
      if (scaffold[idx]?.isBuiltIn && scaffold[idx].text !== previousText) {
        tpl.builtInSyncMode = 'customized';
      }
      if (handlers.onBlockChange) handlers.onBlockChange(idx);
    });
  });

  // 上移按钮
  container.querySelectorAll('.btn-up').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pos = Number.parseInt(btn.parentElement.parentElement.dataset.pos, 10);
      if (pos > 0 && moveBlockByLogicalStep(tpl, view, pos, -1)) {
        if (handlers.onReorder) handlers.onReorder();
        renderScaffoldEditor(container, tpl, handlers);
      }
    });
  });

  // 下移按钮
  container.querySelectorAll('.btn-down').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pos = Number.parseInt(btn.parentElement.parentElement.dataset.pos, 10);
      if (pos < view.length - 1 && moveBlockByLogicalStep(tpl, view, pos, 1)) {
        if (handlers.onReorder) handlers.onReorder();
        renderScaffoldEditor(container, tpl, handlers);
      }
    });
  });

  // 删除按钮
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number.parseInt(btn.parentElement.parentElement.dataset.idx, 10);
      scaffold.splice(idx, 1);
      if (Number.isInteger(tpl.specialIndex)) {
        tpl.specialIndex = Math.min(tpl.specialIndex, scaffold.length);
      }
      if (handlers.onDelete) handlers.onDelete(idx);
      renderScaffoldEditor(container, tpl, handlers);
    });
  });

  // 切换 specialIndex
  container.querySelectorAll('.btn-toggle-special').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (Number.isInteger(tpl.specialIndex)) {
        delete tpl.specialIndex;
      } else {
        tpl.specialIndex = Math.floor(scaffold.length / 2); // 放在中间
      }
      if (handlers.onReorder) handlers.onReorder();
      renderScaffoldEditor(container, tpl, handlers);
    });
  });
}

function swapScaffoldBlocks(scaffold, leftIdx, rightIdx) {
  if (leftIdx === rightIdx || leftIdx < 0 || rightIdx < 0) return;
  [scaffold[leftIdx], scaffold[rightIdx]] = [scaffold[rightIdx], scaffold[leftIdx]];
}

function moveBlockByLogicalStep(tpl, view, currentLogicalPos, delta) {
  const targetLogicalPos = currentLogicalPos + delta;
  if (targetLogicalPos < 0 || targetLogicalPos >= view.length) return false;

  const currentItem = view[currentLogicalPos];
  const targetItem = view[targetLogicalPos];
  if (!currentItem || currentItem.kind !== 'block') return false;

  if (targetItem && targetItem.kind === 'block') {
    swapScaffoldBlocks(tpl.scaffold, currentItem.idx, targetItem.idx);
    return true;
  }

  // 与 special 槽位交换时，只需移动 specialIndex
  if (targetItem && targetItem.kind === 'special' && Number.isInteger(tpl.specialIndex)) {
    if (delta < 0) {
      tpl.specialIndex += 1;
    } else if (delta > 0) {
      tpl.specialIndex -= 1;
    }
    return true;
  }

  return false;
}

/**
 * 渲染 insertAt 下拉列表
 * 用于用户偏好的位置选择
 */
export function renderInsertAtOptions(tpl) {
  const scaffold = tpl.scaffold || [];
  const hasSpecial = Number.isInteger(tpl.specialIndex);

  const view = [];
  let scaffoldIdx = 0;
  for (let i = 0; i < scaffold.length + (hasSpecial ? 1 : 0); i++) {
    if (hasSpecial && i === tpl.specialIndex) {
      view.push({ kind: 'special' });
    } else {
      view.push({ kind: 'block', name: scaffold[scaffoldIdx]?.name });
      scaffoldIdx++;
    }
  }

  const total = view.length;
  const options = [];

  for (let i = 0; i <= total; i++) {
    let label;
    if (i === 0) {
      label = '最前';
    } else if (i > 0 && i <= view.length) {
      const prevItem = view[i - 1];
      if (prevItem.kind === 'special') {
        label = `第${i}条后（自定义插槽）`;
      } else {
        label = `第${i}条后（${prevItem.name}）`;
      }
    } else {
      label = '最后';
    }

    options.push({ value: i, label });
  }

  return options;
}

/**
 * 添加简单的编辑器 CSS 样式
 */
export function injectEditorStyles() {
  if (document.getElementById('bizsim-scaffold-editor-styles')) return;

  const style = document.createElement('style');
  style.id = 'bizsim-scaffold-editor-styles';
  style.textContent = `
    .scaffold-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
    }

    .scaffold-block {
      background: rgba(6, 12, 22, 0.92);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 12px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      color: #e8eef8;
    }

    .scaffold-block.special-slot {
      background: rgba(93, 211, 255, 0.08);
      border-color: rgba(93, 211, 255, 0.35);
    }

    .block-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .block-name {
      font-weight: bold;
      flex: 1;
    }

    .block-role {
      font-size: 12px;
      color: #92a4c3;
    }

    .badge-builtin {
      font-size: 10px;
      background: rgba(52, 211, 153, 0.18);
      color: #8df7d2;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .block-content {
      width: 100%;
      min-height: 120px;
      padding: 8px;
      font-family: monospace;
      font-size: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(4, 10, 18, 0.9);
      color: #e8eef8;
      border-radius: 4px;
      margin-bottom: 8px;
      resize: vertical;
    }

    .block-actions {
      display: flex;
      gap: 6px;
    }

    .block-actions button {
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      background: rgba(255,255,255,0.06);
      color: #e8eef8;
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 3px;
    }

    .block-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .block-actions button:hover:not(:disabled) {
      background: rgba(93, 211, 255, 0.18);
    }

    .btn-delete {
      background: rgba(251, 113, 133, 0.16) !important;
      color: #ffd8de;
    }

    .btn-delete:hover:not(:disabled) {
      background: rgba(251, 113, 133, 0.24) !important;
    }

    .btn-toggle-special {
      background: rgba(255,255,255,0.06);
      color: #e8eef8;
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
    }

    .btn-toggle-special:hover {
      background: rgba(93, 211, 255, 0.18);
    }

    .userPref-editor,
    .presets-manager {
      padding: 12px;
      background: rgba(6, 12, 22, 0.92);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      color: #e8eef8;
      margin-top: 12px;
    }

    .module-field {
      margin-bottom: 12px;
    }

    .module-input,
    .module-select,
    .module-textarea {
      width: 100%;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(4, 10, 18, 0.9);
      color: #e8eef8;
    }

    .module-textarea {
      min-height: 110px;
      resize: vertical;
    }

    .module-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .module-btn {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      cursor: pointer;
      color: #e8eef8;
      background: rgba(255,255,255,0.06);
    }

    .module-btn-primary {
      background: linear-gradient(135deg, #6ad6ff, #4bb0ff);
      color: #04101d;
      border: none;
    }

    .module-btn-danger {
      background: rgba(251, 113, 133, 0.16);
      color: #ffd8de;
      border-color: rgba(251, 113, 133, 0.35);
    }
  `;

  document.head.appendChild(style);
}
