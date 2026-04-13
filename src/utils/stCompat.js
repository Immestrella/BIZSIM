export function getSillyTavernGlobal() {
  if (typeof SillyTavern !== 'undefined') return SillyTavern;
  if (window.SillyTavern) return window.SillyTavern;

  let cur = window;
  const visited = new Set();
  for (let i = 0; i < 8; i += 1) {
    try {
      if (!cur || visited.has(cur)) break;
      visited.add(cur);
      if (cur.SillyTavern) return cur.SillyTavern;
      if (!cur.parent || cur.parent === cur) break;
      cur = cur.parent;
    } catch {
      break;
    }
  }
  return undefined;
}

export function getSafeDocument() {
  try {
    if (window.top && window.top.document) {
      const testNode = window.top.document.body;
      if (testNode) return window.top.document;
    }
  } catch {
  }
  return document;
}

export async function showConfirm(message) {
  const ST = getSillyTavernGlobal();
  if (ST?.callGenericPopup) {
    try {
      const result = await ST.callGenericPopup(message, ST.POPUP_TYPE.CONFIRM, '', {
        okButton: '确定',
        cancelButton: '取消',
      });
      return result === true || result === ST.POPUP_RESULT?.AFFIRMATIVE;
    } catch {
    }
  }
  return confirm(message);
}

export function getButtonEventSafe(buttonName) {
  if (typeof getButtonEvent === 'function') return getButtonEvent(buttonName);
  return `bizsim_btn_${buttonName}`;
}

export function eventOnSafe(event, callback) {
  if (typeof eventOn === 'function') {
    eventOn(event, callback);
    return;
  }

  if (typeof tavern_events !== 'undefined' && tavern_events[event]) {
    const jq = window.$ || window.jQuery || window.top?.$;
    if (jq) {
      jq(document).on(tavern_events[event], callback);
    } else {
      document.addEventListener(tavern_events[event], callback);
    }
    return;
  }

  window.addEventListener(event, callback);
}

export function getCharacterVariablesSafe() {
  return getVariables({ type: 'character' });
}

export function insertOrAssignVariablesSafe(payload, options = { type: 'character' }) {
  return insertOrAssignVariables(payload, options);
}

export function deleteVariableSafe(path, options = { type: 'character' }) {
  return deleteVariable(path, options);
}

export function getChatHistorySafe(limit = 20) {
  try {
    const lastId = getLastMessageId();
    if (!lastId || lastId <= 0) return [];
    const start = Math.max(1, lastId - limit + 1);
    return getChatMessages(`${start}-${lastId}`);
  } catch {
    return [];
  }
}

export function getLastMessageIdSafe() {
  try {
    if (typeof getLastMessageId === 'function') {
      return getLastMessageId();
    }
  } catch {
  }
  return null;
}

export function getCurrentMessageIdSafe() {
  try {
    if (typeof getCurrentMessageId === 'function') {
      return getCurrentMessageId();
    }
  } catch {
  }
  return getLastMessageIdSafe();
}

export function getMessageVariablesSafe(messageId) {
  try {
    if (typeof getVariables !== 'function' || messageId === null || messageId === undefined) {
      return null;
    }
    return getVariables({ type: 'message', message_id: messageId });
  } catch {
    return null;
  }
}

export function getWorldbookNamesSafe() {
  try {
    if (typeof getWorldbookNames === 'function') return getWorldbookNames();
  } catch {
  }
  return [];
}

export function getGlobalWorldbookNamesSafe() {
  try {
    if (typeof getGlobalWorldbookNames === 'function') return getGlobalWorldbookNames();
  } catch {
  }
  return [];
}

export function getCharWorldbookNamesSafe(characterName = 'current') {
  try {
    if (typeof getCharWorldbookNames === 'function') return getCharWorldbookNames(characterName);
  } catch {
  }
  return { primary: null, additional: [] };
}

export function getCurrentCharPrimaryWorldbookSafe() {
  const charWorldbooks = getCharWorldbookNamesSafe('current') || {};
  return charWorldbooks.primary || null;
}

export function getChatWorldbookNameSafe(chatName = 'current') {
  try {
    if (typeof getChatWorldbookName === 'function') return getChatWorldbookName(chatName);
  } catch {
  }
  return null;
}

export async function getWorldbookSafe(worldbookName) {
  try {
    if (typeof getWorldbook === 'function') return await getWorldbook(worldbookName);
  } catch {
  }
  return null;
}
