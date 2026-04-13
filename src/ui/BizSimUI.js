import { createMainPanelHtml } from './templates.js';
import { getSafeDocument, getSillyTavernGlobal } from '../utils/stCompat.js';
import {
  initWorldbookPanel,
  refreshWorldbookBindingHint,
  loadWorldbookEntries,
  renderWorldbookEntries,
  setWorldbookSelections,
  syncWorldbookSelectionsToConfig,
} from './BizSimUI.worldbook.js';
import {
  refreshPromptSnapshot,
  copyLastPromptSnapshot,
  togglePromptViewMode,
  setPromptViewMode,
} from './BizSimUI.prompts.js';
import {
  refreshDashboard,
  refreshEmpire,
  showSheet,
  setModelStatus,
  syncModelInputToSelect,
  fetchModels,
  saveSimulationSettings,
  resetSimulationSettings,
  saveSettings,
  refreshTracks,
  showAddTrackForm,
  runSimulation,
  resetAllData,
  quickAudit,
  exportReport,
  log,
} from './BizSimUI.actions.js';
import { injectEditorStyles } from './BizSimUI.scaffoldEditor.js';
import { renderScaffoldEditingUI, saveScaffoldChanges } from './BizSimUI.integration.js';

export class BizSimUI {
  constructor(engine) {
    this.engine = engine;
    this.panel = null;
    this.isOpen = false;
    this.rootDoc = getSafeDocument();
    this.currentEmpireSheet = 'sheet_assetOVW0';
    this.currentWorldbookName = '';
    this.currentWorldbookEntries = [];
    this.promptViewMode = 'preview';
    this.isSimulating = false;
  }

  initWorldbookPanel() {
    return initWorldbookPanel(this);
  }

  refreshWorldbookBindingHint() {
    return refreshWorldbookBindingHint(this);
  }

  loadWorldbookEntries(worldbookName) {
    return loadWorldbookEntries(this, worldbookName);
  }

  renderWorldbookEntries(entries) {
    return renderWorldbookEntries(this, entries);
  }

  setWorldbookSelections(checked) {
    return setWorldbookSelections(this, checked);
  }

  syncWorldbookSelectionsToConfig() {
    return syncWorldbookSelectionsToConfig(this);
  }

  refreshPromptSnapshot() {
    return refreshPromptSnapshot(this);
  }

  copyLastPromptSnapshot() {
    return copyLastPromptSnapshot(this);
  }

  togglePromptViewMode() {
    return togglePromptViewMode(this);
  }

  setPromptViewMode(mode) {
    return setPromptViewMode(this, mode);
  }

  refreshDashboard() {
    return refreshDashboard(this);
  }

  refreshEmpire() {
    return refreshEmpire(this);
  }

  showSheet(sheetName, silent = false) {
    return showSheet(this, sheetName, silent);
  }

  setModelStatus(message, type = 'info') {
    return setModelStatus(this, message, type);
  }

  syncModelInputToSelect() {
    return syncModelInputToSelect(this);
  }

  fetchModels() {
    return fetchModels(this);
  }

  saveSimulationSettings(silent = false) {
    return saveSimulationSettings(this, silent);
  }

  resetSimulationSettings() {
    return resetSimulationSettings(this);
  }

  saveSettings() {
    return saveSettings(this);
  }

  refreshTracks() {
    return refreshTracks(this);
  }

  showAddTrackForm() {
    return showAddTrackForm(this);
  }

  runSimulation() {
    return runSimulation(this);
  }

  resetAllData() {
    return resetAllData(this);
  }

  quickAudit() {
    return quickAudit(this);
  }

  exportReport() {
    return exportReport(this);
  }

  log(message) {
    return log(this, message);
  }

  getScopeElement() {
    return this.panel?.dlg || this.rootDoc;
  }

  $(selector) {
    return this.getScopeElement().querySelector(selector);
  }

