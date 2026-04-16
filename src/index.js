import { BizSimEngine } from './core/BizSimEngine.js';
import { BizSimUI } from './ui/BizSimUI.js';
import { eventOnSafe, getButtonEventSafe } from './utils/stCompat.js';

let engine = null;
let ui = null;
let autoSimInFlight = false;
let lastAutoSimAt = 0;
let assistantMessageCount = 0;
let manualSimInFlight = false;
const MVU_FALLBACK_WAIT_MS = 3 * 60 * 1000;
const MVU_DETECTED_WAIT_MAX_MS = 10 * 60 * 1000;
const POST_RENDER_INJECTION_WAIT_MS = 30 * 1000;
const AUTO_SIM_RENDER_WAIT_MAX_MS = 10 * 60 * 1000;
const pendingPostRenderInjections = new Set();
const simulationStateListeners = new Set();
const simulationState = { isSimulating: false, source: '' };

function emitSimulationState() {
  const snapshot = { isSimulating: simulationState.isSimulating, source: simulationState.source };

  try {
    if (ui?.setSimulationBusy) {
      ui.setSimulationBusy(snapshot.isSimulating, snapshot.source, false);
    }
  } catch {
  }

  try {
    if (window.parent && window.parent !== window) {
      window.parent.BizSimState = snapshot;
    }
  } catch {
  }

  try {
    if (window.top && window.top !== window) {
      window.top.BizSimState = snapshot;
    }
  } catch {
  }

  for (const listener of simulationStateListeners) {
    try {
      listener(snapshot);
    } catch {
    }
  }
}

function setSimulationState(isSimulating, source = '') {
  simulationState.isSimulating = !!isSimulating;
  simulationState.source = simulationState.isSimulating ? String(source || simulationState.source || '') : '';
  emitSimulationState();
}

function getMessageFromEvent(messageId) {
  try {
    if (typeof getChatMessages !== 'function' || messageId === null || messageId === undefined) return null;
    const messages = getChatMessages(messageId);
    if (Array.isArray(messages) && messages.length > 0) return messages[0];
  } catch {
  }
  return null;
}

function getMessageText(message) {
  if (!message || typeof message !== 'object') return '';
  return String(message.mes || message.message || message.content || '').trim();
}

function hasBizSimInjectionBlock(message) {
  const text = getMessageText(message);
  return /<bz_world_state\b[^>]*>/i.test(text) || /<bz_asset_sheet\b[^>]*>/i.test(text);
}

function isUserMessage(message) {
  if (!message || typeof message !== 'object') return false;
  return message.is_user === true
    || message.from_user === true
    || message.isUser === true
    || String(message.role || '').toLowerCase() === 'user';
}

function isAssistantMessage(message) {
  if (!message || typeof message !== 'object') return false;
  const role = String(message.role || '').toLowerCase();
  if (role === 'assistant') return true;
  if (role === 'system') return false;
  return !isUserMessage(message);
}

function shouldRunAutoSimulation(cfg, message) {
  if (!cfg?.autoRunEnabled) return false;
  if (cfg.autoRunOnlyAssistant !== false && isUserMessage(message)) return false;

  const text = getMessageText(message);
  const minChars = Math.max(0, Number(cfg.autoRunMinChars) || 0);
  if (text.length < minChars) return false;

  const cooldownMs = Math.max(0, Number(cfg.autoRunCooldownSec) || 0) * 1000;
  if (cooldownMs > 0 && Date.now() - lastAutoSimAt < cooldownMs) return false;

  return true;
}

function getMvuVariableUpdateEndedEventName() {
  try {
    if (window?.Mvu?.events?.VARIABLE_UPDATE_ENDED) return window.Mvu.events.VARIABLE_UPDATE_ENDED;
  } catch {
  }
  try {
    if (typeof Mvu !== 'undefined' && Mvu?.events?.VARIABLE_UPDATE_ENDED) return Mvu.events.VARIABLE_UPDATE_ENDED;
  } catch {
  }
  return '';
}

