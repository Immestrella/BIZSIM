import {
  getCurrentMessageIdSafe,
  getLastMessageIdSafe,
  getMessageVariablesSafe,
  getCurrentCharPrimaryWorldbookSafe,
  getWorldbookNamesSafe,
  getGlobalWorldbookNamesSafe,
  getCharWorldbookNamesSafe,
  getChatWorldbookNameSafe,
  getWorldbookSafe,
  insertOrAssignVariablesSafe,
} from '../utils/stCompat.js';
import { deepClone } from '../utils/object.js';

export const BIZSIM_ENGINE_CONTEXT_METHODS = {
  getFloorNamespaceKeys() {
    const configured = this.config?.FLOOR_NAMESPACE || {};
    return {
      assetsKey: String(configured.assetsKey || 'bizsim_assets'),
      worldStateKey: String(configured.worldStateKey || 'bizsim_world_state'),
    };
  },

  getSemanticTableMap() {
    return {
      集团架构表: {
        type: 'single',
        sheetKey: 'sheet_bizStruct',
        rowPrefix: 'GB',
        fields: ['实体名称', '注册地|架构类型', '发展阶段', '实控持股%', '上市状态', '集团总估值', '核心管理层', '集团月净现金流', '集团现金储备', '近期大事', '员工审计'],
      },
      固定资产表: {
        type: 'multi',
        sheetKey: 'sheet_rlEst02b',
        rowPrefix: 'RE',
        fields: ['物业名称', '城市/区位', '类型|面积', '估值|购入成本', '月租金', '贷款余额|月供', '状态'],
      },
      流动资产表: {
        type: 'multi',
        sheetKey: 'sheet_cashInv1a',
        rowPrefix: 'CI',
        fields: ['资产类别', '资产名称/账户', '数量|均价', '总市值|浮盈亏', '月收益', '平台/备注'],
      },
      资产总览表: {
        type: 'single',
        sheetKey: 'sheet_assetOVW0',
        rowPrefix: 'AO',
        fields: ['快照时间', '流动资产', '不动产', '企业/IP资产', '总负债', '净资产', '个人现金账户', '个人月净收入', '本轮变动摘要'],
      },
      藏品载具表: {
        type: 'multi',
        sheetKey: 'sheet_luxuryAssets',
        rowPrefix: 'LA',
        fields: ['藏品名称', '类别', '品牌|型号|规格', '估值|购入成本', '存放地点', '月维护成本', '使用状态', '特殊配置', '购入日期'],
      },
      业务板块表: {
        type: 'multi',
        sheetKey: 'sheet_bizSegments',
        rowPrefix: 'BS',
        fields: ['板块名称', '核心业务', '负责人', '法律实体|持股比例', '上市状态', '月净利', '估值', '经营状态', '近期动态', '战略方向', '人员结构', '旗下资产'],
      },
      负债清单表: {
        type: 'multi',
        sheetKey: 'sheet_dbt4Lst4',
        rowPrefix: 'DB',
        fields: ['方向', '对方名称', '款项类型', '原始额|剩余额', '年利率|月还款', '到期日', '担保物', '状态'],
      },
    };
  },

  coerceCell(value) {
    if (value === null || value === undefined) return '';
    return String(value);
  },

  matrixToSemanticRows(content, fields, type) {
    if (!Array.isArray(content) || content.length === 0) return type === 'single' ? {} : [];
    const rows = content.slice(1).map((row) => {
      const obj = {};
      for (let i = 0; i < fields.length; i += 1) {
        obj[fields[i]] = this.coerceCell(Array.isArray(row) ? row[i + 1] : '');
      }
      return obj;
    });
    if (type === 'single') return rows[0] || {};
    return rows;
  },

  semanticRowsToMatrix(rows, fields, type, rowPrefix = 'ROW') {
    const header = [null, ...fields];
    if (type === 'single') {
      const source = rows && typeof rows === 'object' && !Array.isArray(rows) ? rows : {};
      const dataRow = [`${rowPrefix}.1`, ...fields.map((field) => this.coerceCell(source[field]))];
      return [header, dataRow];
    }

    const arr = Array.isArray(rows) ? rows : [];
    const dataRows = arr.map((item, index) => [
      `${rowPrefix}.${index + 1}`,
      ...fields.map((field) => this.coerceCell(item?.[field])),
    ]);
    return [header, ...dataRows];
  },

  normalizeSemanticRowObject(sourceRow, fields, auditLogs, tableName) {
    const row = sourceRow && typeof sourceRow === 'object' && !Array.isArray(sourceRow) ? sourceRow : {};
    const normalized = {};
    for (const field of fields) normalized[field] = this.coerceCell(row[field]);

    for (const key of Object.keys(row)) {
      if (!fields.includes(key)) auditLogs.push(`已丢弃未知字段: ${tableName}.${key}`);
    }

    return normalized;
  },

  normalizeSemanticTable(source, schema, tableName, auditLogs) {
    if (schema.type === 'single') {
      const row = Array.isArray(source) ? (source[0] || {}) : source;
      return this.normalizeSemanticRowObject(row, schema.fields, auditLogs, tableName);
    }

    const rows = Array.isArray(source) ? source : [];
    return rows.map((row) => this.normalizeSemanticRowObject(row, schema.fields, auditLogs, tableName));
  },

  buildSemanticAssetsFromFloorData(floorData) {
    const schemaMap = this.getSemanticTableMap();
    const out = {};
    for (const [tableName, schema] of Object.entries(schemaMap)) {
      const content = floorData?.[schema.sheetKey]?.content;
      out[tableName] = this.matrixToSemanticRows(content, schema.fields, schema.type);
    }
    return out;
  },

  buildFloorDataFromSemanticAssets(semanticAssets) {
    const schemaMap = this.getSemanticTableMap();
    const out = {};
    for (const [tableName, schema] of Object.entries(schemaMap)) {
      out[schema.sheetKey] = {
        content: this.semanticRowsToMatrix(
          semanticAssets?.[tableName],
          schema.fields,
          schema.type,
          schema.rowPrefix,
        ),
      };
    }
    return out;
  },

  normalizeBizsimAssetsPayload(input) {
    const schemaMap = this.getSemanticTableMap();
    const auditLogs = [];
    const out = {};

    const base = input && typeof input === 'object' ? input : {};

    for (const [tableName, schema] of Object.entries(schemaMap)) {
      let source = base[tableName];

      if (source && typeof source === 'object' && Array.isArray(source.content)) {
        source = this.matrixToSemanticRows(source.content, schema.fields, schema.type);
      }

      out[tableName] = this.normalizeSemanticTable(source, schema, tableName, auditLogs);
    }

    this.lastSchemaAuditLogs = auditLogs;
    return out;
  },

  getSemanticTableNameBySheetKey(sheetKey) {
    const map = this.getSemanticTableMap();
    for (const [tableName, schema] of Object.entries(map)) {
      if (schema.sheetKey === sheetKey) return tableName;
    }
    return '';
  },

  getSemanticTableBySheetKey(sheetKey) {
    const tableName = this.getSemanticTableNameBySheetKey(sheetKey);
    if (!tableName) return null;

    const schema = this.getSemanticTableMap()[tableName];
    const assets = this.getCurrentFloorSemanticAssets();
    const tableData = assets?.[tableName];
    if (!tableData) return null;

    return { tableName, type: schema.type, fields: schema.fields, rows: tableData };
  },

  getCurrentFloorSemanticAssets() {
    const messageId = getCurrentMessageIdSafe();
    if (messageId === null || messageId === undefined) return null;
    const variables = getMessageVariablesSafe(messageId);
    if (!variables) return null;
    const scoped = this.resolveFloorStatDataSource(variables);
    if (!scoped) return null;
    const statData = this.extractAssetStatPayload(scoped);
    return statData || null;
  },

  isFloorSnapshotEqual(left, right) {
    if (!left || !right) return false;
    try {
      const leftText = JSON.stringify({ assets: left.assetsData || null, world: left.worldData || null });
      const rightText = JSON.stringify({ assets: right.assetsData || null, world: right.worldData || null });
      return leftText === rightText;
    } catch {
      return false;
    }
  },

  getFloorSnapshotAt(messageId) {
    if (messageId === null || messageId === undefined) return null;
    const variables = getMessageVariablesSafe(messageId);
    if (!variables) return null;
    const scoped = this.resolveFloorStatDataSource(variables);
    if (!scoped) return null;

    const assetsData = this.extractAssetStatPayload(scoped);
    const worldData = this.extractWorldSimulationPayload(scoped);
    if (!assetsData && !worldData) return null;

    return {
      messageId,
      assetsData: assetsData || null,
      worldData: worldData || null,
    };
  },

  getRecentChangedFloorSnapshot(maxLookback = 10) {
    const currentMessageId = getCurrentMessageIdSafe();
    if (currentMessageId === null || currentMessageId === undefined || currentMessageId < 0) {
      return {
        hasData: false,
        sourceMessageId: null,
        floorOffset: null,
        isLatest: false,
        snapshot: null,
      };
    }

    const windowSize = Math.max(1, Number(maxLookback) || 10);
    const startMessageId = Math.max(0, currentMessageId - windowSize + 1);
    const snapshots = [];

    for (let messageId = startMessageId; messageId <= currentMessageId; messageId += 1) {
      const snapshot = this.getFloorSnapshotAt(messageId);
      if (!snapshot) continue;
      snapshots.push(snapshot);
    }

    if (!snapshots.length) {
      return {
        hasData: false,
        sourceMessageId: null,
        floorOffset: null,
        isLatest: false,
        snapshot: null,
      };
    }

    let chosen = snapshots[0];
    for (let i = 0; i < snapshots.length; i += 1) {
      const current = snapshots[i];
      const previous = snapshots[i - 1];
      if (!previous || !this.isFloorSnapshotEqual(previous, current)) {
        chosen = current;
      }
    }

    const floorOffset = currentMessageId - chosen.messageId;
    return {
      hasData: true,
      sourceMessageId: chosen.messageId,
      floorOffset,
      isLatest: floorOffset === 0,
      snapshot: chosen,
    };
  },

  getRecentChangedFloorSnapshotForMessage(messageId, maxLookback = 10) {
    const targetMessageId = Number.isInteger(messageId) ? messageId : Number.parseInt(messageId, 10);
    if (!Number.isInteger(targetMessageId) || targetMessageId < 0) {
      return {
        hasData: false,
        sourceMessageId: null,
        floorOffset: null,
        isLatest: false,
        snapshot: null,
      };
    }

    const windowSize = Math.max(1, Number(maxLookback) || 10);
    const startMessageId = Math.max(0, targetMessageId - windowSize + 1);
    const snapshots = [];

    for (let cursor = startMessageId; cursor <= targetMessageId; cursor += 1) {
      const snapshot = this.getFloorSnapshotAt(cursor);
      if (!snapshot) continue;
      snapshots.push(snapshot);
    }

    if (!snapshots.length) {
      return {
        hasData: false,
        sourceMessageId: null,
        floorOffset: null,
        isLatest: false,
        snapshot: null,
      };
    }

    let chosen = snapshots[0];
    for (let i = 0; i < snapshots.length; i += 1) {
      const current = snapshots[i];
      const previous = snapshots[i - 1];
      if (!previous || !this.isFloorSnapshotEqual(previous, current)) {
        chosen = current;
      }
    }

    const floorOffset = targetMessageId - chosen.messageId;
    return {
      hasData: true,
      sourceMessageId: chosen.messageId,
      floorOffset,
      isLatest: floorOffset === 0,
      snapshot: chosen,
    };
  },

  buildInjectionMetaLines(snapshotInfo, currentMessageId) {
    const sourceFloor = snapshotInfo?.sourceMessageId;
    const safeCurrentFloor = Number.isInteger(currentMessageId) ? currentMessageId : Number.parseInt(currentMessageId, 10);
    const isLatest = !!snapshotInfo?.isLatest;
    const staleBy = Number.isInteger(snapshotInfo?.floorOffset) ? snapshotInfo.floorOffset : '';
    const actionHint = isLatest ? '数据已是最新' : '点击推演生成最新数据';

    return [
      `source_floor:${sourceFloor ?? ''}`,
      `current_floor:${Number.isInteger(safeCurrentFloor) ? safeCurrentFloor : ''}`,
      `is_latest:${isLatest ? 'true' : 'false'}`,
      `stale_by:${staleBy}`,
      `action_hint:${actionHint}`,
    ];
  },

  buildWorldStateInjectionBlockForMessage(messageId, maxLookback = 10) {
    const snapshotInfo = this.getRecentChangedFloorSnapshotForMessage(messageId, maxLookback);
    const worldSimulation = snapshotInfo?.snapshot?.worldData;
    if (!worldSimulation || !Array.isArray(worldSimulation.tracks) || !worldSimulation.tracks.length) return '';

    const lines = [];
    lines.push('<bz_world_state>');
    lines.push(...this.buildInjectionMetaLines(snapshotInfo, messageId));

    for (const track of worldSimulation.tracks) {
      const key = String(track?.characterName || '未知视角').replace(/"/g, '&quot;');
      lines.push(`<bg_track key="${key}">`);
      lines.push(`${String(track?.id || 'BG.?')}[${String(track?.characterName || '未知视角')}][${String(track?.status || '推演中')}][${Number(track?.iteration) || 1}]`);
      lines.push(`推演次数:${Number(track?.iteration) || 1}`);
      lines.push(`时间同步:${String(track?.timeSync || '')}`);
      lines.push(`地点:${String(track?.location || '')}`);
      lines.push(`视角进度:${String(track?.progress || '')}`);
      lines.push(`概括:${String(track?.summary || '')}`);
      lines.push('</bg_track>');
    }

    const checks = worldSimulation?.checks || {};
    lines.push('<bg_check>');
    lines.push(`推演检查:${checks.allTracksAdvanced ? '通过' : '未通过'}`);
    lines.push(`汇入检查:${checks.convergenceChecked ? '通过' : '未通过'}`);
    lines.push(`新增检查:${checks.newTracksAdded ? '通过' : '未通过'}`);
    lines.push('</bg_check>');
    lines.push('</bz_world_state>');

    return lines.join('\n');
  },

  getAssetTableCheckStatus(semanticAssets) {
    const validation = this.validateSemanticAssetConstraints(semanticAssets || {});
    return validation?.valid ? '通过' : '未通过';
  },

  buildAssetSheetInjectionBlockForMessage(messageId, maxLookback = 10) {
    const snapshotInfo = this.getRecentChangedFloorSnapshotForMessage(messageId, maxLookback);
    const semanticAssets = snapshotInfo?.snapshot?.assetsData;
    if (!semanticAssets || typeof semanticAssets !== 'object') return '';

    const schemaMap = this.getSemanticTableMap();
    const lines = [];
    lines.push('<bz_asset_sheet>');
    lines.push(...this.buildInjectionMetaLines(snapshotInfo, messageId));

    for (const [tableName, schema] of Object.entries(schemaMap)) {
      const rows = semanticAssets[tableName];
      lines.push(`<asset_table key="${String(tableName).replace(/"/g, '&quot;')}">`);

      if (schema.type === 'single') {
        for (const field of schema.fields) {
          lines.push(`${field}:${this.coerceCell(rows?.[field])}`);
        }
      } else {
        const rowList = Array.isArray(rows) ? rows : [];
        if (!rowList.length) {
          lines.push('empty:true');
        }
        for (let i = 0; i < rowList.length; i += 1) {
          lines.push(`row:${i + 1}`);
          for (const field of schema.fields) {
            lines.push(`${field}:${this.coerceCell(rowList[i]?.[field])}`);
          }
        }
      }

      lines.push('</asset_table>');
    }

    lines.push('<asset_check>');
    lines.push(`资产检查:${this.getAssetTableCheckStatus(semanticAssets)}`);
    lines.push(`最新检查:${snapshotInfo?.isLatest ? '通过' : '未通过'}`);
    lines.push('</asset_check>');
    lines.push('</bz_asset_sheet>');

    return lines.join('\n');
  },

  getDisplaySemanticTableBySheetKey(sheetKey, maxLookback = 10) {
    const snapshotInfo = this.getRecentChangedFloorSnapshot(maxLookback);
    if (!snapshotInfo?.hasData || !snapshotInfo?.snapshot?.assetsData) {
      return { table: null, snapshotInfo };
    }

    const tableName = this.getSemanticTableNameBySheetKey(sheetKey);
    if (!tableName) return { table: null, snapshotInfo };

    const schema = this.getSemanticTableMap()[tableName];
    const tableData = snapshotInfo.snapshot.assetsData?.[tableName];
    if (!tableData) return { table: null, snapshotInfo };

    return {
      table: {
        tableName,
        type: schema.type,
        fields: schema.fields,
        rows: tableData,
      },
      snapshotInfo,
    };
  },

  getDisplayWorldSimulation(maxLookback = 10) {
    const snapshotInfo = this.getRecentChangedFloorSnapshot(maxLookback);
    const worldSimulation = snapshotInfo?.snapshot?.worldData || null;
    return { worldSimulation, snapshotInfo };
  },

  validateSemanticAssetConstraints(semanticAssets) {
    const issues = [];
    try {
      const overview = semanticAssets?.资产总览表 || {};
      const liquidRows = Array.isArray(semanticAssets?.流动资产表) ? semanticAssets.流动资产表 : [];
      const segments = Array.isArray(semanticAssets?.业务板块表) ? semanticAssets.业务板块表 : [];

      let liquidTotal = 0;
      for (const row of liquidRows) {
        const amount = this.parseAmountToWan?.(row?.['总市值|浮盈亏']);
        if (!Number.isNaN(amount)) liquidTotal += amount;
      }

      let enterpriseTotal = 0;
      for (const row of segments) {
        const holdingText = String(row?.['法律实体|持股比例'] || '');
        const value = this.parseAmountToWan?.(row?.估值);
        const holdingMatch = holdingText.match(/(\d+(?:\.\d+)?)\s*%/);
        if (holdingMatch && !Number.isNaN(value)) {
          enterpriseTotal += value * (Number.parseFloat(holdingMatch[1]) / 100);
        }
      }

      const liquidOverview = this.parseAmountToWan?.(overview.流动资产);
      if (!Number.isNaN(liquidOverview)) {
        const diff = Math.abs(liquidOverview - liquidTotal);
        const tolerance = Number(this.config.AUDIT?.cashToleranceWan) || 1;
        if (diff > tolerance) issues.push(`流动资产不一致: 总览=${liquidOverview.toFixed(2)}万, 流动资产表合计=${liquidTotal.toFixed(2)}万`);
      }

      const enterpriseOverview = this.parseAmountToWan?.(overview['企业/IP资产']);
      if (!Number.isNaN(enterpriseOverview)) {
        const diff = Math.abs(enterpriseOverview - enterpriseTotal);
        const tolerance = Number(this.config.AUDIT?.enterpriseToleranceWan) || 1;
        if (diff > tolerance) issues.push(`企业/IP资产不一致: 总览=${enterpriseOverview.toFixed(2)}万, 板块估值持股合计=${enterpriseTotal.toFixed(2)}万`);
      }

      return { valid: issues.length === 0, issues };
    } catch (error) {
      return { valid: false, issues: [error.message] };
    }
  },

  repairSemanticAssetSummaryFields(semanticAssets) {
    const repaired = deepClone(semanticAssets || {});
    const notes = [];

    if (!repaired || typeof repaired !== 'object') return { semanticAssets: semanticAssets || {}, notes };

    const overview = repaired['资产总览表'] && typeof repaired['资产总览表'] === 'object' && !Array.isArray(repaired['资产总览表'])
      ? repaired['资产总览表']
      : {};
    repaired['资产总览表'] = overview;

    const liquidRows = Array.isArray(repaired['流动资产表']) ? repaired['流动资产表'] : [];
    const segmentRows = Array.isArray(repaired['业务板块表']) ? repaired['业务板块表'] : [];

    let liquidTotal = 0;
    for (const row of liquidRows) {
      const amount = this.parseAmountToWan?.(row?.['总市值|浮盈亏']);
      if (!Number.isNaN(amount)) liquidTotal += amount;
    }

    let enterpriseTotal = 0;
    for (const row of segmentRows) {
      const holdingText = String(row?.['法律实体|持股比例'] || '');
      const value = this.parseAmountToWan?.(row?.估值);
      const holdingMatch = holdingText.match(/(\d+(?:\.\d+)?)\s*%/);
      if (holdingMatch && !Number.isNaN(value)) {
        enterpriseTotal += value * (Number.parseFloat(holdingMatch[1]) / 100);
      }
    }

    if (Number.isFinite(liquidTotal)) {
      overview.流动资产 = `${liquidTotal.toFixed(2)}万`;
      notes.push(`自动修正[资产总览表.流动资产]为 ${liquidTotal.toFixed(2)}万`);
    }

    if (Number.isFinite(enterpriseTotal)) {
      overview['企业/IP资产'] = `${enterpriseTotal.toFixed(2)}万`;
      notes.push(`自动修正[资产总览表.企业/IP资产]为 ${enterpriseTotal.toFixed(2)}万`);
    }

    return { semanticAssets: repaired, notes };
  },

  getSimulationModeNote() {
    const mode = String(this.config.SIMULATION?.mode || 'balanced');
    const profiles = {
      strict: '严格模式：优先保证 JSON、结构完整和审计一致性，减少发散，降低新视角波动。',
      balanced: '平衡模式：在结构稳定与叙事发散之间保持均衡，默认推荐。',
      creative: '发散模式：允许更强的新视角生成与剧情分歧，但仍必须遵守 JSON 和审计约束。',
    };
    return profiles[mode] || profiles.balanced;
  },

  getDefaultWorldbookName() {
    const explicit = String(this.config.SIMULATION?.worldbookName || '').trim();
    if (explicit) return explicit;

    const currentCharWorldbook = getCurrentCharPrimaryWorldbookSafe();
    if (currentCharWorldbook) return currentCharWorldbook;

    const currentChatWorldbook = getChatWorldbookNameSafe('current');
    if (currentChatWorldbook) return currentChatWorldbook;

    const active = this.getActiveWorldbookNames();
    return active[0] || '';
  },

  parseSelectedEntryUids() {
    const rawSelection = String(this.config.SIMULATION?.worldbookSelectedUids || '').trim();
    if (rawSelection === '__NONE__') return [];

    return this.normalizeCommaList(rawSelection)
      .map((value) => String(value).trim())
      .filter(Boolean);
  },

  stripText(text, limit = 1200) {
    const normalized = String(text ?? '').trim();
    if (!normalized) return '';
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit)}...`;
  },

  normalizeCommaList(text) {
    return String(text || '')
      .split(/[\n,，;；]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  },

  toPrettyJson(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  },

  resolveFloorStatDataSource(variables) {
    if (!variables || typeof variables !== 'object') return null;
    if (variables.stat_data && typeof variables.stat_data === 'object') return variables.stat_data;
    return null;
  },

  extractAssetStatPayload(statData) {
    if (!statData || typeof statData !== 'object') return null;

    const { assetsKey } = this.getFloorNamespaceKeys();
    const extracted = statData[assetsKey];
    if (!extracted || typeof extracted !== 'object') return null;
    return this.normalizeBizsimAssetsPayload(extracted);
  },

  extractWorldSimulationPayload(statData) {
    if (!statData || typeof statData !== 'object') return null;

    const { worldStateKey } = this.getFloorNamespaceKeys();
    const extracted = statData[worldStateKey];
    if (!extracted || typeof extracted !== 'object') return null;
    return deepClone(extracted);
  },

  getActiveWorldbookNames() {
    const names = new Set();
    for (const name of this.normalizeCommaList(this.config.SIMULATION?.worldbookNames)) {
      names.add(name);
    }

    if (this.config.SIMULATION?.useActiveWorldbooks !== false && names.size === 0) {
      for (const name of getWorldbookNamesSafe() || []) names.add(name);
      const globalNames = getGlobalWorldbookNamesSafe() || [];
      for (const name of globalNames) names.add(name);
      const charWorldbooks = getCharWorldbookNamesSafe('current') || {};
      if (charWorldbooks.primary) names.add(charWorldbooks.primary);
      for (const name of charWorldbooks.additional || []) names.add(name);
      const chatWorldbook = getChatWorldbookNameSafe('current');
      if (chatWorldbook) names.add(chatWorldbook);
    }

    return [...names].filter(Boolean);
  },

  parseWorldbookSelectors() {
    const selectors = new Map();
    const lines = this.normalizeCommaList(this.config.SIMULATION?.worldbookEntrySelectors);

    for (const line of lines) {
      const [rawBookName, rawSelector] = line.split('::');
      const bookName = (rawBookName || '').trim();
      if (!bookName) continue;
      const selector = (rawSelector || '*').trim() || '*';
      if (!selectors.has(bookName)) selectors.set(bookName, []);
      selectors.get(bookName).push(selector);
    }

    return selectors;
  },

  buildSelectedUidSet() {
    return new Set(this.parseSelectedEntryUids());
  },

  matchWorldbookEntry(entry, selectors) {
    if (!selectors || selectors.length === 0) return true;
    const normalizedName = String(entry?.name || entry?.comment || '').trim();
    const normalizedUid = String(entry?.uid ?? '');

    return selectors.some((selector) => {
      const text = String(selector || '').trim();
      if (!text || text === '*' || text.toLowerCase() === 'all') return true;
      if (/^uid\s*[:=]/i.test(text)) {
        const ids = text.replace(/^uid\s*[:=]/i, '').split(/[\s,，|]+/).map((item) => item.trim()).filter(Boolean);
        return ids.includes(normalizedUid);
      }
      const parts = text.split(/[\s,，|]+/).map((item) => item.trim()).filter(Boolean);
      if (!parts.length) return false;
      return parts.some((part) => normalizedName.includes(part));
    });
  },

  async buildWorldbookContext() {
    const rawSelection = String(this.config.SIMULATION?.worldbookSelectedUids || '').trim();
    if (rawSelection === '__NONE__') return '';

    const selectedWorldbook = this.getDefaultWorldbookName();
    const worldbookNames = selectedWorldbook ? [selectedWorldbook] : this.getActiveWorldbookNames();
    if (!worldbookNames.length) return '';

    const selectorsMap = this.parseWorldbookSelectors();
    const selectedUidSet = this.buildSelectedUidSet();
    const entryLimit = Math.max(1, Number(this.config.SIMULATION?.worldbookEntryLimit) || 12);
    const sections = [];

    for (const worldbookName of worldbookNames) {
      const entries = await getWorldbookSafe(worldbookName);
      if (!Array.isArray(entries) || !entries.length) continue;

      const selectors = selectorsMap.get(worldbookName) || [];
      const matchedEntries = entries.filter((entry) => {
        if (entry?.enabled === false) return false;
        if (selectedUidSet.size > 0) return selectedUidSet.has(String(entry?.uid ?? ''));
        return this.matchWorldbookEntry(entry, selectors);
      });
      if (!matchedEntries.length) continue;

      const limitedEntries = matchedEntries.slice(0, entryLimit);
      const entryText = limitedEntries.map((entry) => {
        const meta = `uid=${entry.uid}${entry.position?.type ? `, position=${entry.position.type}` : ''}`;
        return `- ${entry.name || entry.comment || '未命名条目'} (${meta})\n${this.stripText(entry.content, 1400)}`;
      }).join('\n\n');

      sections.push(`【世界书：${worldbookName}】\n${entryText}`);
    }

    if (!sections.length) return '';
    return sections.join('\n\n');
  },

  buildFloorVariableContext(limit, title, kind = 'both') {
    const lastMessageId = getLastMessageIdSafe();
    if (lastMessageId === null || lastMessageId === undefined || lastMessageId < 0) return '';

    const windowSize = Math.max(1, Number(limit) || 10);
    const historyEndMessageId = lastMessageId - 1;
    if (historyEndMessageId < 0) return '';

    const startMessageId = Math.max(0, historyEndMessageId - windowSize + 1);
    const currentMessageId = getCurrentMessageIdSafe();

    // 第一轮：逆序遍历收集所有已汇入的视角ID
    // 这样可以从最新楼层向后扫描，确保一旦某个视角在任何楼层被标记为已汇入
    // 它的ID就会被记录，用于过滤所有更早楼层的历史数据
    const convergedTrackIds = new Set();
    for (let messageId = historyEndMessageId; messageId >= startMessageId; messageId -= 1) {
      if (currentMessageId !== null && currentMessageId !== undefined && messageId === currentMessageId) continue;

      const variables = getMessageVariablesSafe(messageId);
      if (!variables) continue;

      const scoped = this.resolveFloorStatDataSource(variables);
      if (!scoped) continue;
      const worldData = this.extractWorldSimulationPayload(scoped);

      // 收集本楼层中已汇入的视角ID
      if (worldData?.tracks?.length > 0) {
        for (const track of worldData.tracks) {
          if (track.status === '已汇入' && track.id) {
            convergedTrackIds.add(track.id);
          }
        }
      }
    }

    // 第二轮：正序遍历构建输出，过滤掉已汇入的视角
    const blocks = [];
    for (let messageId = startMessageId; messageId <= historyEndMessageId; messageId += 1) {
      if (currentMessageId !== null && currentMessageId !== undefined && messageId === currentMessageId) continue;

      const variables = getMessageVariablesSafe(messageId);
      if (!variables) continue;

      const scoped = this.resolveFloorStatDataSource(variables);
      if (!scoped) continue;
      const statData = this.extractAssetStatPayload(scoped);
      const worldData = this.extractWorldSimulationPayload(scoped);
      if (!statData && !worldData) continue;

      // 过滤 worldData 中的 tracks，移除所有已汇入的视角（包括在当前楼层之后才被标记为已汇入的）
      let filteredWorldData = worldData;
      if (worldData?.tracks?.length > 0) {
        const originalCount = worldData.tracks.length;
        const filteredTracks = worldData.tracks.filter((track) => !convergedTrackIds.has(track.id));

        if (filteredTracks.length !== originalCount) {
          // 创建新的 worldData 对象，避免修改原始数据
          filteredWorldData = {
            ...worldData,
            tracks: filteredTracks,
            // 更新 checks，移除已汇入视角相关的检查项
            checks: worldData.checks ? { ...worldData.checks } : undefined,
          };
        }
      }

      blocks.push({ message_id: messageId, stat_data: statData, world_simulation: filteredWorldData });
    }

    if (!blocks.length) return '';

    return blocks.map((block) => {
      const parts = [`- 楼层 ${block.message_id}`];
      if (kind === 'both' || kind === 'stat') {
        if (block.stat_data) parts.push(`  - 资产统计: ${this.toPrettyJson(block.stat_data)}`);
      }
      if (kind === 'both' || kind === 'world') {
        if (block.world_simulation?.tracks?.length > 0) {
          parts.push(`  - 世界推演变量: ${this.toPrettyJson(block.world_simulation)}`);
        }
      }
      return parts.join('\n');
    }).join('\n');
  },

  validateAndNormalizeFloorJson(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return deepClone(value);
    if (typeof value !== 'string') return null;

    const parsed = this.parseJSONResult(value);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  },

  buildLatestFloorVariablesPayload(floorData, worldSimulation) {
    const normalizedFloorData = this.normalizeFloorData(floorData);
    const normalizedWorldSimulation = this.normalizeWorldSimulation(worldSimulation);
    const { assetsKey, worldStateKey } = this.getFloorNamespaceKeys();
    const semanticAssets = this.normalizeBizsimAssetsPayload(this.buildSemanticAssetsFromFloorData(normalizedFloorData));

    return {
      stat_data: {
        [assetsKey]: semanticAssets,
        [worldStateKey]: normalizedWorldSimulation,
      },
    };
  },

  async syncLatestFloorVariables(floorData, worldSimulation) {
    const messageId = getCurrentMessageIdSafe();
    if (messageId === null || messageId === undefined) return false;

    const currentVariables = getMessageVariablesSafe(messageId);
    const currentScoped = this.resolveFloorStatDataSource(currentVariables);
    const hadExistingFloorData = !!(
      this.extractAssetStatPayload(currentScoped)
      || this.extractWorldSimulationPayload(currentScoped)
    );

    const normalizedFloorData = this.validateAndNormalizeFloorJson(floorData);
    const normalizedWorldSimulation = this.validateAndNormalizeFloorJson(worldSimulation);
    if (!normalizedFloorData || !normalizedWorldSimulation) {
      return { success: false, errors: ['楼层变量输入不是合法 JSON 对象'] };
    }

    try {
      let semanticAssets = this.normalizeBizsimAssetsPayload(this.buildSemanticAssetsFromFloorData(normalizedFloorData));
      let semanticValidation = this.validateSemanticAssetConstraints(semanticAssets);
      const autoRepairNotes = [];
      if (!semanticValidation.valid) {
        const repaired = this.repairSemanticAssetSummaryFields(semanticAssets);
        semanticAssets = repaired.semanticAssets;
        if (Array.isArray(repaired.notes) && repaired.notes.length) autoRepairNotes.push(...repaired.notes);
        semanticValidation = this.validateSemanticAssetConstraints(semanticAssets);
      }
      if (!semanticValidation.valid) {
        return { success: false, errors: semanticValidation.issues };
      }

      const normalizedEmpireFromSemantic = this.buildFloorDataFromSemanticAssets(semanticAssets);
      const payload = this.buildLatestFloorVariablesPayload(normalizedFloorData, normalizedWorldSimulation);
      insertOrAssignVariablesSafe(payload, { type: 'message', message_id: messageId });
      return {
        success: true,
        errors: [],
        messageId,
        replacedExisting: hadExistingFloorData,
        normalizedFloorData: normalizedEmpireFromSemantic,
        normalizedWorldSimulation: this.normalizeWorldSimulation(normalizedWorldSimulation),
        schemaAuditLogs: [
          ...(Array.isArray(this.lastSchemaAuditLogs) ? this.lastSchemaAuditLogs : []),
          ...autoRepairNotes,
        ],
      };
    } catch (error) {
      console.error('[BizSim] 同步楼层变量失败:', error);
      return { success: false, errors: [error.message] };
    }
  },

  getCurrentFloorStatDataContext() {
    const messageId = getCurrentMessageIdSafe();
    const variables = getMessageVariablesSafe(messageId);
    const scoped = this.resolveFloorStatDataSource(variables);
    const statData = scoped ? this.extractAssetStatPayload(scoped) : null;
    return { messageId, statData };
  },

  getHistoricalFloorStatDataContext(limit = 10) {
    const lastMessageId = getLastMessageIdSafe();
    if (lastMessageId === null || lastMessageId === undefined || lastMessageId < 0) return [];

    const historyEndMessageId = lastMessageId - 1;
    if (historyEndMessageId < 0) return [];

    const windowSize = Math.max(1, Number(limit) || 10);
    const startMessageId = Math.max(0, historyEndMessageId - windowSize + 1);
    const currentMessageId = getCurrentMessageIdSafe();
    const history = [];

    for (let messageId = startMessageId; messageId <= historyEndMessageId; messageId += 1) {
      if (currentMessageId !== null && currentMessageId !== undefined && messageId === currentMessageId) continue;
      const variables = getMessageVariablesSafe(messageId);
      const scoped = this.resolveFloorStatDataSource(variables);
      const statData = scoped ? this.extractAssetStatPayload(scoped) : null;
      if (!statData) continue;
      history.push({ message_id: messageId, stat_data: statData });
    }

    return history;
  },
};
