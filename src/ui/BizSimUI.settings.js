import { BIZSIM_CONFIG } from '../config/constants.js';
import { compileTemplateWithUserPref } from '../core/BizSimEngine.scaffold.js';

export function setModelStatus(ui, message, type = 'info') {
  const statusEl = ui.byId('setting-model-status');
  if (!statusEl) return;

  const colorMap = { info: '#90caf9', success: '#81c784', warning: '#ffb74d', error: '#ef9a9a' };
  statusEl.style.color = colorMap[type] || colorMap.info;
  statusEl.textContent = message;
}

export function normalizeBaseApiUrl(url) {
  let base = String(url || '').trim().replace(/\/$/, '');
  base = base.replace(/\/chat\/completions$/i, '');
  if (!/\/v\d+$/i.test(base)) base += '/v1';
  return base;
}

export function buildModelsUrl(apiUrl) {
  return `${normalizeBaseApiUrl(apiUrl)}/models`;
}

export function parseModelListResponse(data) {
  let models = [];
  if (data && Array.isArray(data.data)) {
    models = data.data.map((item) => item?.id).filter(Boolean);
  } else if (data && Array.isArray(data.models)) {
    models = data.models.map((item) => item?.name || item?.id).filter(Boolean);
  } else if (Array.isArray(data)) {
    models = data.map((item) => (typeof item === 'string' ? item : item?.id)).filter(Boolean);
  }
  return [...new Set(models)].sort((a, b) => a.localeCompare(b));
}

export function syncModelInputToSelect(ui) {
  const input = ui.byId('setting-model');
  const select = ui.byId('setting-model-select');
  if (!input || !select) return;

  const model = input.value?.trim();
  if (!model) {
    select.value = '';
    return;
  }

  let option = Array.from(select.options).find((o) => o.value === model);
  if (!option) {
    option = ui.rootDoc.createElement('option');
    option.value = model;
    option.textContent = `${model}（自定义）`;
    select.appendChild(option);
  }
  select.value = model;
}