  $$(selector) {
    return Array.from(this.getScopeElement().querySelectorAll(selector));
  }

  byId(id) {
    return this.getScopeElement().querySelector(`#${id}`);
  }

  setSimulationBusy(busy, source = '') {
    this.isSimulating = !!busy;
    const targets = [this.byId('btn-global-simulation'), this.byId('btn-start-simulation')].filter(Boolean);

    for (const button of targets) {
      button.disabled = this.isSimulating;
      button.classList.toggle('is-loading', this.isSimulating);

      if (button.id === 'btn-global-simulation') {
        button.textContent = this.isSimulating ? `推演中${source ? ` · ${source}` : ''}` : '一键推演';
      } else {
        button.textContent = this.isSimulating ? `推演中${source ? ` · ${source}` : ''}` : '开始推演';
      }
    }
  }

  async initializePanelWhenReady() {
    let ready = false;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (!this.isOpen) return;
      if (this.byId('btn-global-simulation') && this.byId('tab-dashboard')) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!ready) {
      this.log('面板初始化失败：未找到核心按钮，事件绑定已跳过');
      return;
    }

    this.attachEventListeners();
    this.setPromptViewMode('preview');
    this.refreshDashboard();
    this.refreshEmpire();
    this.refreshTracks();
    this.refreshPromptSnapshot();
    this.initWorldbookPanel();
    injectEditorStyles();
    renderScaffoldEditingUI(this);
  }

  open() {
    if (this.isOpen) return;

    // 重新从变量系统加载数据，确保与最新状态同步
    void this.engine.reloadFromVariables();

    const html = createMainPanelHtml(this.engine);
    const ST = getSillyTavernGlobal();
    const Popup = ST?.Popup;

    if (!Popup || !ST?.POPUP_TYPE) {
      this.openFallback(html);
      return;
    }

    const popup = new Popup(html, ST.POPUP_TYPE.DISPLAY, '', {
      large: true,
      wide: true,
      okButton: '关闭',
      onClose: () => {
        this.isOpen = false;
        this.panel = null;
      },
    });

    this.panel = popup;
    this.isOpen = true;
    popup.show();

    void this.initializePanelWhenReady();
  }

  openFallback(html) {
    const modal = this.rootDoc.createElement('div');
    modal.id = 'bizsim-fallback-modal';
    modal.innerHTML = html;
    modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:900px;max-height:90vh;background:#1a1a2e;border-radius:8px;z-index:99999;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,0.8);';

    const overlay = this.rootDoc.createElement('div');
    overlay.id = 'bizsim-fallback-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99998;';
    overlay.addEventListener('click', () => this.closeFallback());

    this.rootDoc.body.appendChild(overlay);
    this.rootDoc.body.appendChild(modal);
    this.panel = { dlg: modal };
    this.isOpen = true;

    void this.initializePanelWhenReady();

    if (typeof toastr !== 'undefined') {
      toastr.info('使用原生弹窗模式');
    }
  }

  closeFallback() {
    this.rootDoc.getElementById('bizsim-fallback-modal')?.remove();
    this.rootDoc.getElementById('bizsim-fallback-overlay')?.remove();
    this.isOpen = false;
    this.panel = null;
  }

  attachEventListeners() {
    this.$$('.bizsim-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.currentTarget.dataset.tab);
      });
    });

    this.$$('[data-sheet]').forEach((button) => {
      button.addEventListener('click', (e) => {
        this.showSheet(e.currentTarget.dataset.sheet);
      });
    });

    this.byId('btn-global-simulation')?.addEventListener('click', async () => {
      await this.runSimulation();
    });

    this.byId('btn-global-audit')?.addEventListener('click', async () => {
      await this.quickAudit();
    });

    this.byId('btn-global-export')?.addEventListener('click', () => {
      this.exportReport();
    });

    this.byId('btn-open-simulation-tab')?.addEventListener('click', () => {
      this.switchTab('simulation');
    });

    this.byId('btn-refresh-dashboard')?.addEventListener('click', () => {
      this.refreshDashboard();
      this.refreshEmpire();
      this.refreshTracks();
      void this.refreshPromptSnapshot();
    });

    this.byId('btn-start-simulation')?.addEventListener('click', async () => {
      await this.runSimulation();
    });

    this.byId('btn-save-sim-settings')?.addEventListener('click', () => {
      this.saveSimulationSettings();
    });

    this.byId('btn-reset-sim-settings')?.addEventListener('click', () => {
      this.resetSimulationSettings();
    });

    this.byId('btn-add-track')?.addEventListener('click', () => {
      this.showAddTrackForm();
    });

    this.byId('btn-refresh-tracks')?.addEventListener('click', () => {
      this.refreshTracks();
    });

    this.byId('btn-save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    this.byId('btn-save-scaffold-module')?.addEventListener('click', async () => {
      await saveScaffoldChanges(this);
      this.setPromptViewMode('preview');
      void this.refreshPromptSnapshot();
    });

    this.byId('btn-refresh-scaffold-module')?.addEventListener('click', () => {
      renderScaffoldEditingUI(this);
    });

    this.byId('btn-fetch-models')?.addEventListener('click', async () => {
      await this.fetchModels();
    });

    this.byId('setting-model-select')?.addEventListener('change', (e) => {
      const selected = e.target?.value;
      if (!selected) return;
      const modelInput = this.byId('setting-model');
      if (modelInput) modelInput.value = selected;
      this.setModelStatus(`已选择模型: ${selected}`, 'info');
    });

    this.byId('setting-model')?.addEventListener('input', () => {
      this.syncModelInputToSelect();
    });

    this.byId('btn-refresh-last-prompt')?.addEventListener('click', () => {
      void this.refreshPromptSnapshot();
    });

    this.byId('btn-toggle-prompt-source')?.addEventListener('click', () => {
      void this.togglePromptViewMode();
    });

    this.byId('btn-copy-last-prompt')?.addEventListener('click', async () => {
      await this.copyLastPromptSnapshot();
    });

    this.byId('sim-worldbook-name')?.addEventListener('change', async (e) => {
      this.currentWorldbookName = e.currentTarget.value || '';
      await this.loadWorldbookEntries(this.currentWorldbookName);
      this.refreshWorldbookBindingHint();
    });

    this.byId('btn-worldbook-refresh')?.addEventListener('click', async () => {
      await this.loadWorldbookEntries(this.byId('sim-worldbook-name')?.value || '');
      this.refreshWorldbookBindingHint();
    });

    this.byId('btn-worldbook-select-all')?.addEventListener('click', () => {
      this.setWorldbookSelections(true);
    });

    this.byId('btn-worldbook-select-none')?.addEventListener('click', () => {
      this.setWorldbookSelections(false);
    });

    this.byId('worldbook-entry-search')?.addEventListener('input', () => {
      this.renderWorldbookEntries(this.currentWorldbookEntries || []);
    });

    this.syncModelInputToSelect();
  }

  switchTab(tabName) {
    this.$$('.bizsim-tab').forEach((t) => t.classList.remove('active'));
    this.$$('.bizsim-section').forEach((s) => s.classList.remove('active'));

    this.$(`.bizsim-tab[data-tab="${tabName}"]`)?.classList.add('active');
    this.byId(`tab-${tabName}`)?.classList.add('active');

    if (tabName === 'dashboard') {
      this.refreshDashboard();
      this.refreshEmpire();
      this.refreshTracks();
    }
    if (tabName === 'simulation') this.refreshWorldbookBindingHint();
    if (tabName === 'prompts') {
      this.setPromptViewMode('preview');
      void this.refreshPromptSnapshot();
      renderScaffoldEditingUI(this);
    }
  }

}
