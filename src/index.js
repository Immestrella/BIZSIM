import { BizSimEngine } from './core/BizSimEngine.js';
import { BizSimUI } from './ui/BizSimUI.js';
import { eventOnSafe, getButtonEventSafe } from './utils/stCompat.js';

let engine = null;
let ui = null;
let autoSimInFlight = false;
let lastAutoSimAt = 0;
let assistantMessageCount = 0;
let manualSimInFlight = false;

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

async function maybeAutoSimulate(messageId) {
  if (autoSimInFlight) return;

  const ctx = await initBizSim();
  const cfg = ctx.engine?.config?.SIMULATION || {};
  const message = getMessageFromEvent(messageId);

  const assistantOnly = cfg.autoRunOnlyAssistant !== false;
  const assistantInterval = Math.max(1, Number(cfg.autoRunAssistantFloorInterval) || 1);
  const isAssistant = isAssistantMessage(message);

  if (assistantOnly && !isAssistant) return;

  if (isAssistant) {
    assistantMessageCount += 1;
    if (assistantMessageCount % assistantInterval !== 0) return;
  }

  if (!shouldRunAutoSimulation(cfg, message)) return;

  autoSimInFlight = true;
  lastAutoSimAt = Date.now();

  try {
    const useHistory = cfg.autoRunUseHistory !== false;
    const result = await ctx.engine.runSimulation(useHistory);
    if (result?.success) {
      const activeTracks = result.data?.worldSimulation?.tracks?.filter((t) => t.status === '推演中').length || 0;
      console.log(`[BizSim] 自动推演完成，活跃视角 ${activeTracks}`);
    } else {
      console.warn('[BizSim] 自动推演失败:', result?.error || '未知错误');
    }
  } catch (error) {
    console.error('[BizSim] 自动推演异常:', error);
  } finally {
    autoSimInFlight = false;
  }
}

async function injectForAssistantMessage(messageId) {
  const message = getMessageFromEvent(messageId);
  if (!isAssistantMessage(message)) return;
  const ctx = await initBizSim();
  try {
    await ctx.engine.injectBizSimBlocksToMessage(messageId, 10);
  } catch (error) {
    console.warn('[BizSim] 正文注入失败:', error?.message || error);
  }
}

async function sweepRecentAssistantInjections(maxScan = 120) {
  const ctx = await initBizSim();
  if (typeof getLastMessageId !== 'function') return;

  let lastId = -1;
  try {
    lastId = Number(getLastMessageId());
  } catch {
    return;
  }
  if (!Number.isInteger(lastId) || lastId < 0) return;

  const begin = Math.max(0, lastId - Math.max(1, Number(maxScan) || 120) + 1);
  for (let messageId = begin; messageId <= lastId; messageId += 1) {
    const message = getMessageFromEvent(messageId);
    if (!isAssistantMessage(message)) continue;
    try {
      await ctx.engine.injectBizSimBlocksToMessage(messageId, 10);
    } catch {
    }
  }
}

export async function triggerSimulationFromHtml() {
  if (manualSimInFlight || autoSimInFlight) return { success: false, error: '推演中' };
  manualSimInFlight = true;
  try {
    const result = await quickSimulate();
    return result;
  } finally {
    manualSimInFlight = false;
  }
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
    const result = await ctx.engine.runSimulation(true);
    if (typeof toastr !== 'undefined') {
      if (result.success) {
        const count = result.data.worldSimulation?.tracks?.length || 0;
        toastr.success(`推演完成！共 ${count} 个活跃视角`, 'BizSim');
      } else {
        toastr.error(`推演失败: ${result.error}`, 'BizSim');
      }
    }

    return result;
  } finally {
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
    await quickSimulate();
  });

  if (typeof tavern_events !== 'undefined') {
    eventOnSafe(tavern_events.MESSAGE_RECEIVED, async (messageId) => {
      await injectForAssistantMessage(messageId);
      await maybeAutoSimulate(messageId);
    });

    eventOnSafe(tavern_events.MESSAGE_SWIPED, () => {
      console.log('[BizSim] 检测到消息切换');
    });
  }
}

export function exposeBizSimDebugApi() {
  window.BizSim = {
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
      return manualSimInFlight || autoSimInFlight;
    },
  };
}

export async function bootBizSim() {
  registerBizSimEvents();
  exposeBizSimDebugApi();
  await sweepRecentAssistantInjections(120);

  console.log('[BizSim] 模块化开发版本已加载，点击"世界推演"按钮使用');
  if (typeof toastr !== 'undefined') {
    toastr.success('BizSim 模块化开发版本已就绪', 'BizSim', { timeOut: 3000 });
  }
}
