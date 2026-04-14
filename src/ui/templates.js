import { escapeHtml } from '../utils/object.js';

export function createMainPanelHtml(engine) {
  return `
<div id="bizsim-panel" class="bizsim-shell">
  <style>
    :root {
      --bizsim-bg: #07111f;
      --bizsim-bg-soft: #0c1728;
      --bizsim-panel: rgba(11, 18, 32, 0.78);
      --bizsim-panel-strong: #0d1728;
      --bizsim-line: rgba(255, 255, 255, 0.08);
      --bizsim-text: #e8eef8;
      --bizsim-muted: #92a4c3;
      --bizsim-primary: #5dd3ff;
      --bizsim-accent: #8b5cf6;
      --bizsim-warm: #f59e0b;
      --bizsim-danger: #fb7185;
      --bizsim-success: #34d399;
      --bizsim-radius-xl: 24px;
      --bizsim-radius-lg: 18px;
      --bizsim-radius-md: 14px;
      --bizsim-radius-sm: 10px;
    }

    .bizsim-shell {
      font-family: Inter, "Noto Sans SC", "PingFang SC", system-ui, sans-serif;
      color: var(--bizsim-text);
      background:
        radial-gradient(circle at top left, rgba(93, 211, 255, 0.18), transparent 32%),
        radial-gradient(circle at top right, rgba(139, 92, 246, 0.20), transparent 36%),
        linear-gradient(180deg, #08111d 0%, #0b1320 100%);
      border-radius: 24px;
      overflow: hidden;
    }

    .bizsim-shell * { box-sizing: border-box; }
    .bizsim-shell button, .bizsim-shell input, .bizsim-shell textarea, .bizsim-shell select { font: inherit; }
    .bizsim-wrap { max-height: 88vh; overflow: auto; }
    .bizsim-hero {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 22px;
      background: linear-gradient(135deg, rgba(12, 20, 36, 0.96), rgba(13, 24, 44, 0.92));
      border-bottom: 1px solid var(--bizsim-line);
      backdrop-filter: blur(16px);
    }
    .bizsim-brand { min-width: 0; }
    .bizsim-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(93, 211, 255, 0.12);
      color: var(--bizsim-primary);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .bizsim-brand h1 { margin: 0; font-size: 26px; line-height: 1.15; }
    .bizsim-brand p { margin: 8px 0 0; color: var(--bizsim-muted); font-size: 13px; }
    .bizsim-hero-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
    }
    .bizsim-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--bizsim-muted);
      border: 1px solid var(--bizsim-line);
      font-size: 12px;
      white-space: nowrap;
    }
    .bizsim-btn {
      border: 0;
      border-radius: 14px;
      padding: 11px 16px;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease, background .15s ease, opacity .15s ease;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
    .bizsim-btn:hover { transform: translateY(-1px); }
    .bizsim-btn:active { transform: translateY(0); }
    .bizsim-btn.is-loading {
      position: relative;
      pointer-events: none;
      opacity: 0.9;
      padding-right: 34px;
    }
    .bizsim-btn.is-loading::after {
      content: '';
      position: absolute;
      right: 12px;
      top: 50%;
      width: 14px;
      height: 14px;
      margin-top: -7px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: bizsim-spin 0.9s linear infinite;
    }
    @keyframes bizsim-spin { to { transform: rotate(360deg); } }
    .bizsim-btn-primary {
      background: linear-gradient(135deg, #6ad6ff, #5dd3ff 55%, #4bb0ff);
      color: #04101d;
      box-shadow: 0 10px 24px rgba(93, 211, 255, 0.18);
    }
    .bizsim-btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--bizsim-text);
      border: 1px solid var(--bizsim-line);
    }
    .bizsim-btn-danger {
      background: rgba(251, 113, 133, 0.14);
      color: #ffd8de;
      border: 1px solid rgba(251, 113, 133, 0.28);
    }
    .bizsim-top-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
    }
    .bizsim-nav {
      display: flex;
      gap: 8px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--bizsim-line);
      background: rgba(6, 11, 21, 0.88);
      overflow-x: auto;
    }
    .bizsim-tab {
      border: 1px solid transparent;
      background: rgba(255,255,255,0.04);
      color: var(--bizsim-muted);
      padding: 10px 16px;
      border-radius: 999px;
      cursor: pointer;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 700;
    }
    .bizsim-tab.active {
      color: var(--bizsim-text);
      background: rgba(93, 211, 255, 0.16);
      border-color: rgba(93, 211, 255, 0.25);
    }
    .bizsim-main { padding: 20px; }
    .bizsim-section { display: none; }
    .bizsim-section.active { display: block; }
    .bizsim-grid-2 { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr); gap: 16px; }
    .bizsim-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .bizsim-card {
      background: linear-gradient(180deg, rgba(13, 23, 40, 0.9), rgba(8, 16, 29, 0.92));
      border: 1px solid var(--bizsim-line);
      border-radius: var(--bizsim-radius-xl);
      padding: 18px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
    }
    .bizsim-card + .bizsim-card { margin-top: 16px; }
    .bizsim-card-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      font-size: 15px;
      font-weight: 800;
      color: var(--bizsim-text);
    }
    .bizsim-card-subtitle { color: var(--bizsim-muted); font-size: 12px; }
    .bizsim-form-group { margin-bottom: 14px; }
    .bizsim-form-group label { display: block; margin-bottom: 6px; color: #c6d1e6; font-size: 13px; font-weight: 600; }
    .bizsim-form-group input[type="text"], .bizsim-form-group input[type="password"], .bizsim-form-group input[type="number"], .bizsim-form-group textarea, .bizsim-form-group select {
      width: 100%;
      padding: 11px 12px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(6, 12, 22, 0.9);
      color: var(--bizsim-text);
      outline: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .bizsim-form-group textarea { min-height: 92px; resize: vertical; }
    .bizsim-form-group input:focus, .bizsim-form-group textarea:focus, .bizsim-form-group select:focus {
      border-color: rgba(93, 211, 255, 0.5);
      box-shadow: 0 0 0 3px rgba(93, 211, 255, 0.12);
    }
    .bizsim-helper { margin-top: 6px; color: var(--bizsim-muted); font-size: 12px; line-height: 1.5; }
    .bizsim-stat {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 112px;
      justify-content: space-between;
    }
    .bizsim-stat-label { color: var(--bizsim-muted); font-size: 12px; }
    .bizsim-stat-value { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
    .bizsim-stat-hint { color: #b8c5dc; font-size: 12px; }
    .bizsim-dashboard-layout { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr); gap: 16px; }
    .bizsim-dashboard-stack { display: grid; gap: 16px; }
    .bizsim-toolbar { display: flex; gap: 10px; flex-wrap: wrap; }
    .bizsim-log {
      background: rgba(4, 10, 18, 0.9);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      color: #9fe7b7;
      white-space: pre-line;
      max-height: 220px;
      overflow-y: auto;
    }
    .bizsim-sheet-toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .bizsim-sheet-btn { padding: 9px 12px; border-radius: 999px; }
    .bizsim-sheet-btn.active { background: rgba(93, 211, 255, 0.16); color: var(--bizsim-text); border: 1px solid rgba(93, 211, 255, 0.28); }
    .bizsim-table-wrap { overflow: auto; border-radius: 18px; border: 1px solid var(--bizsim-line); }
    .bizsim-table { width: 100%; border-collapse: collapse; background: rgba(4, 10, 18, 0.9); font-size: 13px; }
    .bizsim-table th, .bizsim-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); vertical-align: top; }
    .bizsim-table th { position: sticky; top: 0; background: rgba(16, 27, 46, 0.98); color: #7fdcff; text-align: left; z-index: 1; }
    .bizsim-table td:first-child { color: #93ffbe; white-space: nowrap; }
    .bizsim-list { display: grid; gap: 10px; }
    .bizsim-entry {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.03);
    }
    .bizsim-entry input { margin-top: 4px; }
    .bizsim-entry-meta { color: var(--bizsim-muted); font-size: 12px; margin-top: 4px; line-height: 1.45; }
    .bizsim-prompt-snapshot {
      min-height: 240px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 1.6;
      background: rgba(4, 10, 18, 0.9);
    }
    .bizsim-split-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    @media (max-width: 1100px) {
      .bizsim-grid-2, .bizsim-dashboard-layout { grid-template-columns: 1fr; }
      .bizsim-grid-3 { grid-template-columns: 1fr; }
      .bizsim-hero { align-items: flex-start; flex-direction: column; }
      .bizsim-hero-actions { justify-content: flex-start; }
    }
  </style>

  <div class="bizsim-wrap">
    <header class="bizsim-hero">
      <div class="bizsim-brand">
        <div class="bizsim-kicker">BizSim Engine</div>
        <h1>商业推演控制台</h1>
        <p>模块化版本 v${engine.config.VERSION} · 独立 LLM · 世界书注入 · 可回放提示词</p>
      </div>
      <div class="bizsim-hero-actions">
        <div class="bizsim-chip">默认模型：${escapeHtml(engine.config.LLM.model || '未配置')}</div>
        <button class="bizsim-btn bizsim-btn-primary" id="btn-global-simulation" type="button">一键推演</button>
        <button class="bizsim-btn bizsim-btn-secondary" id="btn-global-audit" type="button">快速审计</button>
        <button class="bizsim-btn bizsim-btn-secondary" id="btn-global-export" type="button">导出报告</button>
      </div>
    </header>

    <nav class="bizsim-nav">
      <button class="bizsim-tab active" data-tab="dashboard">仪表盘</button>
      <button class="bizsim-tab" data-tab="simulation">推演设置</button>
      <button class="bizsim-tab" data-tab="api">API设置</button>
      <button class="bizsim-tab" data-tab="prompts">提示词</button>
    </nav>

    <main class="bizsim-main">
      <section class="bizsim-section active" id="tab-dashboard">
        <div class="bizsim-dashboard-layout">
          <div class="bizsim-dashboard-stack">
            <div class="bizsim-grid-3" id="dashboard-stats">
              <div class="bizsim-card bizsim-stat"><div class="bizsim-stat-label">推演视角</div><div class="bizsim-stat-value">0</div><div class="bizsim-stat-hint">等待初始化</div></div>
              <div class="bizsim-card bizsim-stat"><div class="bizsim-stat-label">资产表</div><div class="bizsim-stat-value">0</div><div class="bizsim-stat-hint">角色卡变量中的核心资产表</div></div>
              <div class="bizsim-card bizsim-stat"><div class="bizsim-stat-label">审计状态</div><div class="bizsim-stat-value">--</div><div class="bizsim-stat-hint">跨表一致性检查</div></div>
            </div>

            <div class="bizsim-card">
              <div class="bizsim-card-title">
                <span>资产帝国预览</span>
                <span class="bizsim-card-subtitle">快速查看核心表</span>
              </div>
              <div class="bizsim-sheet-toolbar">
                <button class="bizsim-btn bizsim-btn-secondary bizsim-sheet-btn active" data-sheet="sheet_assetOVW0">资产总览</button>
                <button class="bizsim-btn bizsim-btn-secondary bizsim-sheet-btn" data-sheet="sheet_bizStruct">业务结构</button>
                <button class="bizsim-btn bizsim-btn-secondary bizsim-sheet-btn" data-sheet="sheet_cashInv1a">流动资产</button>
                <button class="bizsim-btn bizsim-btn-secondary bizsim-sheet-btn" data-sheet="sheet_rlEst02b">不动产</button>
                <button class="bizsim-btn bizsim-btn-secondary bizsim-sheet-btn" data-sheet="sheet_bizSegments">业务板块</button>
                <button class="bizsim-btn bizsim-btn-secondary bizsim-sheet-btn" data-sheet="sheet_luxuryAssets">奢侈品</button>
                <button class="bizsim-btn bizsim-btn-secondary bizsim-sheet-btn" data-sheet="sheet_dbt4Lst4">债务</button>
              </div>
              <div id="empire-table-container"><div class="bizsim-helper">选择上方按钮查看表格</div></div>
            </div>
          </div>

          <div class="bizsim-dashboard-stack">
            <div class="bizsim-card">
              <div class="bizsim-card-title">
                <span>全局操作</span>
                <span class="bizsim-card-subtitle">高频入口</span>
              </div>
              <div class="bizsim-toolbar">
                <button class="bizsim-btn bizsim-btn-primary" id="btn-open-simulation-tab" type="button">打开推演设置</button>
                <button class="bizsim-btn bizsim-btn-secondary" id="btn-refresh-dashboard" type="button">刷新面板</button>
              </div>
              <div class="bizsim-helper">顶部“一键推演”会直接执行当前配置。这里保留一个轻量跳转，方便先调整设置。</div>
            </div>

            <div class="bizsim-card">
              <div class="bizsim-card-title">
                <span>推演轨迹</span>
                <span class="bizsim-card-subtitle">世界视角动态</span>
              </div>
              <div id="world-tracks-container"><div class="bizsim-helper">暂无轨迹</div></div>
            </div>

            <div class="bizsim-card">
              <div class="bizsim-card-title">
                <span>运行日志</span>
                <span class="bizsim-card-subtitle">最近操作</span>
              </div>
              <div class="bizsim-log" id="bizsim-logs">&gt; BizSim 引擎已初始化\n&gt; 等待指令...</div>
            </div>
          </div>
        </div>
      </section>

      <section class="bizsim-section" id="tab-simulation">
        <div class="bizsim-grid-2">
          <div class="bizsim-card">
            <div class="bizsim-card-title">
              <span>推演设置</span>
              <span class="bizsim-card-subtitle">正文 / 楼层变量 / 审计参数</span>
            </div>
            <div class="bizsim-form-group">
              <label>推演模式</label>
              <select id="sim-mode">
                <option value="strict" ${engine.config.SIMULATION.mode === 'strict' ? 'selected' : ''}>严格模式</option>
                <option value="balanced" ${engine.config.SIMULATION.mode === 'balanced' ? 'selected' : ''}>平衡模式</option>
                <option value="creative" ${engine.config.SIMULATION.mode === 'creative' ? 'selected' : ''}>发散模式</option>
              </select>
              <div class="bizsim-helper">${engine.getSimulationModeNote()}</div>
            </div>
            <div class="bizsim-grid-3">
              <div class="bizsim-form-group"><label>历史正文楼数</label><input type="number" id="sim-history-limit" min="1" max="100" step="1" value="${engine.config.SIMULATION.historyLimit}"></div>
              <div class="bizsim-form-group"><label>资产统计楼数</label><input type="number" id="sim-asset-history-floors" min="1" max="100" step="1" value="${engine.config.SIMULATION.assetHistoryFloors}"></div>
              <div class="bizsim-form-group"><label>世界推演楼数</label><input type="number" id="sim-world-history-floors" min="1" max="100" step="1" value="${engine.config.SIMULATION.worldHistoryFloors}"></div>
            </div>
            <div class="bizsim-grid-3">
              <div class="bizsim-form-group"><label>视角前缀</label><input type="text" id="sim-track-prefix" value="${escapeHtml(engine.config.SIMULATION.trackPrefix)}"></div>
              <div class="bizsim-form-group"><label>最少视角</label><input type="number" id="sim-min-tracks" min="1" max="20" step="1" value="${engine.config.SIMULATION.minTracks}"></div>
              <div class="bizsim-form-group"><label>最大视角</label><input type="number" id="sim-max-tracks" min="3" max="30" step="1" value="${engine.config.SIMULATION.maxTracks}"></div>
            </div>
            <div class="bizsim-grid-3">
              <div class="bizsim-form-group"><label>重试次数</label><input type="number" id="sim-retry-count" min="0" max="5" step="1" value="${engine.config.SIMULATION.retryCount}"></div>
              <div class="bizsim-form-group"><label>现金容差（万）</label><input type="number" id="sim-cash-tolerance" min="0" max="1000" step="0.1" value="${engine.config.AUDIT.cashToleranceWan}"></div>
              <div class="bizsim-form-group"><label>企业容差（万）</label><input type="number" id="sim-enterprise-tolerance" min="0" max="1000" step="0.1" value="${engine.config.AUDIT.enterpriseToleranceWan}"></div>
            </div>
            <div class="bizsim-grid-3">
              <div class="bizsim-form-group"><label>忠诚阈值</label><input type="number" id="sim-loyalty-threshold" min="0" max="100" step="1" value="${engine.config.AUDIT.loyaltyThreshold}"></div>
              <div class="bizsim-form-group"><label>折损最小值</label><input type="number" id="sim-liquidation-min" min="0" max="1" step="0.05" value="${engine.config.AUDIT.liquidationPenalty.min}"></div>
              <div class="bizsim-form-group"><label>折损最大值</label><input type="number" id="sim-liquidation-max" min="0" max="1" step="0.05" value="${engine.config.AUDIT.liquidationPenalty.max}"></div>
            </div>
            <div class="bizsim-form-group">
              <label><input type="checkbox" id="sim-use-history" ${engine.config.SIMULATION.useHistory ? 'checked' : ''}> 使用聊天历史</label>
            </div>
            <div class="bizsim-form-group">
              <label><input type="checkbox" id="sim-include-floor-data" ${engine.config.SIMULATION.includeFloorData !== false ? 'checked' : ''}> 注入资产状态</label>
            </div>
            <div class="bizsim-form-group">
              <label><input type="checkbox" id="sim-include-world-state" ${engine.config.SIMULATION.includeWorldState ? 'checked' : ''}> 注入世界推演状态</label>
            </div>
            <div class="bizsim-form-group">
              <label><input type="checkbox" id="sim-auto-save" ${engine.config.SIMULATION.autoSave ? 'checked' : ''}> 自动保存推演结果到角色卡变量</label>
            </div>
            <div class="bizsim-form-group">
              <label><input type="checkbox" id="sim-repair-on-parse" ${engine.config.SIMULATION.repairOnParseError ? 'checked' : ''}> 解析失败时自动修复</label>
            </div>
            <div class="bizsim-card" style="margin-top:12px;">
              <div class="bizsim-card-title">
                <span>自动推演条件</span>
                <span class="bizsim-card-subtitle">按消息事件自动触发</span>
              </div>
              <div class="bizsim-form-group">
                <label><input type="checkbox" id="sim-auto-run-enabled" ${engine.config.SIMULATION.autoRunEnabled ? 'checked' : ''}> 启用自动推演</label>
              </div>
              <div class="bizsim-form-group">
                <label><input type="checkbox" id="sim-auto-run-only-assistant" ${engine.config.SIMULATION.autoRunOnlyAssistant !== false ? 'checked' : ''}> 仅在 AI 消息触发</label>
              </div>
              <div class="bizsim-form-group">
                <label><input type="checkbox" id="sim-auto-run-use-history" ${engine.config.SIMULATION.autoRunUseHistory !== false ? 'checked' : ''}> 自动推演时带聊天历史</label>
              </div>
              <div class="bizsim-grid-3">
                <div class="bizsim-form-group"><label>每几条 AI 回复触发</label><input type="number" id="sim-auto-run-assistant-floor-interval" min="1" max="20" step="1" value="${engine.config.SIMULATION.autoRunAssistantFloorInterval ?? 1}"></div>
                <div class="bizsim-form-group"><label>最小正文长度</label><input type="number" id="sim-auto-run-min-chars" min="0" max="5000" step="1" value="${engine.config.SIMULATION.autoRunMinChars ?? 300}"></div>
                <div class="bizsim-form-group"><label>触发冷却（秒）</label><input type="number" id="sim-auto-run-cooldown" min="0" max="600" step="1" value="${engine.config.SIMULATION.autoRunCooldownSec ?? 8}"></div>
              </div>
              <div class="bizsim-form-group">
                <label>正文提取标签（逗号分隔）</label>
                <input type="text" id="sim-content-extract-tags" value="${escapeHtml(engine.config.SIMULATION.contentExtractTags || 'content,game')}" placeholder="content,game,story">
                <div class="bizsim-helper">仅对 AI 消息生效：从消息中提取 &lt;content&gt;...&lt;/content&gt; 等标签包裹的有效内容，多个标签合并提取。未匹配时返回原始内容。</div>
              </div>
              <div class="bizsim-form-group">
                <label>正文排除标签（逗号分隔）</label>
                <input type="text" id="sim-content-exclude-tags" value="${escapeHtml(engine.config.SIMULATION.contentExcludeTags || '')}" placeholder="think,analysis,reasoning">
                <div class="bizsim-helper">对所有消息生效：移除指定标签包裹内容。未闭合标签仅在当前单条消息内截断，不跨消息。</div>
              </div>
              <div class="bizsim-helper">触发事件: 新消息到达（MESSAGE_RECEIVED）。满足条件时自动执行一次推演。</div>
            </div>
            <div class="bizsim-toolbar">
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-save-sim-settings" type="button">保存推演设置</button>
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-reset-sim-settings" type="button">恢复默认</button>
              <button class="bizsim-btn bizsim-btn-primary" id="btn-start-simulation" type="button">开始推演</button>
            </div>
            <div class="bizsim-helper">全局按钮会直接跑当前设置；这里用于细调上下文窗口、世界书和审计阈值。</div>
          </div>

          <div class="bizsim-card">
            <div class="bizsim-card-title">
              <span>世界书注入</span>
              <span class="bizsim-card-subtitle">下拉选择 + 条目勾选</span>
            </div>
            <div class="bizsim-form-group">
              <label>选择世界书</label>
              <select id="sim-worldbook-name">
                <option value="">当前绑定世界书（默认）</option>
              </select>
              <div class="bizsim-helper" id="sim-worldbook-binding-hint">默认使用当前角色/聊天绑定的世界书</div>
            </div>
            <div class="bizsim-toolbar">
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-worldbook-refresh" type="button">刷新条目</button>
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-worldbook-select-all" type="button">全选</button>
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-worldbook-select-none" type="button">全不选</button>
            </div>
            <div class="bizsim-form-group" style="margin-top:10px;">
              <label>搜索条目</label>
              <input type="text" id="worldbook-entry-search" placeholder="输入名称 / uid / 内容关键词过滤条目...">
            </div>
            <div class="bizsim-form-group">
              <label>条目勾选列表</label>
              <div id="worldbook-entry-list" class="bizsim-list">
                <div class="bizsim-helper">请选择世界书后加载条目</div>
              </div>
            </div>
            <div class="bizsim-form-group" style="margin-top:14px; padding-top:14px; border-top:1px solid var(--bizsim-line);">
              <label>高级选项</label>
            </div>
            <div class="bizsim-form-group">
              <label><input type="checkbox" id="sim-use-active-worldbooks" ${engine.config.SIMULATION.useActiveWorldbooks !== false ? 'checked' : ''}> 在未指定时自动使用活跃世界书</label>
              <div class="bizsim-helper">启用时：如果未指定世界书名单，自动检测角色/聊天/全局世界书。禁用时：仅使用指定的世界书。</div>
            </div>
            <div class="bizsim-form-group">
              <label>指定世界书名单（逗号分隔）</label>
              <input type="text" id="sim-worldbook-names" value="${escapeHtml(engine.config.SIMULATION.worldbookNames || '')}" placeholder="worldbook1,worldbook2,worldbook3">
              <div class="bizsim-helper">留空则按上述规则自动检测。填写后只使用指定的世界书，多个名称用逗号分隔。</div>
            </div>
            <div class="bizsim-form-group">
              <label>条目选择器（逗号分隔）</label>
              <input type="text" id="sim-worldbook-entry-selectors" value="${escapeHtml(engine.config.SIMULATION.worldbookEntrySelectors || '')}" placeholder="id1,name2,pattern3">
              <div class="bizsim-helper">按 UID 或名称精确匹配条目。支持部分模糊匹配。多个选择器用逗号分隔，任一匹配都会包含该条目。</div>
            </div>
            <div class="bizsim-form-group">
              <label>单个世界书条目限制</label>
              <input type="number" id="sim-worldbook-entry-limit" min="1" max="100" step="1" value="${engine.config.SIMULATION.worldbookEntryLimit}">
              <div class="bizsim-helper">每个世界书最多提取多少条条目。0 表示无限制。</div>
            </div>
          </div>
        </div>

        <div class="bizsim-card" style="margin-top:16px;">
          <div class="bizsim-card-title">
            <span>推演结果</span>
            <span class="bizsim-card-subtitle">执行后展示</span>
          </div>
          <div id="simulation-result" style="display:none;">
            <div id="simulation-result-content"></div>
          </div>
        </div>
      </section>

      <section class="bizsim-section" id="tab-api">
        <div class="bizsim-grid-2">
          <div class="bizsim-card">
            <div class="bizsim-card-title">
              <span>API设置</span>
              <span class="bizsim-card-subtitle">连接 / 模型 / 参数</span>
            </div>
            <div class="bizsim-form-group">
              <label>API 地址（OpenAI 兼容）</label>
              <input type="text" id="setting-api-url" value="${escapeHtml(engine.config.LLM.apiUrl)}">
            </div>
            <div class="bizsim-form-group">
              <label>API Key</label>
              <input type="password" id="setting-api-key" value="${escapeHtml(engine.config.LLM.apiKey)}" placeholder="可留空">
            </div>
            <div class="bizsim-form-group">
              <label><input type="checkbox" id="setting-persist-api-key" ${engine.config.LLM.persistApiKey ? 'checked' : ''}> 持久化保存 API Key</label>
            </div>
            <div class="bizsim-form-group">
              <label>模型名称</label>
              <input type="text" id="setting-model" value="${escapeHtml(engine.config.LLM.model)}">
            </div>
            <div class="bizsim-form-group">
              <label>模型列表</label>
              <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;">
                <select id="setting-model-select"><option value="" disabled selected>尚未拉取模型</option></select>
                <button class="bizsim-btn bizsim-btn-secondary" id="btn-fetch-models" type="button">拉取模型</button>
              </div>
              <div id="setting-model-status" class="bizsim-helper">点击拉取模型读取可用模型</div>
            </div>
          </div>

          <div class="bizsim-card">
            <div class="bizsim-card-title">
              <span>调用参数</span>
              <span class="bizsim-card-subtitle">温度 / Token / 超时</span>
            </div>
            <div class="bizsim-grid-3">
              <div class="bizsim-form-group"><label>温度</label><input type="number" id="setting-temperature" min="0" max="1" step="0.1" value="${engine.config.LLM.temperature}"></div>
              <div class="bizsim-form-group"><label>最大输出 Token</label><input type="number" id="setting-max-tokens" min="256" max="100000" step="1" value="${engine.config.LLM.maxTokens}"></div>
              <div class="bizsim-form-group"><label>超时毫秒</label><input type="number" id="setting-timeout" min="5000" max="240000" step="1000" value="${engine.config.LLM.timeoutMs}"></div>
            </div>
            <div class="bizsim-form-group">
              <label>额外请求头 JSON</label>
              <textarea id="setting-custom-headers" rows="5">${escapeHtml(engine.config.LLM.customHeaders || '{}')}</textarea>
            </div>
            <div class="bizsim-form-group">
              <label><input type="checkbox" id="setting-force-json" ${engine.config.LLM.forceJsonResponse ? 'checked' : ''}> 强制使用 JSON 响应模式</label>
            </div>
            <div class="bizsim-toolbar">
              <button class="bizsim-btn bizsim-btn-primary" id="btn-save-settings" type="button">保存 API 设置</button>
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-test-connection" type="button">测试连接</button>
            </div>
          </div>
        </div>
      </section>

      <section class="bizsim-section" id="tab-prompts">
        <div class="bizsim-grid-2">
          <div class="bizsim-card">
            <div class="bizsim-card-title">
              <span>提示词编辑</span>
              <span class="bizsim-card-subtitle">模块化块编辑 / 用户偏好插入 / 预设管理</span>
            </div>
            <div id="scaffold-editing-section"></div>
            <div class="bizsim-toolbar" style="margin-top: 12px;">
              <button class="bizsim-btn bizsim-btn-primary" id="btn-save-scaffold-module" type="button">保存模块化配置</button>
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-refresh-scaffold-module" type="button">刷新模块化视图</button>
            </div>
          </div>

          <div class="bizsim-card">
            <div class="bizsim-card-title">
              <span>上一次发送的提示词</span>
              <span class="bizsim-card-subtitle" id="prompt-snapshot-meta">当前构建预览 · 暂无内容</span>
            </div>
            <div class="bizsim-toolbar" style="margin-bottom: 12px;">
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-refresh-last-prompt" type="button">刷新当前预览</button>
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-toggle-prompt-source" type="button">查看上次真实发送</button>
              <button class="bizsim-btn bizsim-btn-secondary" id="btn-copy-last-prompt" type="button">复制当前视图</button>
            </div>
            <textarea id="prompt-snapshot-view" class="bizsim-prompt-snapshot" readonly placeholder="可预览当前左侧构建结果，也可切换查看上一次真正发送给模型的提示词...">${escapeHtml(engine.getLastPromptSnapshot() || '')}</textarea>
          </div>
        </div>
      </section>
    </main>
  </div>
</div>
`;
}