export async function fetchModels(ui) {
  const apiUrl = ui.byId('setting-api-url')?.value?.trim();
  const apiKey = ui.byId('setting-api-key')?.value?.trim();
  const modelSelect = ui.byId('setting-model-select');
  const btn = ui.byId('btn-fetch-models');

  if (!apiUrl) {
    setModelStatus(ui, '请先填写 API 地址', 'warning');
    if (typeof toastr !== 'undefined') toastr.warning('请先填写 API 地址');
    return;
  }
  if (!modelSelect || !btn) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '拉取中...';

  try {
    const headers = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(buildModelsUrl(apiUrl), { method: 'GET', headers });
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`HTTP ${response.status}: ${txt.slice(0, 180)}`);
    }

    const data = await response.json();
    const models = parseModelListResponse(data);
    modelSelect.innerHTML = '';

    const placeholder = ui.rootDoc.createElement('option');
    placeholder.value = '';
    placeholder.textContent = models.length ? '请选择模型' : '未获取到模型';
    placeholder.disabled = true;
    placeholder.selected = true;
    modelSelect.appendChild(placeholder);

    models.forEach((model) => {
      const option = ui.rootDoc.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });

    if (models.length) {
      setModelStatus(ui, `成功拉取 ${models.length} 个模型`, 'success');
      if (typeof toastr !== 'undefined') toastr.success(`成功拉取 ${models.length} 个模型`);
    } else {
      setModelStatus(ui, '返回成功，但模型列表为空或格式不可识别', 'warning');
    }

    syncModelInputToSelect(ui);
  } catch (error) {
    setModelStatus(ui, `拉取失败: ${error.message}`, 'error');
    if (typeof toastr !== 'undefined') toastr.error(`拉取模型失败: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText || '拉取模型';
  }
}

export function saveSimulationSettings(ui, silent = false) {
  ui.syncWorldbookSelectionsToConfig();

  const simulationMode = ui.byId('sim-mode')?.value || 'balanced';
  const useHistory = !!ui.byId('sim-use-history')?.checked;
  const autoSave = !!ui.byId('sim-auto-save')?.checked;
  const historyLimit = Number.parseInt(ui.byId('sim-history-limit')?.value, 10);
  const assetHistoryFloors = Number.parseInt(ui.byId('sim-asset-history-floors')?.value, 10);
  const worldHistoryFloors = Number.parseInt(ui.byId('sim-world-history-floors')?.value, 10);
  const includeFloorData = !!ui.byId('sim-include-floor-data')?.checked;
  const includeWorldState = !!ui.byId('sim-include-world-state')?.checked;
  const bodyInjectionEnabled = !!ui.byId('sim-body-injection-enabled')?.checked;
  const retryCount = Number.parseInt(ui.byId('sim-retry-count')?.value, 10);
  const repairOnParseError = !!ui.byId('sim-repair-on-parse')?.checked;
  const autoRunEnabled = !!ui.byId('sim-auto-run-enabled')?.checked;
  const autoRunOnlyAssistant = !!ui.byId('sim-auto-run-only-assistant')?.checked;
  const autoRunAssistantFloorInterval = Number.parseInt(ui.byId('sim-auto-run-assistant-floor-interval')?.value, 10);
  const autoRunUseHistory = !!ui.byId('sim-auto-run-use-history')?.checked;
  const autoRunMinChars = Number.parseInt(ui.byId('sim-auto-run-min-chars')?.value, 10);
  const autoRunCooldownSec = Number.parseInt(ui.byId('sim-auto-run-cooldown')?.value, 10);
  const trackPrefix = (ui.byId('sim-track-prefix')?.value || 'BG').trim() || 'BG';
  const contentExtractTags = (ui.byId("sim-content-extract-tags")?.value || "content,game").trim();
  const contentExcludeTags = (ui.byId('sim-content-exclude-tags')?.value || '').trim();
  const minTracks = Number.parseInt(ui.byId('sim-min-tracks')?.value, 10);
  const maxTracks = Number.parseInt(ui.byId('sim-max-tracks')?.value, 10);
  const cashToleranceWan = Number.parseFloat(ui.byId('sim-cash-tolerance')?.value);
  const enterpriseToleranceWan = Number.parseFloat(ui.byId('sim-enterprise-tolerance')?.value);
  const loyaltyThreshold = Number.parseInt(ui.byId('sim-loyalty-threshold')?.value, 10);
  const liquidationMin = Number.parseFloat(ui.byId('sim-liquidation-min')?.value);
  const liquidationMax = Number.parseFloat(ui.byId('sim-liquidation-max')?.value);
  const useActiveWorldbooks = !!ui.byId('sim-use-active-worldbooks')?.checked;
  const worldbookNames = (ui.byId('sim-worldbook-names')?.value || '').trim();
  const worldbookEntrySelectors = (ui.byId('sim-worldbook-entry-selectors')?.value || '').trim();
  const worldbookEntryLimit = Number.parseInt(ui.byId('sim-worldbook-entry-limit')?.value, 10);

  ui.engine.config.SIMULATION.mode = simulationMode;
  ui.engine.config.SIMULATION.useActiveWorldbooks = useActiveWorldbooks;
  ui.engine.config.SIMULATION.worldbookNames = worldbookNames;
  ui.engine.config.SIMULATION.worldbookEntrySelectors = worldbookEntrySelectors;
  if (!Number.isNaN(worldbookEntryLimit) && worldbookEntryLimit > 0) ui.engine.config.SIMULATION.worldbookEntryLimit = worldbookEntryLimit;
  ui.engine.config.SIMULATION.useHistory = useHistory;
  ui.engine.config.SIMULATION.autoSave = autoSave;
  ui.engine.config.SIMULATION.includeFloorData = includeFloorData;
  ui.engine.config.SIMULATION.includeWorldState = includeWorldState;
  ui.engine.config.SIMULATION.bodyInjectionEnabled = bodyInjectionEnabled;
  ui.engine.config.SIMULATION.repairOnParseError = repairOnParseError;
  ui.engine.config.SIMULATION.autoRunEnabled = autoRunEnabled;
  ui.engine.config.SIMULATION.autoRunOnlyAssistant = autoRunOnlyAssistant;
  if (!Number.isNaN(autoRunAssistantFloorInterval) && autoRunAssistantFloorInterval > 0) {
    ui.engine.config.SIMULATION.autoRunAssistantFloorInterval = autoRunAssistantFloorInterval;
  }
  ui.engine.config.SIMULATION.autoRunUseHistory = autoRunUseHistory;
  ui.engine.config.SIMULATION.trackPrefix = trackPrefix;
  ui.engine.config.SIMULATION.worldbookName = ui.byId('sim-worldbook-name')?.value?.trim() || '';

  if (!Number.isNaN(historyLimit) && historyLimit > 0) ui.engine.config.SIMULATION.historyLimit = historyLimit;
  if (!Number.isNaN(assetHistoryFloors) && assetHistoryFloors > 0) ui.engine.config.SIMULATION.assetHistoryFloors = assetHistoryFloors;
  if (!Number.isNaN(worldHistoryFloors) && worldHistoryFloors > 0) ui.engine.config.SIMULATION.worldHistoryFloors = worldHistoryFloors;
  if (!Number.isNaN(retryCount) && retryCount >= 0) ui.engine.config.SIMULATION.retryCount = retryCount;
  if (!Number.isNaN(autoRunMinChars) && autoRunMinChars >= 0) ui.engine.config.SIMULATION.autoRunMinChars = autoRunMinChars;
  if (!Number.isNaN(autoRunCooldownSec) && autoRunCooldownSec >= 0) ui.engine.config.SIMULATION.autoRunCooldownSec = autoRunCooldownSec;
  if (!Number.isNaN(minTracks) && minTracks > 0) ui.engine.config.SIMULATION.minTracks = minTracks;
  if (!Number.isNaN(maxTracks) && maxTracks >= ui.engine.config.SIMULATION.minTracks) ui.engine.config.SIMULATION.maxTracks = maxTracks;
  ui.engine.config.SIMULATION.contentExtractTags = contentExtractTags;
  ui.engine.config.SIMULATION.contentExcludeTags = contentExcludeTags;
  if (!Number.isNaN(cashToleranceWan) && cashToleranceWan >= 0) ui.engine.config.AUDIT.cashToleranceWan = cashToleranceWan;
  if (!Number.isNaN(enterpriseToleranceWan) && enterpriseToleranceWan >= 0) ui.engine.config.AUDIT.enterpriseToleranceWan = enterpriseToleranceWan;
  if (!Number.isNaN(loyaltyThreshold) && loyaltyThreshold >= 0) ui.engine.config.AUDIT.loyaltyThreshold = loyaltyThreshold;
  if (!Number.isNaN(liquidationMin) && liquidationMin >= 0) ui.engine.config.AUDIT.liquidationPenalty.min = liquidationMin;
  if (!Number.isNaN(liquidationMax) && liquidationMax >= 0) ui.engine.config.AUDIT.liquidationPenalty.max = liquidationMax;

  if (ui.engine.config.AUDIT.liquidationPenalty.min > ui.engine.config.AUDIT.liquidationPenalty.max) {
    const temp = ui.engine.config.AUDIT.liquidationPenalty.min;
    ui.engine.config.AUDIT.liquidationPenalty.min = ui.engine.config.AUDIT.liquidationPenalty.max;
    ui.engine.config.AUDIT.liquidationPenalty.max = temp;
  }

  ui.engine.saveData();
  ui.log('推演配置已保存');
  if (!silent && typeof toastr !== 'undefined') toastr.success('推演配置已保存');
  return useHistory;
}

export function resetSimulationSettings(ui) {
  ui.engine.config.SIMULATION = JSON.parse(JSON.stringify(BIZSIM_CONFIG.SIMULATION));
  ui.engine.config.AUDIT = JSON.parse(JSON.stringify(BIZSIM_CONFIG.AUDIT));

  if (ui.byId('sim-mode')) ui.byId('sim-mode').value = ui.engine.config.SIMULATION.mode;
  if (ui.byId('sim-use-history')) ui.byId('sim-use-history').checked = ui.engine.config.SIMULATION.useHistory !== false;
  if (ui.byId('sim-auto-save')) ui.byId('sim-auto-save').checked = ui.engine.config.SIMULATION.autoSave;
  if (ui.byId('sim-history-limit')) ui.byId('sim-history-limit').value = ui.engine.config.SIMULATION.historyLimit;
  if (ui.byId('sim-asset-history-floors')) ui.byId('sim-asset-history-floors').value = ui.engine.config.SIMULATION.assetHistoryFloors;
  if (ui.byId('sim-world-history-floors')) ui.byId('sim-world-history-floors').value = ui.engine.config.SIMULATION.worldHistoryFloors;
  if (ui.byId('sim-include-floor-data')) ui.byId('sim-include-floor-data').checked = ui.engine.config.SIMULATION.includeFloorData !== false;
  if (ui.byId('sim-include-world-state')) ui.byId('sim-include-world-state').checked = ui.engine.config.SIMULATION.includeWorldState;
  if (ui.byId('sim-body-injection-enabled')) ui.byId('sim-body-injection-enabled').checked = ui.engine.config.SIMULATION.bodyInjectionEnabled === true;
  if (ui.byId('sim-worldbook-name')) ui.byId('sim-worldbook-name').value = ui.engine.config.SIMULATION.worldbookName || '';
  if (ui.byId('sim-retry-count')) ui.byId('sim-retry-count').value = ui.engine.config.SIMULATION.retryCount;
  if (ui.byId('sim-repair-on-parse')) ui.byId('sim-repair-on-parse').checked = ui.engine.config.SIMULATION.repairOnParseError;
  if (ui.byId('sim-auto-run-enabled')) ui.byId('sim-auto-run-enabled').checked = !!ui.engine.config.SIMULATION.autoRunEnabled;
  if (ui.byId('sim-auto-run-only-assistant')) ui.byId('sim-auto-run-only-assistant').checked = ui.engine.config.SIMULATION.autoRunOnlyAssistant !== false;
  if (ui.byId('sim-auto-run-assistant-floor-interval')) ui.byId('sim-auto-run-assistant-floor-interval').value = ui.engine.config.SIMULATION.autoRunAssistantFloorInterval ?? 1;
  if (ui.byId('sim-auto-run-use-history')) ui.byId('sim-auto-run-use-history').checked = ui.engine.config.SIMULATION.autoRunUseHistory !== false;
  if (ui.byId('sim-auto-run-min-chars')) ui.byId('sim-auto-run-min-chars').value = ui.engine.config.SIMULATION.autoRunMinChars ?? 300;
  if (ui.byId('sim-auto-run-cooldown')) ui.byId('sim-auto-run-cooldown').value = ui.engine.config.SIMULATION.autoRunCooldownSec ?? 8;
  if (ui.byId("sim-content-extract-tags")) ui.byId("sim-content-extract-tags").value = ui.engine.config.SIMULATION.contentExtractTags;
  if (ui.byId('sim-content-exclude-tags')) ui.byId('sim-content-exclude-tags').value = ui.engine.config.SIMULATION.contentExcludeTags || '';
  if (ui.byId('sim-track-prefix')) ui.byId('sim-track-prefix').value = ui.engine.config.SIMULATION.trackPrefix;
  if (ui.byId('sim-min-tracks')) ui.byId('sim-min-tracks').value = ui.engine.config.SIMULATION.minTracks;
  if (ui.byId('sim-max-tracks')) ui.byId('sim-max-tracks').value = ui.engine.config.SIMULATION.maxTracks;
  if (ui.byId('sim-cash-tolerance')) ui.byId('sim-cash-tolerance').value = ui.engine.config.AUDIT.cashToleranceWan;
  if (ui.byId('sim-enterprise-tolerance')) ui.byId('sim-enterprise-tolerance').value = ui.engine.config.AUDIT.enterpriseToleranceWan;
  if (ui.byId('sim-loyalty-threshold')) ui.byId('sim-loyalty-threshold').value = ui.engine.config.AUDIT.loyaltyThreshold;
  if (ui.byId('sim-liquidation-min')) ui.byId('sim-liquidation-min').value = ui.engine.config.AUDIT.liquidationPenalty.min;
  if (ui.byId('sim-liquidation-max')) ui.byId('sim-liquidation-max').value = ui.engine.config.AUDIT.liquidationPenalty.max;
  if (ui.byId('sim-use-active-worldbooks')) ui.byId('sim-use-active-worldbooks').checked = ui.engine.config.SIMULATION.useActiveWorldbooks !== false;
  if (ui.byId('sim-worldbook-names')) ui.byId('sim-worldbook-names').value = ui.engine.config.SIMULATION.worldbookNames || '';
  if (ui.byId('sim-worldbook-entry-selectors')) ui.byId('sim-worldbook-entry-selectors').value = ui.engine.config.SIMULATION.worldbookEntrySelectors || '';
  if (ui.byId('sim-worldbook-entry-limit')) ui.byId('sim-worldbook-entry-limit').value = ui.engine.config.SIMULATION.worldbookEntryLimit;

  ui.engine.saveData();
  ui.log('推演配置已恢复默认');
  if (typeof toastr !== 'undefined') toastr.info('推演配置已恢复默认');
  ui.initWorldbookPanel();
}

export function saveSettings(ui) {
  const apiUrl = ui.byId('setting-api-url')?.value;
  const apiKey = ui.byId('setting-api-key')?.value;
  const persistApiKey = !!ui.byId('setting-persist-api-key')?.checked;
  const model = ui.byId('setting-model')?.value;
  const temperature = Number.parseFloat(ui.byId('setting-temperature')?.value);
  const maxTokens = Number.parseInt(ui.byId('setting-max-tokens')?.value, 10);
  const timeoutMs = Number.parseInt(ui.byId('setting-timeout')?.value, 10);
  const customHeaders = ui.byId('setting-custom-headers')?.value?.trim();
  const forceJsonResponse = !!ui.byId('setting-force-json')?.checked;

  if (apiUrl) ui.engine.config.LLM.apiUrl = apiUrl.trim();
  if (typeof apiKey === 'string') ui.engine.config.LLM.apiKey = apiKey;
  ui.engine.config.LLM.persistApiKey = persistApiKey;
  if (model) ui.engine.config.LLM.model = model;
  if (!Number.isNaN(temperature)) ui.engine.config.LLM.temperature = temperature;
  if (!Number.isNaN(maxTokens)) ui.engine.config.LLM.maxTokens = maxTokens;
  if (!Number.isNaN(timeoutMs)) ui.engine.config.LLM.timeoutMs = timeoutMs;

  if (customHeaders) {
    try {
      JSON.parse(customHeaders);
      ui.engine.config.LLM.customHeaders = customHeaders;
    } catch {
      if (typeof toastr !== 'undefined') toastr.error('额外请求头不是合法 JSON');
      return;
    }
  } else {
    ui.engine.config.LLM.customHeaders = '{}';
  }

  ui.engine.config.LLM.forceJsonResponse = forceJsonResponse;

  // 重新编译 tpl（融入 userPref）
  if (ui.engine.config.SIMULATION?.tplRaw) {
    ui.engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
      ui.engine.config.SIMULATION.tplRaw,
      ui.engine.config.SIMULATION.userPref
    );
  }

  ui.engine.saveData();
  ui.log('设置已保存');
  if (typeof toastr !== 'undefined') toastr.success('设置已保存');
  ui.refreshPromptSnapshot();
}
