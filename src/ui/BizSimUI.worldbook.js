import { escapeHtml } from '../utils/object.js';
import { getWorldbookSafe } from '../utils/stCompat.js';

export function initWorldbookPanel(ui) {
  const select = ui.byId('sim-worldbook-name');
  if (!select) return;

  const names = [];
  const selected = new Set();
  const defaultName = ui.engine.getDefaultWorldbookName();
  const explicitName = String(ui.engine.config.SIMULATION?.worldbookName || '').trim();

  if (defaultName) selected.add(defaultName);
  if (explicitName) selected.add(explicitName);

  for (const name of ui.engine.getActiveWorldbookNames?.() || []) {
    if (!selected.has(name)) names.push(name);
  }

  if (explicitName && !names.includes(explicitName)) {
    names.unshift(explicitName);
  }

  const optionValues = ['', ...names];
  select.innerHTML = optionValues.map((name, index) => {
    const label = index === 0 ? '当前绑定世界书（默认）' : escapeHtml(name);
    const isSelected = index === 0 && !explicitName;
    const extra = defaultName && name === defaultName ? ' · 当前绑定' : '';
    const explicit = explicitName && name === explicitName ? ' · 已保存' : '';
    return `<option value="${escapeHtml(name)}" ${isSelected ? 'selected' : ''}>${label}${extra}${explicit}</option>`;
  }).join('');

  if (explicitName) {
    select.value = explicitName;
    ui.currentWorldbookName = select.value;
  } else {
    ui.currentWorldbookName = defaultName || '';
  }

  if (ui.currentWorldbookName) {
    loadWorldbookEntries(ui, ui.currentWorldbookName);
  } else {
    renderWorldbookEntries(ui, []);
    refreshWorldbookBindingHint(ui);
  }
}

export function refreshWorldbookBindingHint(ui) {
  const hint = ui.byId('sim-worldbook-binding-hint');
  if (!hint) return;

  const selectedName = ui.byId('sim-worldbook-name')?.value || '';
  const defaultName = ui.engine.getDefaultWorldbookName();
  const effectiveName = selectedName || defaultName || '';
  hint.textContent = effectiveName
    ? `当前实际注入：${effectiveName}${selectedName ? '' : '（来自当前角色/聊天绑定）'}`
    : '未找到可用世界书';
}

export async function loadWorldbookEntries(ui, worldbookName) {
  const normalized = String(worldbookName || '').trim();
  const resolvedName = normalized || ui.engine.getDefaultWorldbookName();
  ui.currentWorldbookName = resolvedName || '';

  if (!ui.currentWorldbookName) {
    ui.currentWorldbookEntries = [];
    renderWorldbookEntries(ui, []);
    refreshWorldbookBindingHint(ui);
    return;
  }

  const entries = await getWorldbookSafe(ui.currentWorldbookName);
  ui.currentWorldbookEntries = Array.isArray(entries) ? entries : [];
  renderWorldbookEntries(ui, ui.currentWorldbookEntries);
  refreshWorldbookBindingHint(ui);
}

export function renderWorldbookEntries(ui, entries) {
  const container = ui.byId('worldbook-entry-list');
  if (!container) return;

  const keyword = String(ui.byId('worldbook-entry-search')?.value || '').trim().toLowerCase();
  const filteredEntries = !keyword
    ? entries
    : (entries || []).filter((entry) => {
      const uid = String(entry?.uid ?? '').toLowerCase();
      const name = String(entry?.name || entry?.comment || '').toLowerCase();
      const content = String(entry?.content || '').toLowerCase();
      return uid.includes(keyword) || name.includes(keyword) || content.includes(keyword);
    });

  if (!entries || !entries.length) {
    container.innerHTML = '<div class="bizsim-helper">没有可显示的条目，或当前世界书为空</div>';
    return;
  }

  if (!filteredEntries.length) {
    container.innerHTML = '<div class="bizsim-helper">没有匹配该关键词的条目</div>';
    return;
  }

  const rawSelection = String(ui.engine.config.SIMULATION?.worldbookSelectedUids || '').trim();
  const isExplicitNone = rawSelection === '__NONE__';
  const selectedUids = new Set(ui.engine.parseSelectedEntryUids());
  const explicitSelection = !isExplicitNone && selectedUids.size > 0;

  container.innerHTML = filteredEntries.map((entry) => {
    const uid = String(entry?.uid ?? '');
    const name = escapeHtml(entry?.name || entry?.comment || '未命名条目');
    const content = escapeHtml(ui.engine.stripText(entry?.content || '', 260));
    const meta = [
      `uid=${escapeHtml(uid || '--')}`,
      entry?.enabled === false ? '已禁用' : '已启用',
      entry?.position?.type ? `位置=${escapeHtml(entry.position.type)}` : '',
    ].filter(Boolean).join(' · ');
    const checked = isExplicitNone ? false : (explicitSelection ? selectedUids.has(uid) : true);
    return `
      <label class="bizsim-entry">
        <input type="checkbox" class="bizsim-worldbook-entry-checkbox" data-uid="${escapeHtml(uid)}" ${checked ? 'checked' : ''}>
        <div>
          <div style="font-weight:700;">${name}</div>
          <div class="bizsim-entry-meta">${escapeHtml(meta)}</div>
          <div class="bizsim-entry-meta">${content || '无正文摘要'}</div>
        </div>
      </label>
    `;
  }).join('');

  ui.$$('.bizsim-worldbook-entry-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      syncWorldbookSelectionsToConfig(ui);
    });
  });

  syncWorldbookSelectionsToConfig(ui);
}

export function setWorldbookSelections(ui, checked) {
  ui.$$('.bizsim-worldbook-entry-checkbox').forEach((checkbox) => {
    checkbox.checked = checked;
  });
  syncWorldbookSelectionsToConfig(ui);
}

export function syncWorldbookSelectionsToConfig(ui) {
  const checkboxes = ui.$$('.bizsim-worldbook-entry-checkbox');
  if (!checkboxes.length && !ui.currentWorldbookEntries.length) {
    return;
  }

  const selectedUids = checkboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.dataset.uid)
    .filter(Boolean);

  ui.engine.config.SIMULATION.worldbookName = ui.byId('sim-worldbook-name')?.value?.trim() || '';
  ui.engine.config.SIMULATION.worldbookSelectedUids = selectedUids.length ? selectedUids.join(',') : '__NONE__';
}
