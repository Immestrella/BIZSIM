/**
 * BizSim UI - 预设与用户偏好系统集成
 */

import { renderScaffoldEditor } from './BizSimUI.scaffoldEditor.js';
import { renderUserPreferencesPanel, renderPresetsPanel } from './BizSimUI.userPreferences.js';
import { compileTemplateWithUserPref } from '../core/BizSimEngine.scaffold.js';
import { createDefaultTemplateStructure } from '../config/promptModules.js';

/**
 * 渲染完整的模块化编辑界面
 */
export function renderScaffoldEditingUI(ui) {
  const container = ui.byId('scaffold-editing-section');
  if (!container) return;

  const engine = ui.engine;
  const tplRaw = engine.config.SIMULATION?.tplRaw;
  const tpl = tplRaw && Array.isArray(tplRaw.scaffold) ? tplRaw : engine.config.SIMULATION?.tpl;
  const userPref = engine.config.SIMULATION?.userPref;
  const presetManager = engine.presetManager;
  const builtInSyncMode = String(engine.config.SIMULATION?.tplRaw?.builtInSyncMode || '').trim() || 'follow-defaults';
  const syncModeLabel = builtInSyncMode === 'customized' ? '已自定义（不跟随默认）' : '跟随默认（推荐）';

  if (!tpl || !Array.isArray(tpl.scaffold)) {
    container.innerHTML = '<p style="color: #f44336;">错误：模板结构无效</p>';
    return;
  }

  container.innerHTML = `
    <div class="bizsim-helper" style="margin-bottom:10px;display:flex;gap:8px;align-items:center;justify-content:space-between;">
      <span>内置块同步模式：${syncModeLabel}</span>
      <button id="btn-reset-builtins-defaults" class="bizsim-btn bizsim-btn-secondary" type="button">恢复内置块为最新默认</button>
    </div>
    <div id="scaffold-editor-wrapper"></div>
    <div id="userPref-wrapper"></div>
    <div id="presets-wrapper"></div>
  `;

  const editorWrapper = container.querySelector('#scaffold-editor-wrapper');
  const userPrefWrapper = container.querySelector('#userPref-wrapper');
  const presetsWrapper = container.querySelector('#presets-wrapper');
  const resetBuiltinsBtn = container.querySelector('#btn-reset-builtins-defaults');

  resetBuiltinsBtn?.addEventListener('click', () => {
    engine.config.SIMULATION.tplRaw = createDefaultTemplateStructure();
    engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
      engine.config.SIMULATION.tplRaw,
      engine.config.SIMULATION.userPref
    );
    void engine.saveSettingsOnly();
    renderScaffoldEditingUI(ui);
    if (typeof toastr !== 'undefined') toastr.success('内置块已恢复为最新默认');
  });

  // 1. 渲染块编辑器
  renderScaffoldEditor(editorWrapper, tpl, {
    onBlockChange: () => {
      if (engine.config.SIMULATION.tplRaw) {
        engine.config.SIMULATION.tplRaw.scaffold = tpl.scaffold;
      }
    },
    onReorder: () => {
      if (engine.config.SIMULATION.tplRaw) {
        engine.config.SIMULATION.tplRaw.scaffold = tpl.scaffold;
        engine.config.SIMULATION.tplRaw.specialIndex = tpl.specialIndex;
      }
      engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
        engine.config.SIMULATION.tplRaw,
        engine.config.SIMULATION.userPref
      );
    },
    onDelete: () => {
      if (engine.config.SIMULATION.tplRaw) {
        engine.config.SIMULATION.tplRaw.scaffold = tpl.scaffold;
      }
      engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
        engine.config.SIMULATION.tplRaw,
        engine.config.SIMULATION.userPref
      );
    }
  });

  // 2. 渲染用户偏好编辑
  renderUserPreferencesPanel(userPrefWrapper, tpl, userPref, {
    onApply: (newPref) => {
      engine.config.SIMULATION.userPref = newPref;
      // 重新编译 tpl
      engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
        engine.config.SIMULATION.tplRaw,
        newPref
      );
      void engine.saveSettingsOnly();
      // 刷新显示
      renderScaffoldEditingUI(ui);
      if (typeof toastr !== 'undefined') toastr.success('用户偏好已应用');
    },
    onClear: () => {
      engine.config.SIMULATION.userPref = null;
      engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
        engine.config.SIMULATION.tplRaw,
        null
      );
      void engine.saveSettingsOnly();
      renderScaffoldEditingUI(ui);
      if (typeof toastr !== 'undefined') toastr.info('用户偏好已清除');
    }
  });

  // 3. 渲染预设管理
  if (presetManager) {
    renderPresetsPanel(presetsWrapper, presetManager.listPresets(), presetManager.currentPresetId, {
      onLoad: (presetId) => {
        presetManager.loadPreset(presetId);
        void engine.saveSettingsOnly();
        renderScaffoldEditingUI(ui);
        if (typeof toastr !== 'undefined') toastr.success('预设已加载');
      },
      onSaveNew: (name) => {
        presetManager.createPreset(name);
        presetManager.save();
        void engine.saveSettingsOnly();
        renderScaffoldEditingUI(ui);
        if (typeof toastr !== 'undefined') toastr.success(`预设 "${name}" 已保存`);
      },
      onDelete: (presetId) => {
        presetManager.deletePreset(presetId);
        presetManager.save();
        void engine.saveSettingsOnly();
        renderScaffoldEditingUI(ui);
        if (typeof toastr !== 'undefined') toastr.info('预设已删除');
      }
    });
  }
}

/**
 * 在编辑后保存
 */
export async function saveScaffoldChanges(ui) {
  const engine = ui.engine;
  const tplRaw = engine.config.SIMULATION?.tplRaw;

  // 1. 基础校验：模块化编辑源必须是 tplRaw
  if (!tplRaw || !Array.isArray(tplRaw.scaffold)) {
    if (typeof toastr !== 'undefined') toastr.error('模块化模板无效，保存失败');
    return false;
  }

  // 2. 重新编译可执行模板
  engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
    engine.config.SIMULATION.tplRaw,
    engine.config.SIMULATION.userPref
  );

  // 3. 保存预设列表
  if (engine.presetManager) {
    engine.presetManager.save();
  }

  // 4. 持久化到引擎
  await engine.saveSettingsOnly();

  if (typeof toastr !== 'undefined') toastr.success('所有更改已保存');
  return true;
}