async function waitForMvuVariableUpdateEnded(timeoutMs = 8000) {
  const eventName = getMvuVariableUpdateEndedEventName();
  if (!eventName) return false;

  return new Promise((resolve) => {
    let finished = false;
    let stopListener = null;

    const finish = (ok) => {
      if (finished) return;
      finished = true;
      if (typeof stopListener === 'function') {
        try { stopListener(); } catch {
        }
      }
      resolve(ok);
    };

    const onEnded = () => finish(true);

    try {
      if (typeof eventOnce === 'function') {
        const handle = eventOnce(eventName, onEnded);
        if (handle && typeof handle.stop === 'function') stopListener = handle.stop;
      } else if (typeof eventOn === 'function') {
        const handle = eventOn(eventName, onEnded);
        if (handle && typeof handle.stop === 'function') stopListener = handle.stop;
      } else {
        finish(false);
        return;
      }
    } catch {
      finish(false);
      return;
    }

    const normalizedTimeout = Number(timeoutMs);
    if (Number.isFinite(normalizedTimeout) && normalizedTimeout > 0) {
      setTimeout(() => finish(false), normalizedTimeout);
    }
  });
}

async function hasCharacterMvuSystem() {
  const eventName = getMvuVariableUpdateEndedEventName();
  if (!eventName) return false;

  try {
    if (typeof waitGlobalInitialized === 'function') {
      await Promise.race([
        waitGlobalInitialized('Mvu'),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
  } catch {
  }

  try {
    const mvuApi = window?.Mvu || (typeof Mvu !== 'undefined' ? Mvu : null);
    if (!mvuApi || typeof mvuApi.getMvuData !== 'function') return true;
    const characterData = mvuApi.getMvuData({ type: 'character' });
    if (!characterData || typeof characterData !== 'object') return false;
    if (characterData.stat_data && typeof characterData.stat_data === 'object') return true;
    if (characterData.initialized_lorebooks && typeof characterData.initialized_lorebooks === 'object') return true;
    return true;
  } catch {
    // 能拿到 eventName 说明 MVU 基本已挂载，读取失败时仍按有 MVU 处理，避免提前 fallback。
    return true;
  }
}

async function maybeAutoSimulate(messageId) {
  if (autoSimInFlight) {
    console.debug('[BizSim][AutoSim] skip: autoSimInFlight=true');
    return false;
  }

  const ctx = await initBizSim();
  const cfg = ctx.engine?.config?.SIMULATION || {};
  let message = getMessageFromEvent(messageId);
  if (!message) {
    // MESSAGE_RECEIVED 可能早于楼层对象可读，短暂重试一次。
    await new Promise((resolve) => setTimeout(resolve, 4000));
    message = getMessageFromEvent(messageId);
  }

  if (!message) {
    console.debug(`[BizSim][AutoSim] skip: message-not-found, messageId=${messageId}`);
    return false;
  }

  if (hasBizSimInjectionBlock(message)) {
    console.debug(`[BizSim][AutoSim] skip: message-has-bizsim-block, messageId=${messageId}`);
    return false;
  }

  const assistantOnly = cfg.autoRunOnlyAssistant !== false;
  const assistantInterval = Math.max(1, Number(cfg.autoRunAssistantFloorInterval) || 1);
  const isAssistant = isAssistantMessage(message);
  const textLength = getMessageText(message).length;

  if (assistantOnly && !isAssistant) {
    console.debug(`[BizSim][AutoSim] skip: not-assistant, messageId=${messageId}`);
    return false;
  }

  if (isAssistant) {
    assistantMessageCount += 1;
    if (assistantMessageCount % assistantInterval !== 0) {
      console.debug(`[BizSim][AutoSim] skip: assistant-interval, count=${assistantMessageCount}, interval=${assistantInterval}`);
      return false;
    }
  }

  if (!shouldRunAutoSimulation(cfg, message)) {
    const minChars = Math.max(0, Number(cfg.autoRunMinChars) || 0);
    const cooldownMs = Math.max(0, Number(cfg.autoRunCooldownSec) || 0) * 1000;
    const cooldownRemain = Math.max(0, cooldownMs - (Date.now() - lastAutoSimAt));
    console.debug(`[BizSim][AutoSim] skip: gate-failed enabled=${!!cfg.autoRunEnabled} textLength=${textLength} minChars=${minChars} cooldownRemainMs=${cooldownRemain}`);
    return false;
  }

  autoSimInFlight = true;
  lastAutoSimAt = Date.now();

  try {
    const useHistory = cfg.autoRunUseHistory !== false;
    setSimulationState(true, '自动推演');
    const result = await ctx.engine.runSimulation(useHistory);
    if (result?.success) {
      const floorMessageId = Number(result?.data?.floorSync?.messageId);
      if (Number.isInteger(floorMessageId)) {
        void schedulePostRenderBodyInjection(floorMessageId, 'auto-simulation');
      }
      const activeTracks = result.data?.worldSimulation?.tracks?.filter((t) => t.status === '推演中').length || 0;
      console.log(`[BizSim] 自动推演完成，活跃视角 ${activeTracks}`);
    } else {
      console.warn('[BizSim] 自动推演失败:', result?.error || '未知错误');
    }
    return true;
  } catch (error) {
    console.error('[BizSim] 自动推演异常:', error);
    return true;
  } finally {
    setSimulationState(false);
    autoSimInFlight = false;
  }
}

async function waitForMessageRenderCompleted(messageId, timeoutMs = POST_RENDER_INJECTION_WAIT_MS) {
  const targetId = Number(messageId);
  if (!Number.isInteger(targetId)) return false;

  return new Promise((resolve) => {
    let finished = false;
    let stopCharacterRendered = null;
    let stopMessageUpdated = null;

    const finish = (ok) => {
      if (finished) return;
      finished = true;
      try { if (typeof stopCharacterRendered === 'function') stopCharacterRendered(); } catch {
      }
      try { if (typeof stopMessageUpdated === 'function') stopMessageUpdated(); } catch {
      }
      resolve(ok);
    };

    const onCharacterRendered = (renderedMessageId) => {
      if (Number(renderedMessageId) === targetId) finish(true);
    };

    const onMessageUpdated = (updatedMessageId) => {
      if (Number(updatedMessageId) === targetId) finish(true);
    };

    try {
      if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
        const h1 = eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, onCharacterRendered);
        if (h1 && typeof h1.stop === 'function') stopCharacterRendered = h1.stop;
        const h2 = eventOn(tavern_events.MESSAGE_UPDATED, onMessageUpdated);
        if (h2 && typeof h2.stop === 'function') stopMessageUpdated = h2.stop;
      }
    } catch {
    }

    setTimeout(() => finish(false), Math.max(0, Number(timeoutMs) || 0));
  });
}

async function waitForAssistantMessageRendered(messageId, timeoutMs = AUTO_SIM_RENDER_WAIT_MAX_MS) {
  const targetId = Number(messageId);
  if (!Number.isInteger(targetId)) return false;

  const waited = await waitForMessageRenderCompleted(targetId, timeoutMs);
  if (!waited) return false;

  const message = getMessageFromEvent(targetId);
  return !!message && isAssistantMessage(message);
}

async function schedulePostRenderBodyInjection(messageId, source = 'simulation') {
  const targetId = Number(messageId);
  if (!Number.isInteger(targetId)) return;
  if (pendingPostRenderInjections.has(targetId)) return;

  const ctx = await initBizSim();
  if (ctx.engine?.config?.SIMULATION?.bodyInjectionEnabled !== true) return;

  pendingPostRenderInjections.add(targetId);
  try {
    await waitForMessageRenderCompleted(targetId, POST_RENDER_INJECTION_WAIT_MS);

    const message = getMessageFromEvent(targetId);
    if (!message || !isAssistantMessage(message) || hasBizSimInjectionBlock(message)) return;

    const injected = await ctx.engine.injectBizSimBlocksToMessage(targetId, 10);
    if (!injected?.success) {
      console.debug(`[BizSim] 后置正文注入未生效: messageId=${targetId}, source=${source}, reason=${injected?.reason || 'unknown'}`);
    }
  } catch (error) {
    console.warn('[BizSim] 后置正文注入异常:', error?.message || error);
  } finally {
    pendingPostRenderInjections.delete(targetId);
  }
}

export async function triggerSimulationFromHtml() {
  if (manualSimInFlight || autoSimInFlight) {
    const waitUntil = Date.now() + 20000;
    while ((manualSimInFlight || autoSimInFlight) && Date.now() < waitUntil) {
      // Give in-flight simulation a chance to finish instead of failing immediately.
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (manualSimInFlight || autoSimInFlight) {
      return { success: false, error: '推演任务繁忙，请稍后再试' };
    }
  }
  return quickSimulate();
}

export async function initBizSim() {
  if (!engine) {
    engine = new BizSimEngine();
    await engine.initialize();
  }

  if (!ui) {
    ui = new BizSimUI(engine);
  }

  return { engine, ui };
}

export async function openBizSim() {
  const ctx = await initBizSim();
  ctx.ui.open();
}

export async function quickSimulate() {
  if (manualSimInFlight) return { success: false, error: '推演中' };
  manualSimInFlight = true;
  const ctx = await initBizSim();

  if (typeof toastr !== 'undefined') {
    toastr.info('开始执行推演...', 'BizSim');
  }

  try {
    setSimulationState(true, '手动推演');
    const result = await ctx.engine.runSimulation(true);
    if (result?.success) {
      const floorMessageId = Number(result?.data?.floorSync?.messageId);
      if (Number.isInteger(floorMessageId)) {
        void schedulePostRenderBodyInjection(floorMessageId, 'manual-simulation');
      }
    }
    if (typeof toastr !== 'undefined') {
      if (result.success) {
        const count = result.data.worldSimulation?.tracks?.length || 0;
        toastr.success(`推演完成！共 ${count} 个活跃视角`, 'BizSim');
      } else {
        toastr.error(`推演失败: ${result.error}`, 'BizSim');
      }
    }

    return result;
  } catch (error) {
    console.error('[BizSim] 手动推演异常:', error);
    return { success: false, error: error?.message || '推演发生未知错误' };
  } finally {
    setSimulationState(false);
    manualSimInFlight = false;
  }
}

export function registerBizSimEvents() {
  const eventOpen = getButtonEventSafe('世界推演');
  const eventSimulate = getButtonEventSafe('快速推演');

  eventOnSafe(eventOpen, async () => {
    await openBizSim();
  });

  eventOnSafe(eventSimulate, async () => {
    await triggerSimulationFromHtml();
  });

  if (typeof tavern_events !== 'undefined') {
    eventOnSafe(tavern_events.MESSAGE_RECEIVED, async (messageId) => {
      // 自动推演门控：新的 AI 楼层消息 && 楼层渲染完成 && MVU 变量更新结束
      const hasMvu = await hasCharacterMvuSystem();
      const mvuWaitTimeout = hasMvu ? MVU_DETECTED_WAIT_MAX_MS : MVU_FALLBACK_WAIT_MS;

      const renderWaitPromise = waitForAssistantMessageRendered(messageId, AUTO_SIM_RENDER_WAIT_MAX_MS);
      const mvuWaitPromise = waitForMvuVariableUpdateEnded(mvuWaitTimeout);

      const [renderReady, mvuReady] = await Promise.all([renderWaitPromise, mvuWaitPromise]);

      if (!renderReady) {
        console.debug(`[BizSim][AutoSim] skip: render-not-ready-or-not-assistant, messageId=${messageId}`);
        return;
      }

      if (!mvuReady) {
        console.debug(`[BizSim][AutoSim] MVU update-ended wait timeout (${mvuWaitTimeout}ms), continue with fallback timing.`);
      }

      await maybeAutoSimulate(messageId);
    });

    eventOnSafe(tavern_events.MESSAGE_SWIPED, () => {
      console.log('[BizSim] 检测到消息切换');
    });
  }
}

export function exposeBizSimDebugApi() {
  const api = {
    get engine() {
      return engine;
    },
    get ui() {
      return ui;
    },
    open: openBizSim,
    simulate: quickSimulate,
    simulateFromHtml: triggerSimulationFromHtml,
    get isSimulating() {
      return simulationState.isSimulating;
    },
    get simulationState() {
      return { isSimulating: simulationState.isSimulating, source: simulationState.source };
    },
    setSimulationState(isSimulating, source = '') {
      setSimulationState(isSimulating, source);
    },
    subscribeSimulationState(listener) {
      if (typeof listener !== 'function') return () => {};
      simulationStateListeners.add(listener);
      try {
        listener({ isSimulating: simulationState.isSimulating, source: simulationState.source });
      } catch {
      }
      return () => simulationStateListeners.delete(listener);
    },
  };

  window.BizSim = api;

  try {
    if (window.parent && window.parent !== window) {
      window.parent.BizSim = api;
    }
  } catch {
  }

  try {
    if (window.top && window.top !== window) {
      window.top.BizSim = api;
    }
  } catch {
  }
}

export async function bootBizSim() {
  registerBizSimEvents();
  exposeBizSimDebugApi();

  console.log('[BizSim] 模块化开发版本已加载，点击"世界推演"按钮使用');
  if (typeof toastr !== 'undefined') {
    toastr.success('BizSim 模块化开发版本已就绪', 'BizSim', { timeOut: 3000 });
  }
}
