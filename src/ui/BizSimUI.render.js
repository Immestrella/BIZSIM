import { escapeHtml } from '../utils/object.js';

function parseAmountToNumber(text) {
  const raw = String(text ?? '');
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return NaN;
  return Number.parseFloat(m[0]);
}

function buildHistoryRows(ui, limit = 24) {
  const rows = Array.isArray(ui.engine.getHistoricalFloorStatDataContext?.(limit))
    ? ui.engine.getHistoricalFloorStatDataContext(limit)
    : [];

  return rows.map((item) => {
    const overview = item?.stat_data?.资产总览表 || {};
    const liquid = parseAmountToNumber(overview?.流动资产);
    return {
      messageId: item?.message_id,
      liquid,
      summary: String(overview?.本轮变动摘要 || '').trim(),
    };
  }).filter((item) => Number.isFinite(item.liquid));
}

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

  const heroTitle = ui.byId('dashboard-hero-title');
  const heroSubtitle = ui.byId('dashboard-hero-subtitle');
  const heroMetrics = ui.byId('dashboard-hero-metrics');
  const evolutionStrip = ui.byId('dashboard-evolution-strip');

  if (heroTitle) heroTitle.textContent = audit.valid ? '世界演化态势稳定' : '世界演化出现异常信号';
  if (heroSubtitle) {
    heroSubtitle.textContent = audit.valid
      ? `当前有 ${activeTracks} 个活跃视角在推进，资产与世界线保持同步演化。`
      : `检测到 ${audit.issues.length} 个跨表异常，建议查看校验细节并复核本层变化。`;
  }

  if (heroMetrics) {
    const now = new Date().toLocaleTimeString();
    heroMetrics.innerHTML = [
      `活跃视角: ${activeTracks}`,
      `校验状态: ${audit.valid ? '通过' : '异常'}`,
      `上次刷新: ${now}`,
    ].map((line) => `<span class="bizsim-pill">${escapeHtml(line)}</span>`).join('');
  }

  if (evolutionStrip) {
    const tracks = Array.isArray(ui.engine.worldSimulation?.tracks) ? ui.engine.worldSimulation.tracks : [];
    const nodes = tracks.slice(0, 4);
    if (!nodes.length) {
      evolutionStrip.innerHTML = '<div class="bizsim-node"><div class="bizsim-node-title">暂无节点</div><div class="bizsim-node-meta">等待推演后生成关键变化摘要</div></div>';
    } else {
      evolutionStrip.innerHTML = nodes.map((track) => `
        <div class="bizsim-node">
          <div class="bizsim-node-title">${escapeHtml(track.id || '--')} · ${escapeHtml(track.characterName || '未命名视角')}</div>
          <div class="bizsim-node-meta">${escapeHtml(track.progress || '暂无进展')}</div>
        </div>
      `).join('');
    }
  }

  const historyRows = buildHistoryRows(ui, 40);
  const historyMode = ui.historyViewMode === 'full' ? 'full' : 'key';
  const trendRow = ui.byId('dashboard-trend-row');
  const trendCaption = ui.byId('dashboard-trend-caption');
  const immersiveTrendRow = ui.byId('immersive-trend-row');
  const immersiveTimeline = ui.byId('immersive-timeline');
  const immersiveSummary = ui.byId('immersive-summary');
  const immersiveSummaryMeta = ui.byId('immersive-summary-meta');
  const historyModeKeyBtn = ui.byId('btn-history-mode-key');
  const historyModeFullBtn = ui.byId('btn-history-mode-full');

  if (historyModeKeyBtn) {
    historyModeKeyBtn.setAttribute('aria-pressed', historyMode === 'key' ? 'true' : 'false');
  }
  if (historyModeFullBtn) {
    historyModeFullBtn.setAttribute('aria-pressed', historyMode === 'full' ? 'true' : 'false');
  }

  const trendSource = historyRows.slice(-8);
  const maxLiquid = trendSource.reduce((m, item) => Math.max(m, item.liquid), 0) || 1;
  const trendBars = trendSource.length
    ? trendSource.map((item) => {
      const h = Math.max(8, Math.round((item.liquid / maxLiquid) * 46));
      return `<div class="bizsim-trend-bar" style="height:${h}px;"></div>`;
    }).join('')
    : '<div class="bizsim-trend-bar" style="height:10px;"></div>';

  if (trendRow) trendRow.innerHTML = trendBars;
  if (immersiveTrendRow) immersiveTrendRow.innerHTML = trendBars;

  if (trendCaption) {
    trendCaption.textContent = trendSource.length
      ? `最近 ${trendSource.length} 层资产脉搏（关键事件过滤）`
      : '暂无历史资产数据';
  }

  const latestSummary = historyRows.slice(-1)[0]?.summary || (tracks.slice(0, 1)[0]?.summary || '暂无变化摘要');
  if (immersiveSummary) immersiveSummary.textContent = latestSummary;
  if (immersiveSummaryMeta) {
    const latestId = historyRows.slice(-1)[0]?.messageId;
    immersiveSummaryMeta.textContent = latestId !== undefined ? `楼层 ${latestId}` : '实时';
  }

  const timelineRows = historyMode === 'full'
    ? historyRows.slice(-40)
    : historyRows.filter((item) => !!item.summary).slice(-20);

  if (immersiveTimeline) {
    if (!timelineRows.length) {
      immersiveTimeline.innerHTML = '<div class="bizsim-helper">暂无历史记录</div>';
    } else {
      immersiveTimeline.innerHTML = timelineRows.reverse().map((item) => `
        <div class="bizsim-timeline-item">
          <div class="bizsim-node-title">楼层 ${escapeHtml(String(item.messageId ?? '--'))}</div>
          <div class="bizsim-node-meta">流动资产脉搏: ${escapeHtml(Number.isFinite(item.liquid) ? `${item.liquid}` : '--')}</div>
          <div class="bizsim-node-meta">${escapeHtml(item.summary || '无摘要')}</div>
        </div>
      `).join('');
    }
  }
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

  // 优先直接读取当前楼层变量中的最新语义资产 JSON。
  const semanticTable = ui.engine.getSemanticTableBySheetKey?.(sheetName);
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
    if (!silent) ui.log(`已切换到表格: ${semanticTable.tableName} (来自最新楼层变量)`);
    return;
  }

  // 无楼层语义数据时直接提示为空
  container.innerHTML = '<div class="bizsim-helper">表格数据为空或不存在</div>';
  if (!silent) ui.log('表格数据为空或不存在');
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
