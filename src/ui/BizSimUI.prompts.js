import { getChatHistorySafe } from '../utils/stCompat.js';

function buildQuickFingerprint(value) {
  if (!value || typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `arr:${value.length}`;

  const keys = Object.keys(value);
  let score = keys.length;
  for (const key of keys.slice(0, 20)) {
    const cur = value[key];
    if (Array.isArray(cur)) score += cur.length;
    else if (cur && typeof cur === 'object') score += Object.keys(cur).length;
    else if (typeof cur === 'string') score += cur.length;
    else if (typeof cur === 'number') score += cur;
  }
  return `obj:${keys.length}:${score}`;
}

function memoSerialize(ui, slot, value) {
  const cache = ui.__previewSerializeCache || (ui.__previewSerializeCache = {});
  const record = cache[slot] || {};
  const ref = value;
  const fp = buildQuickFingerprint(value);

  if (record.ref === ref && record.fp === fp && typeof record.text === 'string') {
    return record.text;
  }

  const text = JSON.stringify(value || {}, null, 2);
  cache[slot] = { ref, fp, text };
  return text;
}

async function buildLivePromptPreview(ui) {
  const historyLimit = Number(ui.engine.config.SIMULATION?.historyLimit) || 10;
  const historyText = ui.engine.formatHistoryText(getChatHistorySafe(historyLimit));
  const floorDataText = memoSerialize(ui, 'empire', ui.engine.data || {});
  const worldStateText = memoSerialize(ui, 'world', ui.engine.worldSimulation || {});
  const useHistory = !!ui.byId('sim-use-history')?.checked;
  return ui.engine.buildSimulationPrompt({ historyText, floorDataText, worldStateText, useHistory });
}

export function setPromptViewMode(ui, mode) {
  ui.promptViewMode = mode === 'lastSent' ? 'lastSent' : 'preview';
  const btn = ui.byId('btn-toggle-prompt-source');
  if (btn) {
    btn.textContent = ui.promptViewMode === 'preview' ? '查看上次真实发送' : '查看当前构建预览';
  }
}

export function togglePromptViewMode(ui) {
  setPromptViewMode(ui, ui.promptViewMode === 'preview' ? 'lastSent' : 'preview');
  return refreshPromptSnapshot(ui);
}

export async function refreshPromptSnapshot(ui) {
  if (ui.__refreshPromptInFlight) {
    return ui.__refreshPromptInFlight;
  }

  ui.__refreshPromptInFlight = (async () => {
  if (!ui.promptViewMode) ui.promptViewMode = 'preview';

  const view = ui.byId('prompt-snapshot-view');
  const meta = ui.byId('prompt-snapshot-meta');

  let content = '';
  let modeText = '';

  if (ui.promptViewMode === 'lastSent') {
    content = ui.engine.getLastPromptSnapshot?.() || ui.engine.lastPromptSnapshot || '';
    modeText = '上次真实发送';
  } else {
    try {
      content = await buildLivePromptPreview(ui);
      modeText = '当前构建预览';
    } catch (error) {
      content = '';
      modeText = `预览失败: ${error.message}`;
    }
  }

  if (view) view.value = content;

  if (meta) {
    const builtAt = ui.engine.lastPromptBuiltAt ? new Date(ui.engine.lastPromptBuiltAt) : null;
    const sentAtText = builtAt && !Number.isNaN(builtAt.getTime()) ? ` · 上次发送 ${builtAt.toLocaleString()}` : '';
    meta.textContent = content ? `${modeText} · 长度 ${content.length} 字符${sentAtText}` : `${modeText} · 暂无内容`;
  }
  })();

  try {
    return await ui.__refreshPromptInFlight;
  } finally {
    ui.__refreshPromptInFlight = null;
  }
}

export async function copyLastPromptSnapshot(ui) {
  const snapshot = ui.byId('prompt-snapshot-view')?.value || '';
  if (!snapshot) {
    if (typeof toastr !== 'undefined') toastr.warning('当前没有可复制的提示词');
    return;
  }

  try {
    await navigator.clipboard.writeText(snapshot);
    if (typeof toastr !== 'undefined') toastr.success('已复制上一次提示词');
  } catch {
    if (typeof toastr !== 'undefined') toastr.error('复制失败');
  }
}
