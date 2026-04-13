/**
 * BizSim UI - 用户偏好编辑
 */

import { renderInsertAtOptions } from './BizSimUI.scaffoldEditor.js';
import { escapeHtml } from '../utils/object.js';

export function renderUserPreferencesPanel(container, tpl, userPref, handlers = {}) {
  if (!container) return;

  const enabled = userPref?.enabled === true;
  const role = userPref?.role || 'user';
  const text = userPref?.text || '';
  const insertAt = userPref?.insertAt ?? null;

  const insertOptions = renderInsertAtOptions(tpl);
  const safeText = escapeHtml(text);
  const optionsHtml = insertOptions
    .map((opt) => `<option value="${opt.value}" ${insertAt === opt.value ? 'selected' : ''}>${opt.label}</option>`)
    .join('');

  container.innerHTML = `
      <div class="userPref-editor">
      <h4>用户偏好块</h4>
      
      <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <input type="checkbox" id="userPref-enabled" ${enabled ? 'checked' : ''}>
        <span>启用自定义块</span>
      </label>

      <div style="margin-bottom: 12px;">
        <label>角色：
            <select id="userPref-role" class="module-select">
            <option value="system" ${role === 'system' ? 'selected' : ''}>system</option>
            <option value="user" ${role === 'user' ? 'selected' : ''}>user</option>
            <option value="assistant" ${role === 'assistant' ? 'selected' : ''}>assistant</option>
          </select>
        </label>
      </div>

      <div style="margin-bottom: 12px;">
        <label>插入位置：
            <select id="userPref-insertAt" class="module-select">
            ${optionsHtml}
          </select>
        </label>
      </div>

      <div style="margin-bottom: 12px;">
        <label>块内容：</label>
          <textarea id="userPref-text" class="module-textarea">${safeText}</textarea>
      </div>

        <div class="module-actions">
          <button id="btn-apply-userPref" class="module-btn module-btn-primary">应用</button>
          <button id="btn-clear-userPref" class="module-btn">清除</button>
      </div>
    </div>
  `;

  // 事件绑定
  const enabledCb = container.querySelector('#userPref-enabled');
  const roleSelect = container.querySelector('#userPref-role');
  const insertSelect = container.querySelector('#userPref-insertAt');
  const textArea = container.querySelector('#userPref-text');
  const applyBtn = container.querySelector('#btn-apply-userPref');
  const clearBtn = container.querySelector('#btn-clear-userPref');

  applyBtn?.addEventListener('click', () => {
    const newPref = {
      enabled: enabledCb?.checked || false,
      role: roleSelect?.value || 'user',
      text: textArea?.value || '',
      insertAt: Number.parseInt(insertSelect?.value) || 0
    };
    if (handlers.onApply) handlers.onApply(newPref);
  });

  clearBtn?.addEventListener('click', () => {
    if (handlers.onClear) handlers.onClear();
  });
}

/**
 * 预设管理面板
 */
export function renderPresetsPanel(container, presets, currentPresetId, handlers = {}) {
  if (!container) return;

  const presetOptions = (presets || [])
    .map((p) => `<option value="${p.id}" ${currentPresetId === p.id ? 'selected' : ''}>${p.name}</option>`)
    .join('');

  container.innerHTML = `
      <div class="presets-manager">
      <h4>预设管理</h4>
      
      <div style="margin-bottom: 12px;">
        <label>选择预设：
            <select id="preset-select" class="module-select">
            <option value="">-- 无（当前配置）--</option>
            ${presetOptions}
          </select>
        </label>
      </div>

        <div class="module-actions">
          <button id="btn-preset-save-new" class="module-btn module-btn-primary">保存为新预设</button>
          <button id="btn-preset-delete" class="module-btn module-btn-danger">删除预设</button>
      </div>
    </div>
  `;

  const select = container.querySelector('#preset-select');
  const saveBtn = container.querySelector('#btn-preset-save-new');
  const deleteBtn = container.querySelector('#btn-preset-delete');

  select?.addEventListener('change', () => {
    const presetId = select.value;
    if (presetId && handlers.onLoad) handlers.onLoad(presetId);
  });

  saveBtn?.addEventListener('click', () => {
    const name = prompt('输入预设名称：', '我的预设');
    if (name && handlers.onSaveNew) handlers.onSaveNew(name);
  });

  deleteBtn?.addEventListener('click', () => {
    const presetId = select?.value;
    if (presetId) {
      if (confirm('确定删除此预设？') && handlers.onDelete) {
        handlers.onDelete(presetId);
      }
    }
  });
}
