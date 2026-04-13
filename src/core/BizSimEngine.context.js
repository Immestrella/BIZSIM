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
import { deepClone, getByPath } from '../utils/object.js';

export const BIZSIM_ENGINE_CONTEXT_METHODS = {
  getFloorNamespaceKeys() {
    const fallback = { assetsKey: 'bizsim_assets', worldStateKey: 'bizsim_world_state' };
    const configured = this.config?.FLOOR_NAMESPACE || {};
    return {
      assetsKey: String(configured.assetsKey || fallback.assetsKey),
      worldStateKey: String(configured.worldStateKey || fallback.worldStateKey),
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

  getLegacyTableAliases() {
    return {
      集团架构表: ['业务结构'],
      固定资产表: ['不动产'],
      流动资产表: ['流动资产'],
      资产总览表: ['资产总览'],
      藏品载具表: ['奢侈资产', '奢侈品'],
      业务板块表: ['业务板块'],
      负债清单表: ['债务清单', '债务'],
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

  buildSemanticAssetsFromEmpireData(empireData) {
    const schemaMap = this.getSemanticTableMap();
    const out = {};
    for (const [tableName, schema] of Object.entries(schemaMap)) {
      const content = empireData?.[schema.sheetKey]?.content;
      out[tableName] = this.matrixToSemanticRows(content, schema.fields, schema.type);
    }
    return out;
  },

  buildEmpireDataFromSemanticAssets(semanticAssets) {
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
    const aliases = this.getLegacyTableAliases();
    const auditLogs = [];
    const out = {};

    const base = input && typeof input === 'object' ? input : {};
    const tablesFromLegacy = base.资产表格 && typeof base.资产表格 === 'object' ? base.资产表格 : {};
    const dynamicFromLegacy = base.资产动态 && typeof base.资产动态 === 'object' ? base.资产动态 : base;

    for (const [tableName, schema] of Object.entries(schemaMap)) {
      let source = base[tableName];

      if (source === undefined) {
        for (const alias of aliases[tableName] || []) {
          if (base[alias] !== undefined) {
            source = base[alias];
            break;
          }
        }
      }

      if (source === undefined) {
        for (const alias of aliases[tableName] || []) {
          if (tablesFromLegacy[alias] !== undefined) {
            source = tablesFromLegacy[alias];
            break;
          }
        }
      }

      if (source && typeof source === 'object' && Array.isArray(source.content)) {
        source = this.matrixToSemanticRows(source.content, schema.fields, schema.type);
      }

      if (source === undefined && dynamicFromLegacy?.[schema.sheetKey]?.content) {
        source = this.matrixToSemanticRows(dynamicFromLegacy[schema.sheetKey].content, schema.fields, schema.type);
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

    const { assetsKey, worldStateKey } = this.getFloorNamespaceKeys();
    const hasDirectScopedKeys = [
      assetsKey,
      worldStateKey,
      'world_simulation',
      'worldSimulation',
      '世界推演',
      '资产动态',
      '资产统计',
      '资产表格',
    ].some((key) => key in variables);

    return hasDirectScopedKeys ? variables : null;
  },

  hasSemanticAssetTableShape(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
    const tableNames = Object.keys(this.getSemanticTableMap());
    return tableNames.some((tableName) => source[tableName] !== undefined);
  },

  extractObjectByPaths(source, paths) {
    if (!source || typeof source !== 'object') return null;
    for (const path of paths) {
      const value = getByPath(source, path);
      if (value && typeof value === 'object') return deepClone(value);
    }
    return null;
  },

  extractAssetStatPayload(statData) {
    if (!statData || typeof statData !== 'object') return null;

    const { assetsKey } = this.getFloorNamespaceKeys();

    if (this.hasSemanticAssetTableShape(statData)) {
      return this.normalizeBizsimAssetsPayload(statData);
    }

    const extracted = this.extractObjectByPaths(statData, [
      assetsKey,
      `${assetsKey}.资产动态`,
      '资产动态',
      '资产表格',
      '资产统计',
      'assets',
      'asset_stats',
    ]);

    if (!extracted) return null;
    return this.normalizeBizsimAssetsPayload(extracted);
  },

  extractWorldSimulationPayload(statData) {
    if (!statData || typeof statData !== 'object') return null;

    const { worldStateKey } = this.getFloorNamespaceKeys();

    if (Array.isArray(statData?.tracks) && statData?.checks && typeof statData.checks === 'object') {
      return deepClone(statData);
    }

    const extracted = this.extractObjectByPaths(statData, [
      worldStateKey,
      '世界推演',
      'worldSimulation',
      'world_simulation',
    ]);

    if (extracted) return extracted;
    return null;
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
    const startMessageId = Math.max(0, lastMessageId - windowSize + 1);
    const currentMessageId = getCurrentMessageIdSafe();

    // 第一轮：逆序遍历收集所有已汇入的视角ID
    // 这样可以从最新楼层向后扫描，确保一旦某个视角在任何楼层被标记为已汇入
    // 它的ID就会被记录，用于过滤所有更早楼层的历史数据
    const convergedTrackIds = new Set();
    for (let messageId = lastMessageId; messageId >= startMessageId; messageId -= 1) {
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
    for (let messageId = startMessageId; messageId <= lastMessageId; messageId += 1) {
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

  buildCurrentFloorVariableContext() {
    const messageId = getCurrentMessageIdSafe();
    if (messageId === null || messageId === undefined) return '';

    const variables = getMessageVariablesSafe(messageId);
    if (!variables) return '';

    const scoped = this.resolveFloorStatDataSource(variables);
    if (!scoped) return '';
    const statData = this.extractAssetStatPayload(scoped);
    const worldData = this.extractWorldSimulationPayload(scoped);
    if (!statData && !worldData) return '';

    const { assetsKey, worldStateKey } = this.getFloorNamespaceKeys();

    return this.toPrettyJson({
      stat_data: {
        [assetsKey]: statData || {},
        [worldStateKey]: worldData || { tracks: [], checks: { allTracksAdvanced: false, convergenceChecked: false, newTracksAdded: false } },
      },
    });
  },

  buildCurrentFloorAssetStatJson() {
    const messageId = getCurrentMessageIdSafe();
    if (messageId === null || messageId === undefined) return '';
    const variables = getMessageVariablesSafe(messageId);
    if (!variables) return '';
    const scoped = this.resolveFloorStatDataSource(variables);
    if (!scoped) return '';
    const statData = this.extractAssetStatPayload(scoped);
    if (!statData) return '';
    return this.toPrettyJson(statData);
  },

  buildCurrentFloorWorldSimulationJson() {
    const messageId = getCurrentMessageIdSafe();
    if (messageId === null || messageId === undefined) return '';
    const variables = getMessageVariablesSafe(messageId);
    if (!variables) return '';
    const scoped = this.resolveFloorStatDataSource(variables);
    if (!scoped) return '';
    const worldData = this.extractWorldSimulationPayload(scoped);
    if (!worldData) return '';
    return this.toPrettyJson(worldData);
  },

  validateAndNormalizeFloorJson(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return deepClone(value);
    if (typeof value !== 'string') return null;

    const parsed = this.parseJSONResult(value);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  },

  buildLatestFloorVariablesPayload(empireData, worldSimulation) {
    const normalizedEmpireData = this.normalizeEmpireData(empireData);
    const normalizedWorldSimulation = this.normalizeWorldSimulation(worldSimulation);
    const { assetsKey, worldStateKey } = this.getFloorNamespaceKeys();
    const semanticAssets = this.normalizeBizsimAssetsPayload(this.buildSemanticAssetsFromEmpireData(normalizedEmpireData));

    return {
      stat_data: {
        [assetsKey]: semanticAssets,
        [worldStateKey]: normalizedWorldSimulation,
      },
    };
  },

  async syncLatestFloorVariables(empireData, worldSimulation) {
    const messageId = getCurrentMessageIdSafe();
    if (messageId === null || messageId === undefined) return false;

    const currentVariables = getMessageVariablesSafe(messageId);
    const currentScoped = this.resolveFloorStatDataSource(currentVariables);
    const hadExistingFloorData = !!(
      this.extractAssetStatPayload(currentScoped)
      || this.extractWorldSimulationPayload(currentScoped)
    );

    const normalizedEmpireData = this.validateAndNormalizeFloorJson(empireData);
    const normalizedWorldSimulation = this.validateAndNormalizeFloorJson(worldSimulation);
    if (!normalizedEmpireData || !normalizedWorldSimulation) {
      return { success: false, errors: ['楼层变量输入不是合法 JSON 对象'] };
    }

    try {
      let semanticAssets = this.normalizeBizsimAssetsPayload(this.buildSemanticAssetsFromEmpireData(normalizedEmpireData));
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

      const normalizedEmpireFromSemantic = this.buildEmpireDataFromSemanticAssets(semanticAssets);
      const payload = this.buildLatestFloorVariablesPayload(normalizedEmpireData, normalizedWorldSimulation);
      insertOrAssignVariablesSafe(payload, { type: 'message', message_id: messageId });
      return {
        success: true,
        errors: [],
        messageId,
        replacedExisting: hadExistingFloorData,
        normalizedEmpireData: normalizedEmpireFromSemantic,
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

    const windowSize = Math.max(1, Number(limit) || 10);
    const startMessageId = Math.max(0, lastMessageId - windowSize + 1);
    const currentMessageId = getCurrentMessageIdSafe();
    const history = [];

    for (let messageId = startMessageId; messageId <= lastMessageId; messageId += 1) {
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
