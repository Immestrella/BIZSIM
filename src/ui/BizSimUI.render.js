import { escapeHtml } from '../utils/object.js';

export function refreshDashboard(ui) {
  const container = ui.byId('dashboard-stats');
  if (!container) return;

  const sheetNames = Object.keys(ui.engine.data || {}).filter((name) => name.startsWith('sheet_'));
  const activeTracks = ui.engine.worldSimulation?.tracks?.filter((track) => track.status === '推演中').length || 0;
  const audit = ui.engine.validateCrossSheetIntegrity();

  const cards = [
    { title: '推演视角', value: String(ui.engine.worldSimulation?.tracks?.length || 0), hint: `活跃 ${activeTracks} 个` },
    { title: '数据表', value: String(sheetNames.length), hint: '角色卡变量中的资产表' },
    { title: '审计状态', value: audit.valid ? '通过' : '异常', hint: audit.valid ? '跨表一致性正常' : `${audit.issues.length} 个问题` },
  ];

  container.innerHTML = cards.map((card) => `
    <div class="bizsim-card bizsim-stat" style="margin-bottom:0;">
      <div class="bizsim-stat-label">${escapeHtml(card.title)}</div>
      <div class="bizsim-stat-value">${escapeHtml(card.value)}</div>
      <div class="bizsim-stat-hint">${escapeHtml(card.hint)}</div>
    </div>
  `).join('');
}

export function refreshEmpire(ui) {
  ui.showSheet(ui.currentEmpireSheet || 'sheet_assetOVW0', true);
}

export function showSheet(ui, sheetName, silent = false) {
  const container = ui.byId('empire-table-container');
  if (!container) return;

  const sheetData = ui.engine.data?.[sheetName];
  const semanticTable = ui.engine.getSemanticTableBySheetKey?.(sheetName);
  const titleMap = {
    sheet_bizStruct: '业务结构',
    sheet_rlEst02b: '不动产',
    sheet_cashInv1a: '流动资产',
    sheet_assetOVW0: '资产总览',
    sheet_luxuryAssets: '奢侈品',
    sheet_bizSegments: '业务板块',
    sheet_dbt4Lst4: '债务',
  };

  ui.currentEmpireSheet = sheetName;
  ui.$$('[data-sheet]').forEach((button) => {
    button.classList.toggle('active', button.dataset.sheet === sheetName);
  });

  if (semanticTable) {
    const rows = semanticTable.type === 'single' ? [semanticTable.rows] : (Array.isArray(semanticTable.rows) ? semanticTable.rows : []);
    const html = [];
    html.push(`<div class="bizsim-card" style="margin-bottom:12px;"><div class="bizsim-card-title"><span>${escapeHtml(semanticTable.tableName)}</span><span class="bizsim-card-subtitle">共 ${rows.length} 条记录</span></div></div>`);
    html.push('<div class="bizsim-table-wrap">');
    html.push('<table class="bizsim-table">');
    html.push('<tr>');
    for (const field of semanticTable.fields) html.push(`<th>${escapeHtml(field)}</th>`);
    html.push('</tr>');

    for (const row of rows) {
      html.push('<tr>');
      for (const field of semanticTable.fields) {
        html.push(`<td>${escapeHtml(row?.[field] ?? '')}</td>`);
      }
      html.push('</tr>');
    }

    html.push('</table></div>');
    container.innerHTML = html.join('');
    if (!silent) ui.log(`已切换到表格: ${semanticTable.tableName}`);
    return;
  }

  if (!sheetData || !Array.isArray(sheetData.content) || !sheetData.content.length) {
    container.innerHTML = '<div class="bizsim-helper">表格数据为空或不存在</div>';
    return;
  }

  const rows = sheetData.content;
  const html = [];
  html.push(`<div class="bizsim-card" style="margin-bottom:12px;"><div class="bizsim-card-title"><span>${escapeHtml(titleMap[sheetName] || sheetName)}</span><span class="bizsim-card-subtitle">共 ${rows.length - 1} 条记录</span></div></div>`);
  html.push('<div class="bizsim-table-wrap">');
  html.push('<table class="bizsim-table">');
  rows.forEach((row, rowIndex) => {
    html.push('<tr>');
    row.forEach((cell) => {
      const tag = rowIndex === 0 ? 'th' : 'td';
      html.push(`<${tag}>${escapeHtml(cell ?? '')}</${tag}>`);
    });
    html.push('</tr>');
  });
  html.push('</table></div>');

  container.innerHTML = html.join('');

  if (!silent) ui.log(`已切换到表格: ${titleMap[sheetName] || sheetName}`);
}

export function refreshTracks(ui) {
  const container = ui.byId('world-tracks-container');
  if (!container) return;

  const tracks = ui.engine.worldSimulation?.tracks || [];
  if (!tracks.length) {
    container.innerHTML = '<div class="bizsim-helper">暂无推演轨迹</div>';
    return;
  }

  container.innerHTML = tracks.map((track) => `
    <div class="bizsim-card" style="margin-bottom:10px;">
      <div class="bizsim-card-title" style="margin-bottom:8px;">
        <span>${escapeHtml(track.id)}: ${escapeHtml(track.characterName)}</span>
        <span class="bizsim-card-subtitle">${escapeHtml(track.status)}</span>
      </div>
      <div class="bizsim-helper">📍 ${escapeHtml(track.location)} | 迭代: ${escapeHtml(String(track.iteration ?? '--'))}</div>
      <div style="margin:8px 0 6px;">${escapeHtml(track.progress || '')}</div>
      <div class="bizsim-helper">${escapeHtml(track.summary || '')}</div>
    </div>
  `).join('');
}

export function showAddTrackForm(ui) {
  const name = prompt('角色名称:');
  if (!name) return;
  const location = prompt('位置:');
  if (!location) return;
  const progress = prompt('进度描述:', '刚开始行动');
  const summary = prompt('摘要:', '新视角，待发展');

  ui.engine.addWorldTrack({
    characterName: name,
    location,
    progress: progress || '刚开始行动',
    summary: summary || '新视角，待发展',
    timeSync: new Date().toLocaleString(),
  });

  ui.refreshTracks();
  ui.log(`添加新视角: ${name}`);
}

export function log(ui, message) {
  const logDiv = ui.byId('bizsim-logs');
  if (!logDiv) return;

  const time = new Date().toLocaleTimeString();
  logDiv.innerHTML += `\n[${time}] ${message}`;
  logDiv.scrollTop = logDiv.scrollHeight;
}
