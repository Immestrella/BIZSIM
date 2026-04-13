import { escapeHtml } from '../utils/object.js';

export function refreshDashboard(ui) {
  const container = ui.byId('dashboard-stats');
  if (!container) return;

  const sheetNames = Object.keys(ui.engine.data || {}).filter((name) => name.startsWith('sheet_'));
  const displayWorld = ui.engine.getDisplayWorldSimulation?.(10);
  const worldSource = displayWorld?.worldSimulation || ui.engine.worldSimulation;
  const activeTracks = worldSource?.tracks?.filter((track) => track.status === '推演中').length || 0;
  const audit = ui.engine.validateCrossSheetIntegrity();
  const snapshotInfo = displayWorld?.snapshotInfo || null;
  const snapshotHint = snapshotInfo?.hasData
    ? (snapshotInfo.isLatest
      ? '当前楼层最新变量'
      : `显示第 ${snapshotInfo.sourceMessageId} 层（落后 ${snapshotInfo.floorOffset} 层）`)
    : '最近10层无楼层变量';

  const cards = [
    { title: '推演视角', value: String(worldSource?.tracks?.length || 0), hint: `活跃 ${activeTracks} 个` },
    { title: '数据表', value: String(sheetNames.length), hint: '角色卡变量中的资产表' },
    { title: '审计状态', value: audit.valid ? '通过' : '异常', hint: audit.valid ? snapshotHint : `${audit.issues.length} 个问题` },
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

  const display = ui.engine.getDisplaySemanticTableBySheetKey?.(sheetName, 10);
  const semanticTable = display?.table;
  const snapshotInfo = display?.snapshotInfo;
  if (semanticTable) {
    const rows = semanticTable.type === 'single' ? [semanticTable.rows] : (Array.isArray(semanticTable.rows) ? semanticTable.rows : []);
    const html = [];
    const sourceHint = snapshotInfo?.isLatest
      ? '当前楼层最新变量'
      : `第 ${snapshotInfo?.sourceMessageId ?? '--'} 层变量（落后 ${snapshotInfo?.floorOffset ?? '--'} 层）`;
    const staleHint = snapshotInfo?.isLatest
      ? ''
      : '<div class="bizsim-helper" style="margin-top:8px;color:#fbbf24;">当前显示为历史楼层变量。可点击“开始推演”生成最新层数据。</div>';
    html.push(`<div class="bizsim-card" style="margin-bottom:12px;"><div class="bizsim-card-title"><span>${escapeHtml(semanticTable.tableName)}</span><span class="bizsim-card-subtitle">共 ${rows.length} 条记录 · ${escapeHtml(sourceHint)}</span></div>${staleHint}</div>`);
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
    if (!silent) {
      if (snapshotInfo?.isLatest) {
        ui.log(`已切换到表格: ${semanticTable.tableName} (来自当前楼层变量)`);
      } else {
        ui.log(`已切换到表格: ${semanticTable.tableName} (来自第${snapshotInfo?.sourceMessageId ?? '--'}层变量，落后${snapshotInfo?.floorOffset ?? '--'}层)`);
      }
    }
    return;
  }

  // 无楼层语义数据时直接提示为空
  container.innerHTML = '<div class="bizsim-helper">表格数据为空或不存在</div>';
  if (!silent) ui.log('表格数据为空或不存在');
}

export function refreshTracks(ui) {
  const container = ui.byId('world-tracks-container');
  if (!container) return;

  const display = ui.engine.getDisplayWorldSimulation?.(10);
  const tracks = display?.worldSimulation?.tracks || [];
  const snapshotInfo = display?.snapshotInfo;
  if (!tracks.length) {
    container.innerHTML = '<div class="bizsim-helper">暂无推演轨迹</div>';
    return;
  }

  const sourceHint = snapshotInfo?.isLatest
    ? '当前楼层最新变量'
    : `第 ${snapshotInfo?.sourceMessageId ?? '--'} 层变量（落后 ${snapshotInfo?.floorOffset ?? '--'} 层）`;
  const staleHint = snapshotInfo?.isLatest
    ? ''
    : '<div class="bizsim-helper" style="margin-bottom:10px;color:#fbbf24;">当前显示为历史楼层变量。可点击“开始推演”生成最新层数据。</div>';

  container.innerHTML = `
    <div class="bizsim-helper" style="margin-bottom:8px;">轨迹来源：${escapeHtml(sourceHint)}</div>
    ${staleHint}
  ` + tracks.map((track) => `
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
