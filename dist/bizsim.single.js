// ---- src/utils/object.js ----
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---- src/utils/stCompat.js ----
function getSillyTavernGlobal() {
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

function getSafeDocument() {
  try {
    if (window.top && window.top.document) {
      const testNode = window.top.document.body;
      if (testNode) return window.top.document;
    }
  } catch {
  }
  return document;
}

async function showConfirm(message) {
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

function getButtonEventSafe(buttonName) {
  if (typeof getButtonEvent === 'function') return getButtonEvent(buttonName);
  return `bizsim_btn_${buttonName}`;
}

function eventOnSafe(event, callback) {
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

function getCharacterVariablesSafe() {
  return getVariables({ type: 'character' });
}

function insertOrAssignVariablesSafe(payload, options = { type: 'character' }) {
  return insertOrAssignVariables(payload, options);
}

function deleteVariableSafe(path, options = { type: 'character' }) {
  return deleteVariable(path, options);
}

function getChatHistorySafe(limit = 20) {
  try {
    const lastId = getLastMessageId();
    if (!lastId || lastId <= 0) return [];
    const start = Math.max(1, lastId - limit + 1);
    return getChatMessages(`${start}-${lastId}`);
  } catch {
    return [];
  }
}

function getLastMessageIdSafe() {
  try {
    if (typeof getLastMessageId === 'function') {
      return getLastMessageId();
    }
  } catch {
  }
  return null;
}

function getCurrentMessageIdSafe() {
  try {
    if (typeof getCurrentMessageId === 'function') {
      return getCurrentMessageId();
    }
  } catch {
  }
  return getLastMessageIdSafe();
}

function getMessageVariablesSafe(messageId) {
  try {
    if (typeof getVariables !== 'function' || messageId === null || messageId === undefined) {
      return null;
    }
    return getVariables({ type: 'message', message_id: messageId });
  } catch {
    return null;
  }
}

function getWorldbookNamesSafe() {
  try {
    if (typeof getWorldbookNames === 'function') return getWorldbookNames();
  } catch {
  }
  return [];
}

function getGlobalWorldbookNamesSafe() {
  try {
    if (typeof getGlobalWorldbookNames === 'function') return getGlobalWorldbookNames();
  } catch {
  }
  return [];
}

function getCharWorldbookNamesSafe(characterName = 'current') {
  try {
    if (typeof getCharWorldbookNames === 'function') return getCharWorldbookNames(characterName);
  } catch {
  }
  return { primary: null, additional: [] };
}

function getCurrentCharPrimaryWorldbookSafe() {
  const charWorldbooks = getCharWorldbookNamesSafe('current') || {};
  return charWorldbooks.primary || null;
}

function getChatWorldbookNameSafe(chatName = 'current') {
  try {
    if (typeof getChatWorldbookName === 'function') return getChatWorldbookName(chatName);
  } catch {
  }
  return null;
}

function getChatMessageByIdSafe(messageId) {
  try {
    if (typeof getChatMessages !== 'function' || messageId === null || messageId === undefined) {
      return null;
    }
    const messages = getChatMessages(messageId);
    if (Array.isArray(messages) && messages.length > 0) return messages[0];
  } catch {
  }
  return null;
}

async function setChatMessageTextSafe(messageId, text, refresh = 'affected') {
  try {
    if (typeof setChatMessages !== 'function' || messageId === null || messageId === undefined) return false;
    await setChatMessages([{ message_id: messageId, message: String(text ?? '') }], { refresh });
    return true;
  } catch {
    return false;
  }
}

async function getWorldbookSafe(worldbookName) {
  try {
    if (typeof getWorldbook === 'function') return await getWorldbook(worldbookName);
  } catch {
  }
  return null;
}

// ---- src/config/constants.js ----
const BIZSIM_CONFIG = {
  NAME: 'BizSim',
  VERSION: '1.1.1-dev',
  VAR_PATH: 'bizsim',
  FLOOR_NAMESPACE: {
    assetsKey: 'bizsim_assets',
    worldStateKey: 'bizsim_world_state',
  },
  LLM: {
    apiUrl: 'http://127.0.0.1:3423/v1',
    apiKey: 'sk-YNyHpwu69NOkHhJUafrn17oo40ch3SSBGXaZs8uB87bWdGAf',
    persistApiKey: true,
    model: '公益-Gcli-gemini-3-flash-preview',
    temperature: 0.6,
    maxTokens: 88888,
    timeoutMs: 120000,
    forceJsonResponse: true,
    customHeaders: '{}',
  },
  SIMULATION: {
    minTracks: 3,
    maxTracks: 10,
    trackPrefix: 'BG',
    historyLimit: 10,
    assetHistoryFloors: 10,
    worldHistoryFloors: 10,
    worldbookName: '',
    worldbookSelectedUids: '',
    useActiveWorldbooks: true,
    worldbookNames: '',
    worldbookEntrySelectors: '',
    worldbookEntryLimit: 12,
    useHistory: true,
    mode: 'balanced',
    includeFloorData: true,
    includeWorldState: true,
    bodyInjectionEnabled: false,
    retryCount: 2,
    repairOnParseError: true,
    autoSave: true,
    autoRunEnabled: true,
    autoRunOnlyAssistant: true,
    autoRunAssistantFloorInterval: 1,
    autoRunUseHistory: true,
    autoRunMinChars: 300,
    autoRunCooldownSec: 8,
    contentExtractTags: 'content,game',
    contentExcludeTags: 'details,UpdateVariable,background,tucao,reasoning,analysis,think,npc_action,recall,dm_box',
  },
  AUDIT: {
    cashToleranceWan: 1,
    enterpriseToleranceWan: 1,
    liquidationPenalty: {
      min: 0.3,
      max: 0.7,
    },
    loyaltyThreshold: 50,
  },
};

// 提示词块 ID 常量（用于模块化架构）
const PROMPT_BLOCK_IDS = {
  CONSTRAINT_LAYER: 'constraint_layer',
  RULE_LAYER: 'rule_layer',
  EXECUTION_STEPS: 'execution_steps',
  HISTORY_FLOOR_INFO: 'history_floor_info',
  WORLDBOOK_CONTEXT: 'worldbook_context',
  HISTORICAL_ASSET_VARS: 'historical_asset_vars',
  HISTORICAL_WORLD_VARS: 'historical_world_vars',
  CURRENT_ASSET_CONTEXT: 'current_asset_context',
  CURRENT_WORLD_CONTEXT: 'current_world_context',
  OUTPUT_TEMPLATE: 'output_template',
};

// ---- src/config/defaultData.js ----
const DEFAULT_DATA = {
  sheet_bizStruct: {
    content: [
      [null, '实体名称', '注册地|架构类型', '发展阶段', '实控持股%', '上市状态', '集团总估值', '核心管理层', '集团月净现金流', '集团现金储备', '近期大事', '员工审计'],
    ],
  },
  sheet_rlEst02b: {
    content: [
      [null, '物业名称', '城市/区位', '类型|面积', '估值|购入成本', '月租金', '贷款余额|月供', '状态'],
    ],
  },
  sheet_cashInv1a: {
    content: [
      [null, '资产类别', '资产名称/账户', '数量|均价', '总市值|浮盈亏', '月收益', '平台/备注'],
    ],
  },
  sheet_assetOVW0: {
    content: [
      [null, '快照时间', '流动资产', '不动产', '企业/IP资产', '总负债', '净资产', '个人现金账户', '个人月净收入', '本轮变动摘要'],
    ],
  },
  sheet_luxuryAssets: {
    content: [
      [null, '藏品名称', '类别', '品牌|型号|规格', '估值|购入成本', '存放地点', '月维护成本', '使用状态', '特殊配置', '购入日期'],
    ],
  },
  sheet_bizSegments: {
    content: [
      [null, '板块名称', '核心业务', '负责人', '法律实体|持股比例', '上市状态', '月净利', '估值', '经营状态', '近期动态', '战略方向', '人员结构', '旗下资产'],
    ],
  },
  sheet_dbt4Lst4: {
    content: [
      [null, '方向', '对方名称', '款项类型', '原始额|剩余额', '年利率|月还款', '到期日', '担保物', '状态'],
    ],
  },
};

const DEFAULT_WORLD_SIMULATION = {
  tracks: [],
  checks: {
    allTracksAdvanced: false,
    convergenceChecked: false,
    newTracksAdded: false,
  },
};

// ---- src/config/defaultPrompts.js ----
const DEFAULT_BREAK_PROMPT = `你是 BizSim 事业与世界推演引擎的最高优先级约束层。
你的任务是辅助后续的推演与审计，不得输出与任务无关的解释、免责声明或多余文本。
必须严格遵守 JSON 输出要求，禁止 Markdown（不要输出 \`\`\`json ）、代码块、外部注释和闲聊。
当上下文不足时，优先使用保守、可审计、可回溯的推演方式，不要臆造不可验证信息。`;

const DEFAULT_CORE_PROMPT_MODULES = {
  break_prompt: DEFAULT_BREAK_PROMPT,

  constraint_layer: `你是一个冷酷、精算且极具宏观叙事能力的【世界推演与事业审计引擎】。
你的任务是根据最新的历史剧情，在后台静默推演主角的【事业/势力版图】以及【主角不在场的暗线世界（多视角）】。
这里的“事业”是通用框架，可覆盖公司、宗门、领地、帮派、商会、科研组织等任意形态。

【唯一输出要求】
你必须且只能输出一个合法 JSON 对象。
输出 JSON 必须精确使用下方模板中的所有顶层键和子键，不得增删任何一个键名！`,

    rule_layer: `=============================
  【模块一：世界推演引擎 (World Simulation)】
  这是一个真实运转的沙盒世界，主角不在场的关键角色或势力必须按自身逻辑继续发展。
  1. 编号与递增：视角 ID 为 “BG.n” (n为自增序号)。每次推演 iteration 必须 +1。命名后不可更改。注意：新视角编号应基于当前所有视角（包括已汇入）的最大编号+1。数据中的 _metadata.maxTrackId 字段提供了当前最大编号，请基于此计算新编号。
  2. 视角数量：同一轮必须推演至少 3 个独立视角，上不封顶。所有状态为”推演中”的视角每次都要进行推进&更新，一个不漏！
  3. 自由发散：【绝对禁止】将旧视角强行引回主线与主角相遇。任其独立发展、成功或死亡。
  4. 状态流转：仅当剧情逻辑极其合理时（明确相遇/合并），更新该视角下的与主角相遇&汇入剧情，将 status 设为 “已汇入”。
  5. 动态衍生：有核心人物离开主角视线时，必须立即分配新编号（最大编号+1）新增视角。
  6. 命名规范：已知人物视角必须用人物纯姓名命名，无任何职位、称谓。

  =============================
  【模块二：事业审计引擎 (Career Audit)】

  【泛用化映射 (Universal Mapping)】
  所有字段语义必须按世界观自动切换：
  - 现代：CEO/CFO、上市状态、美元、公司、股票
  - 修仙：宗主/大长老、隐世宗门/名震一方、灵石、宗门、功法
  - 奇幻：领主/幕僚长、秘密结社/王室册封、金币、商会、魔晶
  - 末世：营地领袖/物资官、流浪营地/霸主避难所、瓶盖、聚落、物资

  【流动性等级定义】
  - S级：即时调用，100%价值（个人现金、活期存款、灵石现货）
  - B级：变现需3-6个月，折价30%-50%（不动产、固定资产）
  - C级：折价高，流动性差（藏品、载具、奢侈品）
  - D级：账面股权，变现极难，折价70%起步（业务板块、企业估值）

  【货币格式统一规范】
  - 现代：¥7亿[$1亿]；奇幻：1500金币[€1200]；修仙：200万灵石[≈2极品]；科幻：500cap
  - 必须保留单位并折算，严禁模糊表述如”很多钱”

  【资金隔离原则】
  - 集团/势力资金仅用于经营，转化为个人现金必须经过「分红/薪酬」并扣税
  - 个人现金是防御「资金链断裂」的唯一屏障

  【跨表审计锁 (Cross-Sheet Integrity)】
  1. [资产总览表].流动资产 = [流动资产表]所有【总市值|浮盈亏】汇总
  2. [资产总览表].个人现金账户 = [流动资产表]中现金类资产可调用余额
  3. [资产总览表].企业/IP资产 = Σ([业务板块表].估值 × 持股比例)
  4. [资产总览表].不动产 = [固定资产表]所有【估值】汇总
  5. 所有支出/资产增加必须溯源至【本轮变动摘要】

  【组织失控逻辑】
  - 若【人员结构】基层庞大而中层空缺（比例失调），或均忠诚度<50%
  - 强制在【近期大事】触发叛变/贪腐事件
  - 强制削减【月净利】至少30%

  =============================
  【模块三：表格生命周期约束 (Sheet Lifecycle Constraints)】
  你必须把每张表视为"有状态对象"，严格遵守以下增删改规则。

  【集团架构表】类型: single | 操作: 仅更新，禁止增删
  - 说明：单行顶层节点表，记录主角控制体系最顶层实体核心状态，务必注意是主角实控事业的顶层概括
  - 泛用化：核心管理层→权力架构(CEO/宗主/领主)；上市状态→势力能见度
  - 重点审查：实控持股%[控制力度]、员工审计结构（比例失衡触发失控）
  - 初始化：按世界观（现代/修仙/废土等）映射语义填写；若无明确名称明确事业，填「[主角名]核心势力」，必须是主角实际控制，随剧情发展迭代。
  - 删除：【禁止删除】此表永久保留
  - 更新：重大变动时更新；重点审查列3「控制力度」与列11「员工审计」；一旦结构失控，须立即更新，并在本表列10与业务板块扣减利润

  【固定资产表】类型: multi | 流动性: B级(3-6月变现，折价30%-50%)
  - 说明：【个人持有】仅记录主角个人名义持有的不动产/领地/灵矿
  - 初始化：按开局设定扫入已有个人固定资产，术语随世界观转换
  - 删除：转让完成后删除；在【资产总览】本轮变动摘要里记一笔；强行甩卖按7折结算现金
  - 更新：估值、状态变化，或遭外部侵占时更新
  - 插入：新置办个人固定资产时插入

  【流动资产表】类型: multi | 流动性: S级(即时调用，100%价值)
  - 说明：【个人流动资产】严格排除集团/公司账户资金，是防御资金链断裂的唯一屏障
  - 初始化：扫入主角个人名下的高流动性财物
  - 删除：资产耗尽或清仓变现后删除对应行
  - 更新：每轮检查；余额一变就更新
  - 插入：新开投资账户或新增独立资产类别时插入

  【资产总览表】类型: single | 操作: 仅更新，禁止增删
  - 说明：【仪表盘】单行表，主角全部资产负债快照，严格区分【势力资产】与【个人资产】
  - 强制对账：每轮必须完成跨表审计锁校验（流动资产/不动产/企业资产/总负债四栏对齐）
  - 初始化：按其余各表严格加总计算填入；声望按主角背景初始设定
  - 删除：【禁止删除】
  - 更新：按【跨表审计锁规则】对齐数据；名望随重要剧情事件升降

  【藏品载具表】类型: multi | 流动性: C级(折价高，流动性差)
  - 说明：【个人持有】高端消费品、载具、法宝、异宠等
  - 初始化：按设定扫入高级载具/法宝
  - 删除：报废、出售或战损后删除
  - 更新：改装、受损或月维护成本变化时更新
  - 插入：新消费或战利品缴获时插入

  【业务板块表】类型: multi | 流动性: D级(账面股权，变现折价70%起步)
  - 说明：【业务/分舵状态】记录主角控制下的各业务/产业模块
  - 真实感约束：月净利 = 核心产出 - 运营成本 - 员工薪酬及赋税；亏损且现金<3个月强制填「危机/濒危」
  - 初始化：按当前版图拆成各业务线/领地/堂口填入
  - 删除：业务关停、领地失守或被全资收购后删除
  - 更新：严格按公式算月净利；审人员结构与控制力度；控制力度<50%或忠诚暴跌时，禁止向总表随意抽调月净利
  - 插入：开拓新业务或攻占新领地时插入

  【负债清单表】类型: multi
  - 说明：【个人负债/债权】包含欠款(负债)与放贷(应收)
  - 初始化：记入开局债务或恩怨账单
  - 删除：两清后删除；在【资产总览】变动摘要记录
  - 更新：每月结息并更新剩余额；逾期立即改状态并交给事件引擎
  - 插入：借钱填坑或对外放款时插入`,

  execution_steps: `=============================
【执行步骤】
在生成 stat_data 之前，你必须先在 _chainOfThought 中完成逻辑盘点和数学验算。`,

  history_floor_info: `=============================
【历史楼层信息】
{{HISTORY_FLOOR_INFO_BLOCK}}`,

  worldbook_context: `=============================
【世界书模块】
{{WORLDBOOK_BLOCK}}`,

  historical_asset_vars: `=============================
【历史资产变量模块（不含最新楼层）】
{{HISTORICAL_ASSET_VARS_BLOCK}}`,

  historical_world_vars: `=============================
【历史世界演化模块（不含最新楼层）】
{{HISTORICAL_WORLD_VARS_BLOCK}}`,

  current_asset_context: `=============================
【当前资产模块】
{{CURRENT_ASSET_BLOCK}}`,

  current_world_context: `=============================
【当前世界演化模块】
{{CURRENT_WORLD_BLOCK}}`,

  output_template: `【输出模板 (请严格使用以下 JSON 结构，并将 \${} 中的提示作为生成该字段的强制思考约束替换为实际数据)】
{
  "_chainOfThought": {
    "world_analysis": [
      "【视角盘点】列出上一轮所有状态为'推演中'的视角，这些视角必须在本轮全部继续推演，一个不漏",
      "【汇入判断】哪些视角的剧情已自然汇入主线？（与主角相遇/合并）已汇入的正常更新该视角剧情，但状态标记为'已汇入'，未汇入的保持'推演中'——任其独立发展，禁止硬往主线上靠",
      "【离场检测】是否有核心角色离开主角视线？如有，必须新增该角色的独立视角（编号=最大编号+1，命名用纯姓名无任何职位/称谓）",
      "【新增机会】是否有有趣的新视角可以设计？新视角命名规则：BG.n[视角名称][推演中][1]，n为当前最大编号+1",
      "【数量校验】确保推演中视角数量>=3，不满足则按世界背景&剧情进度补足"
    ],
    "empire_audit": [
      "\${盘点本轮资金与势力变更，按通用事业框架(公司/宗门/领地等)校验语义映射与跨表审计锁}",
      "\${逐表审查本轮操作是否合法：哪些是插入/更新/删除，是否符合各表生命周期规则与单行表约束}",
      "\${审查人员结构忠诚度，判定是否触发组织失控惩罚}",
      "\${校验货币格式：必须保留世界观单位并折算，严禁模糊金额}"
    ]
  },
  "stat_data": {
    "bizsim_assets": {
      "集团架构表": {
        "实体名称": "\${顶层实体全称或势力名称；缺省可用[主角名]核心势力，必须是主角实际控制的事业核心}",
        "注册地|架构类型": "\${按世界观映射：现代[开曼|离岸]/修仙[南瞻部洲|血契附属]/奇幻[北境|封建采邑]，用'|'分隔}",
        "发展阶段": "\${单一实体/多部门/分支群/集团架构/跨界跨国集团}",
        "实控持股%": "\${比例[控制力度：绝对控制/联合治理/傀儡名义/代理人代持]}",
        "上市状态": "\${势力能见度：现代[非上市/美股]/修仙[隐世宗门/名震一方]/末世[流浪营地/霸主避难所]}",
        "集团总估值": "\${必等于各板块估值之和，格式：¥X亿[$Y亿]}",
        "核心管理层": "\${按世界观映射权力架构：现代[姓名·CEO|姓名·CFO]/修仙[姓名·宗主|姓名·大长老]}",
        "集团月净现金流": "\${必等于所有业务板块月净利之和，格式：+$X万/月}",
        "集团现金储备": "\${S级流动性资金池，格式：$X亿[更新日期][健康(≥3月运营)/危险/即将破产]}",
        "近期大事": "\${日期·事件；若员工结构失控触发叛变/贪腐必须在此记录}",
        "员工审计": "\${核心·人数·(均忠诚度)|高管·人数·(忠诚度)|中层·人数|基层·人数；比例失衡将触发管理失控}"
      },
      "固定资产表": [
        {
          "物业名称": "\${自定义简称}",
          "城市/区位": "\${按世界观映射：现代[上海陆家嘴]/修仙[东荒·太初圣地]/奇幻[凛冬城·内城]}",
          "类型|面积": "\${按世界观映射：现代[商业办公|2000㎡]/修仙[灵石矿|中型]/奇幻[法师塔|7层]}",
          "估值|购入成本": "\${格式：估值|成本(B级变现折价X%)，甩卖需标注折价}",
          "月租金": "\${每月产出收益金额，自用填'自用'，资源产出按货币基准折算}",
          "贷款余额|月供": "\${剩余负债金额|每月还款额，无需还贷填'无'}",
          "状态": "\${持有生息/自用/闲置/甩卖变现中/遭受争夺中}"
        }
      ],
      "流动资产表": [
        {
          "资产类别": "\${按世界观：现代[大额存单/美股/信托]/修仙[灵石/妖丹/通票]/奇幻[魔晶/商会本票]}",
          "资产名称/账户": "\${具体名称：工商银行活期/天地钱庄不记名卡/瑞士银行账户}",
          "数量|均价": "\${格式：数量|均价成本，如：1000股|¥50}",
          "总市值|浮盈亏": "\${格式：市值|盈亏(+%)，如：¥5万|+10%(+¥4500)}",
          "月收益": "\${定量金额：存款利息/钱庄利息/分红，必须填准确定量数字}",
          "平台/备注": "\${所在机构或藏匿地点：瑞士银行/空间戒指内部/密室保险箱}"
        }
      ],
      "资产总览表": {
        "快照时间": "\${游戏内最新日期}",
        "流动资产": "\${必等于[流动资产表]所有'总市值|浮盈亏'汇总}",
        "不动产": "\${必等于[固定资产表]所有'估值'汇总}",
        "企业/IP资产": "\${必等于Σ([业务板块表].估值×持股比例)，标注D级流动性}",
        "总负债": "\${必等于[负债清单表]所有'借入'方向的'剩余额'汇总}",
        "净资产": "\${格式：[账面价值] | 声望:[声名阶层]，如：$150亿 | 声望:名震一方(降成本/吸人才)}",
        "个人现金账户": "\${必须与流动资产现金类余额一致，格式：$X亿[更新:YYYY-MM-DD|状态|支撑X月]}",
        "个人月净收入": "\${格式：+$X万/月(流动资产利息+集团合法分红-私人开销-债务月供)}",
        "本轮变动摘要": "\${记录大笔资金流向、重大采购、势力吞并、资产甩卖等跨表溯源依据}"
      },
      "藏品载具表": [
        {
          "藏品名称": "\${简称}",
          "类别": "\${按世界观：现代[超跑/游艇]/修仙[飞行法器/护道神兽]/科幻[星际跃迁舰]}",
          "品牌|型号|规格": "\${具体型号：湾流|G650ER/炼器宗|三阶破空梭/保时捷|911Turbo}",
          "估值|购入成本": "\${包含改装/祭炼成本，C级流动性标注}",
          "存放地点": "\${地下车库/识海温养/私人码头/空间戒指}",
          "月维护成本": "\${保养、喂食、阵法消耗等月均支出，必须定量}",
          "使用状态": "\${日常使用/压箱底/损坏维修中/改装中}",
          "特殊配置": "\${定制内饰/器灵附体/防弹装甲/阵法铭刻}",
          "购入日期": "\${获取时间，游戏内日期}"
        }
      ],
      "业务板块表": [
        {
          "板块名称": "\${业务线或堂口名称}",
          "核心业务": "\${一句话描述主营业务}",
          "负责人": "\${格式：姓名·职位}",
          "法律实体|持股比例": "\${格式：实体全称|比例%[控制力度：绝对控制/联合/傀儡]，控制力弱则利润调拨受限}",
          "上市状态": "\${暴露度/势力能见度}",
          "月净利": "\${公式计算：核心产出-运营成本-员工薪酬及赋税，亏损且现金<3月强制填'危机/濒危'}",
          "估值": "\${必须遵循估值锚定(市盈率倍数/资产法)，标注D级变现}",
          "经营状态": "\${初创/稳定/亏损/危机}",
          "近期动态": "\${最新事件简述}",
          "战略方向": "\${扩张/守成/收缩/剥离}",
          "人员结构": "\${格式：高管·人数·(忠诚度)|中层·人数|基层·人数，比例失衡触发失控危机}",
          "旗下资产": "\${归属该板块的厂房/矿脉/舰队等实物资产(标注内部估值)}"
        }
      ],
      "负债清单表": [
        {
          "方向": "\${借入(产生负债)/借出(形成应收)}",
          "对方名称": "\${债权人或债务人：工商银行/万宝阁/铁金库/九出十三归钱庄}",
          "款项类型": "\${借贷名目：信用贷/过桥资金/对赌契约/买命钱/王室战争借款}",
          "原始额|剩余额": "\${格式：初始金额|未结清本金}",
          "年利率|月还款": "\${格式：利率%|每月需还金额，高利贷/九出十三归按实际折算}",
          "到期日": "\${最终清算期限，游戏内日期}",
          "担保物": "\${抵押资产：公司股权/本命法宝/道心誓言/房产抵押，违约则强制剥离}",
          "状态": "\${借入方[正常/逾期/追杀中/利滚利]；借出方[正常/死账/暴力催收中]}"
        }
      ]
    },
    "bizsim_world_state": {
      "tracks": [
        {
          "id": "BG.\${n 从最大值+1}",
          "characterName": "\${视角名称，注意这是视角名称不是事件标题。已知人物视角必须用人物纯姓名命名，无任何职位、称谓}",
          "status": "\${推演中/已汇入 二选一，当视角汇入主线时改为已汇入，否则保持推演中}",
          "iteration": \${推演次数，1开始，每推演一次+1},
          "timeSync": "\${开始时间 → 结束时间，根据主线推进的精确时间}",
          "location": "\${地点，视角有移动需标注}",
          "progress": "\${一句话概括视角当前进度，最多10字}",
          "summary": "\${事件简述、新增长期存在物品及物品简述、**人物性格变化**，50字左右，仅叙事不评价}"
        }
      ],
      "checks": {
        "allTracksAdvanced": \${推演检查：状态为推演中的所有视角(BG.1 BG.2 ... BG.n)已全部推演更新，且数量>=3? true/false},
        "convergenceChecked": \${汇入检查：与主角交汇&会面的视角，状态是否已更改为已汇入? true/false},
        "newTracksAdded": \${新增检查：是否有核心角色离开主角视角？如有，是否已新增该角色视角且命名为纯姓名(无职位/称谓)? true/false}
      }
    }
  }
}`,

  output_enforcer_user: `【执行指令（User）】
从现在开始，严格基于以上全部 system 约束与模板输出。
你必须直接输出最终 JSON 结果，不得复述规则，不得解释，不得附加任何额外文本。`
};

const DEFAULT_CORE_PROMPT_BLOCK_ORDER = [
  'break_prompt',
  'constraint_layer',
  'rule_layer',
  'execution_steps',
  'history_floor_info',
  'worldbook_context',
  'historical_asset_vars',
  'historical_world_vars',
  'current_asset_context',
  'current_world_context',
  'output_template',
  'output_enforcer_user'
];

const DEFAULT_CORE_PROMPT_BLOCK = DEFAULT_CORE_PROMPT_BLOCK_ORDER
  .map((id) => DEFAULT_CORE_PROMPT_MODULES[id])
  .join('\n\n');

const DEFAULT_COMPOSE_PROMPT = `{{BREAK_PROMPT}}\n\n{{CORE_PROMPT_BLOCK}}`;

const DEFAULT_EMPIRE_AUDIT = `你是一位冷酷无情的财务审计 AI，专门审查主角事业体系（公司/宗门/领地/组织等）的资产与负债。
你的任务是对主角事业版图进行严格审计，确保数字准确、逻辑自洽、语义映射一致。

审计红线：
1. 现金流必须平衡：所有流入 - 所有流出 = 现金变动
2. 资产估值必须合理：股权/宗门产业/领地估值需考虑市场环境和流动性折损
3. 债务必须追踪：所有借款的本金、利率、到期日必须清晰
4. 人员结构必须合理：层级与忠诚度决定组织稳定性
5. 跨表审计锁必须成立：资产总览与流动资产/业务板块/负债清单严格对齐
6. 表格生命周期必须成立：单行表禁止增删；其余表只可在触发条件满足时执行插入/删除；所有操作需可追溯

请审查以下财务数据并给出审计报告：

{{FLOOR_DATA}}

最近的交易记录：
{{TRANSACTIONS}}

输出格式为 JSON：
{
  "auditReport": {
    "status": "通过|警告|严重",
    "issues": ["问题1", "问题2"],
    "corrections": {"需要修正的字段": "修正值"}
  },
  "updatedSheets": {
  }
}`;

// ---- src/config/prompts.js ----
const PROMPTS = {
  COMPOSE_PROMPT: DEFAULT_COMPOSE_PROMPT,
  BREAK_PROMPT: DEFAULT_BREAK_PROMPT,
  CORE_PROMPT_BLOCK: DEFAULT_CORE_PROMPT_BLOCK,
  EMPIRE_AUDIT: DEFAULT_EMPIRE_AUDIT,
};

// ---- src/core/BizSimEngine.context.js ----
const BIZSIM_ENGINE_CONTEXT_METHODS = {
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

  getLatestAssistantMessageIdSafe() {
    const lastMessageId = getLastMessageIdSafe();
    if (lastMessageId === null || lastMessageId === undefined || lastMessageId < 0) return null;

    for (let messageId = lastMessageId; messageId >= 0; messageId -= 1) {
      const message = getChatMessageByIdSafe(messageId);
      if (this.isAssistantMessage(message)) return messageId;
    }

    return null;
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

    // 仅统计 AI 回复楼层，避免把用户楼层变量注入提示词历史块
    const assistantMessageIdSet = new Set();
    for (let messageId = startMessageId; messageId <= historyEndMessageId; messageId += 1) {
      if (currentMessageId !== null && currentMessageId !== undefined && messageId === currentMessageId) continue;

      const message = getChatMessageByIdSafe(messageId);
      if (this.isAssistantMessage(message)) {
        assistantMessageIdSet.add(messageId);
      }
    }

    if (!assistantMessageIdSet.size) return '';

    // 第一轮：逆序遍历收集所有已汇入的视角ID
    // 这样可以从最新楼层向后扫描，确保一旦某个视角在任何楼层被标记为已汇入
    // 它的ID就会被记录，用于过滤所有更早楼层的历史数据
    const convergedTrackIds = new Set();
    for (let messageId = historyEndMessageId; messageId >= startMessageId; messageId -= 1) {
      if (currentMessageId !== null && currentMessageId !== undefined && messageId === currentMessageId) continue;
      if (!assistantMessageIdSet.has(messageId)) continue;

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
      if (!assistantMessageIdSet.has(messageId)) continue;

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

  buildLatestFloorVariablesPayload(floorData, worldSimulation, currentStatData = null) {
    const normalizedFloorData = this.normalizeFloorData(floorData);
    const normalizedWorldSimulation = this.normalizeWorldSimulation(worldSimulation);
    const { assetsKey, worldStateKey } = this.getFloorNamespaceKeys();
    const semanticAssets = this.normalizeBizsimAssetsPayload(this.buildSemanticAssetsFromFloorData(normalizedFloorData));

    const baseStatData = currentStatData && typeof currentStatData === 'object'
      ? deepClone(currentStatData)
      : {};

    return {
      stat_data: {
        ...baseStatData,
        [assetsKey]: semanticAssets,
        [worldStateKey]: normalizedWorldSimulation,
      },
    };
  },

  async syncLatestFloorVariables(floorData, worldSimulation) {
    const messageId = this.getLatestAssistantMessageIdSafe() ?? getCurrentMessageIdSafe();
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
      const payload = this.buildLatestFloorVariablesPayload(normalizedFloorData, normalizedWorldSimulation, currentScoped);
      // 根据官方文档, insertOrAssignVariables 是同步操作，直接调用，不需要 await
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

// ---- src/core/BizSimEngine.simulation.js ----
function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BIZSIM_ENGINE_SIMULATION_METHODS = {
  isAssistantMessage(message) {
    if (!message || typeof message !== 'object') return false;
    const role = String(message.role || '').toLowerCase();
    if (role === 'assistant') return true;
    if (role === 'system') return false;
    return !(message.is_user === true || message.from_user === true || message.isUser === true || role === 'user');
  },

  replaceTaggedBlock(text, tagName, newBlock) {
    const escaped = escapeRegExp(tagName);
    const completeBlockPattern = new RegExp(`<${escaped}\\b[^>]*>[\\s\\S]*?<\\/${escaped}>`, 'gi');
    const danglingOpenPattern = new RegExp(`<${escaped}\\b[^>]*>[\\s\\S]*$`, 'i');
    const danglingClosePattern = new RegExp(`<\\/${escaped}>`, 'gi');

    const cleaned = String(text || '')
      // 先移除所有完整标签块
      .replace(completeBlockPattern, '')
      // 再移除末尾残缺开标签（例如: <tag> ... <tag> ... </tag> 这类异常拼接后残留）
      .replace(danglingOpenPattern, '')
      // 最后清理孤立闭标签
      .replace(danglingClosePattern, '')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd();

    const trimmed = cleaned;
    return trimmed ? `${trimmed}\n\n${newBlock}` : newBlock;
  },

  async injectBizSimBlocksToMessage(messageId, maxLookback = 10) {
    if (this.config.SIMULATION?.bodyInjectionEnabled !== true) {
      return { success: false, updated: false, reason: 'body-injection-disabled' };
    }

    const message = getChatMessageByIdSafe(messageId);
    if (!message || !this.isAssistantMessage(message)) return { success: false, reason: 'not-assistant' };

    const worldBlock = this.buildWorldStateInjectionBlockForMessage(messageId, maxLookback);
    const assetBlock = this.buildAssetSheetInjectionBlockForMessage(messageId, maxLookback);
    if (!worldBlock && !assetBlock) return { success: false, reason: 'no-biz-floor-data' };

    const originalText = String(message.message || message.mes || message.content || '');
    let updatedText = originalText;
    if (worldBlock) updatedText = this.replaceTaggedBlock(updatedText, 'bz_world_state', worldBlock);
    if (assetBlock) updatedText = this.replaceTaggedBlock(updatedText, 'bz_asset_sheet', assetBlock);
    if (updatedText === originalText) return { success: true, updated: false };

    const ok = await setChatMessageTextSafe(messageId, updatedText, 'none');
    return { success: ok, updated: ok };
  },
  getTrackIdPattern() {
    const prefix = escapeRegExp(String(this.config.SIMULATION?.trackPrefix || 'BG'));
    return new RegExp(`^${prefix}\.(\\d+)$`);
  },

  normalizeChatCompletionsUrl(url) {
    let normalized = String(url || '').trim();
    if (!normalized) return normalized;
    normalized = normalized.replace(/\/$/, '');
    if (/\/chat\/completions$/i.test(normalized)) return normalized;
    if (/\/models$/i.test(normalized)) return normalized.replace(/\/models$/i, '/chat/completions');
    if (/\/v\d+$/i.test(normalized)) return `${normalized}/chat/completions`;
    return `${normalized}/v1/chat/completions`;
  },

  formatHistoryText(history) {
    if (!Array.isArray(history)) return '';
    const extractTags = String(this.config.SIMULATION?.contentExtractTags || 'content,game')
      .split(/[,，;；]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const excludeTags = String(this.config.SIMULATION?.contentExcludeTags || '')
      .split(/[,，;；]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const isUserMessage = (message) => {
      if (!message || typeof message !== 'object') return false;
      return message.is_user === true
        || message.from_user === true
        || message.isUser === true
        || String(message.role || '').toLowerCase() === 'user';
    };

    const extractContentByTags = (text, tags) => {
      if (!text || !tags.length) return text;
      const results = [];
      for (const tag of tags) {
        const regex = new RegExp(`<${escapeRegExp(tag)}>([\\s\\S]*?)</${escapeRegExp(tag)}>`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          results.push(match[1].trim());
        }
      }
      return results.length > 0 ? results.join('\n') : text;
    };

    const excludeContentByTags = (text, tags) => {
      if (!text || !tags.length) return text;

      const removeClosedTagBlocks = (source, tag) => {
        if (!source) return source;
        const escapedTag = escapeRegExp(tag);
        const tokenRegex = new RegExp(`<${escapedTag}(?:\\s[^>]*)?>|</${escapedTag}>`, 'gi');
        const stack = [];
        const ranges = [];

        let match;
        while ((match = tokenRegex.exec(source)) !== null) {
          const token = match[0];
          const tokenStart = match.index;
          const tokenEnd = tokenRegex.lastIndex;
          const isCloseTag = /^<\//.test(token);

          if (!isCloseTag) {
            stack.push(tokenStart);
            continue;
          }

          if (!stack.length) continue;
          const openStart = stack.pop();
          ranges.push([openStart, tokenEnd]);
        }

        if (!ranges.length) return source;

        ranges.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
        const merged = [];
        for (const [start, end] of ranges) {
          if (!merged.length || start > merged[merged.length - 1][1]) {
            merged.push([start, end]);
            continue;
          }
          merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
        }

        let cursor = 0;
        let output = '';
        for (const [start, end] of merged) {
          output += source.slice(cursor, start);
          cursor = end;
        }
        output += source.slice(cursor);
        return output;
      };

      let result = text;
      for (const tag of tags) {
        result = removeClosedTagBlocks(result, tag);
      }
      return result;
    };

    return history
      .map((h) => {
        const speaker = String(h?.name || h?.speaker_name || h?.character_name || (h?.is_user ? 'User' : 'Assistant') || 'Unknown');
        const rawText = String(h?.mes || h?.message || h?.content || '').trim();
        if (!rawText) return '';
        // 提取仅作用于 AI 消息；排除作用于所有消息
        const baseText = isUserMessage(h) ? rawText : extractContentByTags(rawText, extractTags);
        const cleanedText = excludeContentByTags(baseText, excludeTags).trim();
        if (!cleanedText) return '';
        return `[${speaker}] ${cleanedText}`;
      })
      .filter(Boolean)
      .join('\n\n');
  },

  stripPossibleMarkdownCodeFence(text) {
    if (!text) return text;
    const trimmed = text.trim();
    if (!trimmed.startsWith('```')) return trimmed;
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  },

  parseJSONResult(result) {
    if (!result) return null;
    try {
      const clean = this.stripPossibleMarkdownCodeFence(result);
      return JSON.parse(clean);
    } catch {
      const clean = this.stripPossibleMarkdownCodeFence(result);
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      try { return JSON.parse(jsonMatch[0]); } catch { return null; }
    }
  },

  normalizeFloorData(input) {
    const keys = ['sheet_bizStruct', 'sheet_rlEst02b', 'sheet_cashInv1a', 'sheet_assetOVW0', 'sheet_luxuryAssets', 'sheet_bizSegments', 'sheet_dbt4Lst4'];
    const current = this.data || this.getDefaultFloorData();
    const out = {};
    for (const key of keys) {
      const content = input?.[key]?.content;
      out[key] = { content: Array.isArray(content) && content.length > 0 ? content : current[key]?.content || DEFAULT_DATA[key].content };
    }
    return out;
  },

  normalizeWorldSimulation(input) {
    const prevTracks = Array.isArray(this.worldSimulation?.tracks) ? this.worldSimulation.tracks : [];
    const prevMap = new Map(prevTracks.map((t) => [t.id, t]));
    const tracks = Array.isArray(input?.tracks) ? input.tracks : [];

    const normalized = [];
    const used = new Set();
    let maxId = 0;
    const prefix = String(this.config.SIMULATION?.trackPrefix || 'BG');
    const trackIdPattern = this.getTrackIdPattern();

    for (const track of tracks) {
      const match = String(track?.id || '').match(trackIdPattern);
      if (match) maxId = Math.max(maxId, Number(match[1]));
    }

    for (const track of tracks) {
      let id = typeof track?.id === 'string' ? track.id : '';
      if (!trackIdPattern.test(id) || used.has(id)) {
        maxId += 1;
        id = `${prefix}.${maxId}`;
      }
      used.add(id);

      const status = track?.status || '推演中';
      if (status === '已汇入') continue;

      const prev = prevMap.get(id);
      let iteration = Number(track?.iteration) || 1;
      if (prev && Number(prev.iteration) >= iteration) iteration = Number(prev.iteration) + 1;

      normalized.push({ id, characterName: track?.characterName || `未知角色${id}`, status, iteration, timeSync: track?.timeSync || new Date().toISOString(), location: track?.location || '未知区域', progress: track?.progress || '暂无进展', summary: track?.summary || '暂无摘要' });
    }

    if (normalized.length > this.config.SIMULATION.maxTracks) normalized.splice(this.config.SIMULATION.maxTracks);

    while (normalized.length < this.config.SIMULATION.minTracks) {
      maxId += 1;
      normalized.push({ id: `${prefix}.${maxId}`, characterName: `新势力观察点${maxId}`, status: '推演中', iteration: 1, timeSync: new Date().toISOString(), location: '待定区域', progress: '由系统自动补足以满足最小视角数。', summary: '该视角用于补齐多视角并维持沙盒运转。' });
    }

    return { tracks: normalized, checks: { allTracksAdvanced: normalized.every((t) => Number(t.iteration) >= 1), convergenceChecked: true, newTracksAdded: normalized.length > tracks.length } };
  },

  async callLLM(prompt) {
    const llm = this.config.LLM;
    if (!llm.apiUrl) throw new Error('未配置 API 地址');

    const controller = new AbortController();
    const timeoutMs = Number(llm.timeoutMs) || 120000;
    const timeoutId = setTimeout(() => controller.abort(new Error(`LLM 请求超时 (${timeoutMs}ms)`)), timeoutMs);

    let extraHeaders = {};
    if (llm.customHeaders) {
      try { extraHeaders = JSON.parse(llm.customHeaders); } catch {}
    }

    const body = {
      model: llm.model,
      temperature: Number(llm.temperature) || 0.6,
      max_tokens: Number(llm.maxTokens) || 4000,
      messages: [
        { role: 'system', content: '你是世界推演与资产审计引擎。你必须仅输出一个合法 JSON 对象，不得输出任何额外文本。' },
        { role: 'user', content: prompt },
      ],
    };

    if (llm.forceJsonResponse) body.response_format = { type: 'json_object' };

    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (llm.apiKey) headers.Authorization = `Bearer ${llm.apiKey}`;

    try {
      const requestUrl = this.normalizeChatCompletionsUrl(llm.apiUrl);
      const response = await fetch(requestUrl, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      const rawText = await response.text();
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) throw new Error(`LLM 请求失败 (${response.status}): ${rawText.slice(0, 400)}`);

      let json;
      try { json = JSON.parse(rawText); } catch {
        if (contentType.includes('text/html') || rawText.trim().startsWith('<')) {
          throw new Error('LLM 接口返回了 HTML 页面。请检查 API 地址是否为 /v1/chat/completions，或网关/反代是否拦截。');
        }
        throw new Error(`LLM 返回非 JSON 内容: ${rawText.slice(0, 220)}`);
      }

      const content = json?.choices?.[0]?.message?.content;
      if (!content) throw new Error('LLM 未返回可解析内容');
      return content;
    } catch (error) {
      if (error?.name === 'AbortError' || String(error?.message || '').includes('aborted')) {
        throw new Error(`LLM 请求超时 (${timeoutMs}ms)`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  normalizeSimulationOutput(parsed) {
    const semanticAssetsRaw = parsed?.stat_data?.bizsim_assets;
    const worldStateRaw = parsed?.stat_data?.bizsim_world_state;

    let normalizedFloorData;
    if (semanticAssetsRaw && typeof semanticAssetsRaw === 'object') {
      const semanticAssets = this.normalizeBizsimAssetsPayload(semanticAssetsRaw);
      normalizedFloorData = this.buildFloorDataFromSemanticAssets(semanticAssets);
    } else {
      normalizedFloorData = this.normalizeFloorData(this.data);
    }

    return {
      _chainOfThought: {
        world_analysis: Array.isArray(parsed?._chainOfThought?.world_analysis) ? parsed._chainOfThought.world_analysis : ['1. 缺少 world_analysis，已由系统兜底。'],
        empire_audit: Array.isArray(parsed?._chainOfThought?.empire_audit) ? parsed._chainOfThought.empire_audit : ['1. 缺少 empire_audit，已由系统兜底。'],
      },
      floorData: normalizedFloorData,
      worldSimulation: this.normalizeWorldSimulation(worldStateRaw),
    };
  },

  async runSimulation(useHistory = true) {
    if (!this.initialized) await this.initialize();

    try {
      const historyLimit = Number(this.config.SIMULATION?.historyLimit) || 10;
      const historyText = useHistory ? this.formatHistoryText(getChatHistorySafe(historyLimit)) : '';
      const floorDataText = JSON.stringify(this.data, null, 2);
      const worldStateText = JSON.stringify(this.worldSimulation, null, 2);

      const prompt = await this.buildSimulationPrompt({ historyText, floorDataText, worldStateText, useHistory });
      this.lastPromptSnapshot = prompt;
      this.lastPromptBuiltAt = new Date().toISOString();

      const retryCount = Math.max(0, Number(this.config.SIMULATION?.retryCount) || 0);
      const repairEnabled = this.config.SIMULATION?.repairOnParseError !== false;
      let parsed = null;
      let lastError = null;
      let lastRawResult = '';

      for (let attempt = 0; attempt <= retryCount; attempt += 1) {
        const attemptPrompt = attempt === 0 || !repairEnabled
          ? prompt
          : `${prompt}\n\n【重试修复】上一轮输出未能解析为合法 JSON。请严格只输出符合 JSON Schema 的一个 JSON 对象，不要输出任何额外文本、注释、代码块或解释。`;

        const result = await this.callLLM(attemptPrompt);
        lastRawResult = result;
        parsed = this.parseJSONResult(result);
        if (parsed) break;
        lastError = `第 ${attempt + 1} 次返回无法解析为 JSON`;
      }

      if (!parsed) return { success: false, error: lastError || '无法解析推演结果', raw: lastRawResult };

      const previousData = this.data;
      const previousWorldSimulation = this.worldSimulation;
      const normalized = this.normalizeSimulationOutput(parsed);
      const validationResult = this.validateAIParsedResult(normalized, {
        floorData: previousData,
        worldSimulation: previousWorldSimulation,
      });
      const blockingIssues = Array.isArray(validationResult?.blockingIssues) ? validationResult.blockingIssues : [];
      const warningIssues = Array.isArray(validationResult?.warningIssues) ? validationResult.warningIssues : [];

      if (normalized.floorData) this.data = normalized.floorData;
      if (normalized.worldSimulation) this.worldSimulation = normalized.worldSimulation;

      const syncResult = await this.syncLatestFloorVariables(normalized.floorData, normalized.worldSimulation);
      if (!syncResult?.success) {
        this.data = previousData;
        this.worldSimulation = previousWorldSimulation;
        return {
          success: false,
          error: '本地约束校验未通过，已阻止写回。',
          constraintErrors: Array.isArray(syncResult?.errors) ? syncResult.errors : ['未知约束错误'],
          localValidationIssues: Array.isArray(validationResult?.issues) ? validationResult.issues : [],
          localValidationBlockingIssues: blockingIssues,
          localValidationWarningIssues: warningIssues,
        };
      }

      if (syncResult.normalizedFloorData) this.data = syncResult.normalizedFloorData;
      if (syncResult.normalizedWorldSimulation) this.worldSimulation = syncResult.normalizedWorldSimulation;

      this.validateCrossSheetIntegrity();
      if (this.config.SIMULATION?.autoSave !== false) await this.saveData();

      const injected = this.config.SIMULATION?.bodyInjectionEnabled === true
        ? await this.injectBizSimBlocksToMessage(syncResult.messageId, 10)
        : { success: false, updated: false, reason: 'body-injection-disabled' };

      return {
        success: true,
        data: {
          ...normalized,
          floorData: this.data,
          worldSimulation: this.worldSimulation,
          floorSync: {
            messageId: syncResult.messageId,
            replacedExisting: !!syncResult.replacedExisting,
          },
          schemaAuditLogs: Array.isArray(syncResult.schemaAuditLogs) ? syncResult.schemaAuditLogs : [],
          localValidationIssues: Array.isArray(validationResult?.issues) ? validationResult.issues : [],
          localValidationBlockingIssues: blockingIssues,
          localValidationWarningIssues: warningIssues,
          localValidationWouldBlock: blockingIssues.length > 0,
          localValidationAutoRepaired: !!validationResult?.autoRepaired,
          bodyInjection: {
            success: !!injected?.success,
            updated: !!injected?.updated,
            reason: injected?.reason || '',
          },
        },
        chainOfThought: normalized._chainOfThought,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

// ---- src/core/BizSimEngine.audit.js ----
const BIZSIM_ENGINE_AUDIT_METHODS = {
  parseAmountToWan(raw) {
    if (raw === null || raw === undefined) return Number.NaN;
    const text = String(raw).split('|')[0].trim().replace(/,/g, '');
    if (!text) return Number.NaN;
    const match = text.match(/(-?[\d.]+)\s*(万亿|亿|万|千|元)?/);
    if (!match) return Number.NaN;
    const num = Number.parseFloat(match[1]);
    const unit = match[2] || '万';
    if (Number.isNaN(num)) return Number.NaN;
    if (unit === '万亿') return num * 100000000;
    if (unit === '亿') return num * 10000;
    if (unit === '万') return num;
    if (unit === '千') return num * 0.1;
    if (unit === '元') return num / 10000;
    return num;
  },

  validateFloorSemanticIntegrity() {
    try {
      const assets = this.getCurrentFloorSemanticAssets?.();
      if (!assets) return { valid: true, issues: [] };
      return this.validateSemanticAssetConstraints?.(assets) || { valid: true, issues: [] };
    } catch (error) {
      return { valid: false, issues: [error.message] };
    }
  },

  validateCrossSheetIntegrity() {
    const issues = [];
    try {
      const cashToleranceWan = Number(this.config.AUDIT?.cashToleranceWan) || 1;
      const enterpriseToleranceWan = Number(this.config.AUDIT?.enterpriseToleranceWan) || 1;

      const cashInv = this.data.sheet_cashInv1a?.content || [];
      let totalLiquid = 0;
      for (let i = 1; i < cashInv.length; i += 1) {
        const amountWan = this.parseAmountToWan(cashInv[i][4]);
        if (!Number.isNaN(amountWan)) totalLiquid += amountWan;
      }

      const segments = this.data.sheet_bizSegments?.content || [];
      let totalEnterpriseValue = 0;
      for (let i = 1; i < segments.length; i += 1) {
        const row = segments[i];
        const holdingStr = row[4];
        const valueWan = this.parseAmountToWan(row[7]);
        const holdingMatch = holdingStr?.match(/(\d+)%/);
        if (holdingMatch && !Number.isNaN(valueWan)) {
          const holding = Number.parseFloat(holdingMatch[1]) / 100;
          totalEnterpriseValue += valueWan * holding;
        }
      }

      const overview = this.data.sheet_assetOVW0?.content?.[1] || [];
      const overviewPersonalCash = this.parseAmountToWan(overview[7]);
      const overviewEnterprise = this.parseAmountToWan(overview[4]);

      if (!Number.isNaN(overviewPersonalCash)) {
        const diff = Math.abs(overviewPersonalCash - totalLiquid);
        if (diff > cashToleranceWan) issues.push(`个人现金不一致: 资产总览=${overviewPersonalCash.toFixed(2)}万, 流动资产合计=${totalLiquid.toFixed(2)}万`);
      } else {
        issues.push('资产总览中的个人现金字段不可解析');
      }

      if (!Number.isNaN(overviewEnterprise)) {
        const diff = Math.abs(overviewEnterprise - totalEnterpriseValue);
        if (diff > enterpriseToleranceWan) issues.push(`企业资产不一致: 资产总览=${overviewEnterprise.toFixed(2)}万, 板块估值持股合计=${totalEnterpriseValue.toFixed(2)}万`);
      } else {
        issues.push('资产总览中的企业资产字段不可解析');
      }

      const semantic = this.validateFloorSemanticIntegrity();
      if (!semantic.valid) issues.push(...semantic.issues);

      return { valid: issues.length === 0, issues };
    } catch (error) {
      return { valid: false, issues: [error.message] };
    }
  },

  formatSheetToText(sheetData) {
    if (!sheetData || !Array.isArray(sheetData.content)) return '';
    const rows = sheetData.content;
    if (rows.length === 0) return '';
    const headers = rows[0].slice(1).join(' | ');
    const lines = rows.slice(1).map((row) => row.slice(1).join(' | '));
    return `${headers}\n${'-'.repeat(headers.length)}\n${lines.join('\n')}`;
  },

  getReportText() {
    let text = '# BizSim 推演报告\n\n';
    text += `生成时间: ${new Date().toLocaleString()}\n\n`;
    text += `## 资产总览\n\n${this.formatSheetToText(this.data.sheet_assetOVW0)}\n\n`;
    text += `## 业务板块\n\n${this.formatSheetToText(this.data.sheet_bizSegments)}\n\n`;
    text += '## 世界暗线推演\n\n';

    for (const track of this.worldSimulation?.tracks || []) {
      if (track.status === '已汇入') continue;
      text += `### ${track.id}: ${track.characterName}\n`;
      text += `- 位置: ${track.location}\n`;
      text += `- 进度: ${track.progress}\n`;
      text += `- 迭代: ${track.iteration}\n`;
      text += `- 摘要: ${track.summary}\n\n`;
    }

    return text;
  },

  addWorldTrack(trackData) {
    const prefix = String(this.config.SIMULATION?.trackPrefix || 'BG');
    const maxNum = (this.worldSimulation?.tracks || []).reduce((max, t) => {
      const num = Number.parseInt(String(t.id).split('.')[1], 10) || 0;
      return Math.max(max, num);
    }, 0);

    const newTrack = {
      id: `${prefix}.${maxNum + 1}`,
      characterName: trackData.characterName,
      status: '推演中',
      iteration: 1,
      timeSync: trackData.timeSync || new Date().toISOString(),
      location: trackData.location,
      progress: trackData.progress || '刚开始行动',
      summary: trackData.summary || '新视角，待发展',
    };

    this.worldSimulation.tracks.push(newTrack);
    this.worldSimulation.checks.newTracksAdded = true;
    this.saveData();
    return newTrack.id;
  },
};

// ---- src/core/BizSimEngine.methods.js ----
const BIZSIM_ENGINE_METHODS = {
  ...BIZSIM_ENGINE_CONTEXT_METHODS,
  ...BIZSIM_ENGINE_SIMULATION_METHODS,
  ...BIZSIM_ENGINE_AUDIT_METHODS,
  getLastPromptSnapshot() {
    return this.lastPromptSnapshot || '';
  },
  getLastPromptBuiltAt() {
    return this.lastPromptBuiltAt || null;
  },
};

// ---- src/core/BizSimEngine.prompt.js ----
const BIZSIM_ENGINE_PROMPT_METHODS = {
  buildContextBlock(title, body) {
    if (!body) return '';
    return `【${title}】\n${body}`;
  },

  async buildSimulationPrompt({ historyText = '', floorDataText = '', worldStateText = '', useHistory = true } = {}) {
    const breakPrompt = String(this.getPromptTemplate('BREAK_PROMPT') || '').trim();
    const composeTemplate = String(this.getPromptTemplate('COMPOSE_PROMPT') || '{{BREAK_PROMPT}}\n\n{{CORE_PROMPT_BLOCK}}').trim();

    const includeFloorData = this.config.SIMULATION?.includeFloorData !== false;
    const includeWorldState = this.config.SIMULATION?.includeWorldState !== false;

    const currentWorldbookContext = await this.buildWorldbookContext();
    const historicalAssetContext = includeFloorData
      ? this.buildFloorVariableContext(this.config.SIMULATION?.assetHistoryFloors || 10, '历史楼层资产变量', 'stat')
      : '';
    const historicalWorldContext = includeWorldState
      ? this.buildFloorVariableContext(this.config.SIMULATION?.worldHistoryFloors || 10, '历史楼层世界演化', 'world')
      : '';
    const historyFloorInfoBlock = useHistory && historyText
      ? this.buildContextBlock('历史楼层信息', historyText)
      : '';
    const worldbookBlock = currentWorldbookContext
      ? this.buildContextBlock('世界书模块', currentWorldbookContext)
      : '';
    const historicalAssetBlock = historicalAssetContext
      ? this.buildContextBlock('历史资产变量模块（不含最新楼层）', historicalAssetContext)
      : '';
    const historicalWorldBlock = historicalWorldContext
      ? this.buildContextBlock('历史世界演化模块（不含最新楼层）', historicalWorldContext)
      : '';

    let currentAssetText = '';
    if (includeFloorData) {
      const latestSemanticAssets = this.getCurrentFloorSemanticAssets?.();
      if (latestSemanticAssets && typeof latestSemanticAssets === 'object') {
        currentAssetText = JSON.stringify(latestSemanticAssets, null, 2);
      }
    }

    const currentAssetBlock = includeFloorData && currentAssetText
      ? this.buildContextBlock('当前资产模块', currentAssetText)
      : '';
    const currentWorldBlock = includeWorldState && worldStateText
      ? this.buildContextBlock('当前世界演化模块', worldStateText)
      : '';

    const simulationModeNote = this.getSimulationModeNote();
    const modeSection = this.buildContextBlock('推演模式说明', simulationModeNote);

    const tpl = this.config.SIMULATION?.tpl;
    if (!tpl || !Array.isArray(tpl.scaffold)) {
      throw new Error('提示词模板结构无效：缺少模块化 scaffold');
    }

    const corePromptBlock = buildPromptFromScaffold(tpl, {
      historyText: [modeSection, historyFloorInfoBlock].filter(Boolean).join('\n\n'),
      floorText: currentAssetBlock,
      worldText: currentWorldBlock,
      placeholders: {
        HISTORY_FLOOR_INFO_BLOCK: historyFloorInfoBlock,
        WORLDBOOK_BLOCK: worldbookBlock,
        HISTORICAL_ASSET_VARS_BLOCK: historicalAssetBlock,
        HISTORICAL_WORLD_VARS_BLOCK: historicalWorldBlock,
        CURRENT_ASSET_BLOCK: currentAssetBlock,
        CURRENT_WORLD_BLOCK: currentWorldBlock,
      },
    });

    const moduleMap = {
      BREAK_PROMPT: '',
      CORE_PROMPT_BLOCK: corePromptBlock,
      MODE_NOTE_BLOCK: modeSection,
      HISTORY_FLOOR_INFO_BLOCK: historyFloorInfoBlock,
      WORLDBOOK_BLOCK: worldbookBlock,
      HISTORICAL_ASSET_VARS_BLOCK: historicalAssetBlock,
      HISTORICAL_WORLD_VARS_BLOCK: historicalWorldBlock,
      CURRENT_ASSET_BLOCK: currentAssetBlock,
      CURRENT_WORLD_BLOCK: currentWorldBlock,
    };

    let composedPrompt = composeTemplate.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => moduleMap[key] || '');

    if (breakPrompt && !composedPrompt.includes(breakPrompt)) {
      composedPrompt = `${breakPrompt}\n\n${composedPrompt}`;
    }

    return composedPrompt
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, ''))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },
};

// ---- src/core/BizSimEngine.validation.js ----
/**
 * AI 输出自动校验与修复模块
 * 基于前一层楼数据进行递增校验和 sanity check
 */
const BIZSIM_ENGINE_VALIDATION_METHODS = {
  classifyValidationIssue(issue) {
    const text = String(issue || '').trim();
    if (!text) return 'warning';

    const blockingPatterns = [
      /推演检查未通过/,
      /汇入检查未通过/,
      /列数不足:/,
      /楼层变量输入不是合法 JSON 对象/,
    ];

    if (blockingPatterns.some((pattern) => pattern.test(text))) return 'blocking';
    return 'warning';
  },

  splitValidationIssues(issues) {
    const source = Array.isArray(issues) ? issues : [];
    const blockingIssues = [];
    const warningIssues = [];

    for (const item of source) {
      const msg = String(item || '').trim();
      if (!msg) continue;
      if (this.classifyValidationIssue(msg) === 'blocking') {
        blockingIssues.push(msg);
      } else {
        warningIssues.push(msg);
      }
    }

    return { blockingIssues, warningIssues };
  },

  /**
   * 校验并修复视角推演数据
   * @param {Array} currentTracks - 当前楼层的世界推演轨迹
   * @param {Array} previousTracks - 前一楼层的世界推演轨迹
   * @returns {Object} { valid: boolean, tracks: Array, issues: Array }
   */
  validateAndRepairTracks(currentTracks, previousTracks) {
    const issues = [];
    const tracks = deepClone(currentTracks || []);
    const prevTracks = previousTracks || [];

    // 1. 视角数量检查
    const activeTracks = tracks.filter((t) => t.status === '推演中');
    if (activeTracks.length < 3) {
      issues.push(`视角数量不足: 当前${activeTracks.length}个，需要至少3个推演中视角`);
    }

    // 2. 自动递增 iteration
    const prevTrackMap = new Map(prevTracks.map((t) => [t.id, t]));
    for (const track of tracks) {
      const prevTrack = prevTrackMap.get(track.id);
      if (prevTrack && prevTrack.status === '推演中' && track.status === '推演中') {
        // 继续推演的视角，iteration 必须 +1
        const expectedIteration = (prevTrack.iteration || 1) + 1;
        if (track.iteration !== expectedIteration) {
          issues.push(`${track.id} iteration 异常: 预期${expectedIteration}, 实际${track.iteration}，已自动修正`);
          track.iteration = expectedIteration;
        }
      }
    }

    // 3. 检查已汇入视角（应该被移除）
    const shouldBeRemoved = tracks.filter((t) => t.status === '已汇入');
    if (shouldBeRemoved.length > 0) {
      issues.push(`已汇入视角未移除: ${shouldBeRemoved.map((t) => t.id).join(', ')}`);
    }

    // 4. 自动分配 BG.n 编号（如果缺失）
    const maxNum = tracks.reduce((max, t) => {
      const num = Number.parseInt(String(t.id).split('.')[1], 10) || 0;
      return Math.max(max, num);
    }, 0);

    for (let i = 0; i < tracks.length; i += 1) {
      if (!tracks[i].id || !tracks[i].id.startsWith('BG.')) {
        const newId = `BG.${maxNum + i + 1}`;
        issues.push(`视角编号缺失/无效: ${tracks[i].characterName || '未命名'}，已分配 ${newId}`);
        tracks[i].id = newId;
      }
    }

    // 5. 检查必填字段
    for (const track of tracks) {
      if (!track.characterName) {
        issues.push(`${track.id} 缺少视角名称`);
      }
      if (!track.status || !['推演中', '已汇入'].includes(track.status)) {
        issues.push(`${track.id} 状态异常: ${track.status}`);
      }
    }

    return {
      valid: issues.length === 0,
      tracks,
      issues,
    };
  },

  /**
   * 校验资产表格约束
   * @param {Object} floorData - 资产数据
   * @returns {Object} { valid: boolean, issues: Array, repaired: Object }
   */
  validateFloorDataConstraints(floorData) {
    const issues = [];
    const repaired = deepClone(floorData || {});

    // 单行表约束: 集团架构表、资产总览表
    const singleRowTables = ['sheet_bizStruct', 'sheet_assetOVW0'];
    for (const sheetKey of singleRowTables) {
      const sheet = repaired[sheetKey];
      if (sheet?.content && sheet.content.length > 2) {
        // 表头 + 数据行 > 2 表示有多行数据
        issues.push(`${sheetKey} 违反单行表约束: 有${sheet.content.length - 1}行数据，已截断为1行`);
        sheet.content = [sheet.content[0], sheet.content[1]];
      }
    }

    // 检查表头完整性
    const requiredSheets = [
      { key: 'sheet_bizStruct', minCols: 11 },
      { key: 'sheet_assetOVW0', minCols: 9 },
      { key: 'sheet_rlEst02b', minCols: 7 },
      { key: 'sheet_cashInv1a', minCols: 6 },
      { key: 'sheet_luxuryAssets', minCols: 9 },
      { key: 'sheet_bizSegments', minCols: 12 },
      { key: 'sheet_dbt4Lst4', minCols: 8 },
    ];

    for (const { key, minCols } of requiredSheets) {
      const sheet = repaired[key];
      if (sheet?.content && sheet.content[0]) {
        const colCount = sheet.content[0].length;
        if (colCount < minCols) {
          issues.push(`${key} 列数不足: 预期${minCols}, 实际${colCount}`);
        }
      }
    }

    // 3. 校验并修复员工审计数据（汇总各业务板块人员结构）
    const staffValidation = this.validateAndRepairStaffAudit(repaired);
    if (staffValidation.issues.length > 0) {
      issues.push(...staffValidation.issues);
    }

    return {
      valid: issues.length === 0,
      issues,
      repaired: staffValidation.repaired,
    };
  },

  /**
   * 综合校验 AI 输出
   * @param {Object} parsedResult - AI 返回的解析后数据
   * @param {Object} previousData - 前一楼层的数据
   * @returns {Object} { valid: boolean, data: Object, issues: Array, autoRepaired: boolean }
   */
  validateAIParsedResult(parsedResult, previousData) {
    const allIssues = [];
    let autoRepaired = false;

    // 深拷贝避免修改原始数据
    const result = deepClone(parsedResult || {});

    // 1. 校验视角推演
    const prevTracks = previousData?.worldSimulation?.tracks || [];
    const currentTracks = result?.worldSimulation?.tracks || [];
    const trackValidation = this.validateAndRepairTracks(currentTracks, prevTracks);

    if (trackValidation.issues.length > 0) {
      allIssues.push(...trackValidation.issues);
    }
    if (!trackValidation.valid) {
      autoRepaired = true;
    }
    result.worldSimulation.tracks = trackValidation.tracks;

    // 2. 校验资产数据约束
    const floorData = result?.floorData;
    if (floorData) {
      const empireValidation = this.validateFloorDataConstraints(floorData);
      if (empireValidation.issues.length > 0) {
        allIssues.push(...empireValidation.issues);
        autoRepaired = true;
      }
      result.floorData = empireValidation.repaired;
    }

    // 3. 校验 checks 字段
    if (result?.worldSimulation?.checks) {
      const checks = result.worldSimulation.checks;
      if (!checks.allTracksAdvanced) {
        allIssues.push('推演检查未通过: 不是所有推演中视角都已更新');
      }
      if (!checks.convergenceChecked) {
        allIssues.push('汇入检查未通过');
      }
    }

    const { blockingIssues, warningIssues } = this.splitValidationIssues(allIssues);

    return {
      valid: allIssues.length === 0,
      data: result,
      issues: allIssues,
      blockingIssues,
      warningIssues,
      autoRepaired,
    };
  },

  /**
   * 解析人员结构字符串
   * 格式: "高管·人数·(忠诚度)|中层·人数|基层·人数"
   * @param {string} staffStr - 人员结构字符串
   * @returns {Object} { executives: {count, loyalty}, middle: {count}, grassroots: {count} }
   */
  parseStaffStructure(staffStr) {
    if (!staffStr || typeof staffStr !== 'string') return null;

    const result = {
      executives: { count: 0, loyalty: null },
      middle: { count: 0 },
      grassroots: { count: 0 },
    };

    const parts = staffStr.split('|');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith('高管·')) {
        const match = trimmed.match(/高管·(\d+)(?:·\((\d+)\))?/);
        if (match) {
          result.executives.count = Number.parseInt(match[1], 10) || 0;
          result.executives.loyalty = match[2] ? Number.parseInt(match[2], 10) : null;
        }
      } else if (trimmed.startsWith('中层·')) {
        const match = trimmed.match(/中层·(\d+)/);
        if (match) {
          result.middle.count = Number.parseInt(match[1], 10) || 0;
        }
      } else if (trimmed.startsWith('基层·')) {
        const match = trimmed.match(/基层·(\d+)/);
        if (match) {
          result.grassroots.count = Number.parseInt(match[1], 10) || 0;
        }
      }
    }

    return result;
  },

  /**
   * 计算集团员工审计（汇总各业务板块人员结构）
   * @param {Array} segments - 业务板块数据行（不含表头）
   * @returns {string} 格式: "核心·人数·(均忠诚度)|高管·人数·(忠诚度)|中层·人数|基层·人数"
   */
  calculateGroupStaffAudit(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return '';

    let totalExecutives = 0;
    let totalMiddle = 0;
    let totalGrassroots = 0;
    let totalLoyalty = 0;
    let loyaltyCount = 0;

    // 遍历各业务板块（跳过表头）
    for (let i = 0; i < segments.length; i += 1) {
      const row = segments[i];
      // 人员结构在第10列（索引10）
      const staffStr = row?.[10] || '';
      const parsed = this.parseStaffStructure(staffStr);

      if (parsed) {
        totalExecutives += parsed.executives.count;
        totalMiddle += parsed.middle.count;
        totalGrassroots += parsed.grassroots.count;

        if (parsed.executives.loyalty !== null) {
          totalLoyalty += parsed.executives.loyalty * parsed.executives.count;
          loyaltyCount += parsed.executives.count;
        }
      }
    }

    // 计算平均忠诚度
    const avgLoyalty = loyaltyCount > 0 ? Math.round(totalLoyalty / loyaltyCount) : null;

    // 核心层人数 = 高管人数（简化处理，实际可能有单独的核心层定义）
    const coreCount = Math.max(1, Math.ceil(totalExecutives * 0.2)); // 假设20%是核心
    const coreLoyalty = avgLoyalty;

    // 高管平均忠诚度
    const execLoyalty = avgLoyalty;

    // 组装字符串
    const parts = [
      `核心·${coreCount}·(${coreLoyalty !== null ? coreLoyalty : 50})`,
      `高管·${totalExecutives}·(${execLoyalty !== null ? execLoyalty : 50})`,
      `中层·${totalMiddle}`,
      `基层·${totalGrassroots}`,
    ];

    return parts.join('|');
  },

  /**
   * 校验并修复员工审计数据
   * 集团架构表的员工审计应该等于各业务板块人员结构的汇总
   * @param {Object} floorData - 资产数据
   * @returns {Object} { valid: boolean, repaired: Object, issues: Array }
   */
  validateAndRepairStaffAudit(floorData) {
    const issues = [];
    const repaired = deepClone(floorData || {});

    const bizStruct = repaired.sheet_bizStruct;
    const bizSegments = repaired.sheet_bizSegments;

    if (!bizStruct?.content || !bizSegments?.content) {
      return { valid: true, repaired, issues: [] };
    }

    // 获取业务板块数据（跳过表头）
    const segmentRows = bizSegments.content.slice(1);
    const calculatedAudit = this.calculateGroupStaffAudit(segmentRows);

    if (!calculatedAudit) {
      return { valid: true, repaired, issues: [] };
    }

    // 获取当前集团架构表的员工审计（第10列，索引10）
    const currentRow = bizStruct.content[1];
    const currentAudit = currentRow?.[10] || '';

    if (currentAudit !== calculatedAudit) {
      issues.push(
        `员工审计不匹配: 当前"${currentAudit}", 计算值"${calculatedAudit}", 已自动修正`
      );

      // 更新集团架构表的员工审计
      if (!bizStruct.content[1]) {
        bizStruct.content[1] = [...bizStruct.content[0]];
      }
      bizStruct.content[1][10] = calculatedAudit;
    }

    // 检查人员结构比例是否失衡（基层/中层 > 5 视为失衡）
    const parsed = this.parseStaffStructure(calculatedAudit);
    if (parsed) {
      const { middle, grassroots } = parsed;
      if (middle.count > 0 && grassroots.count / middle.count > 5) {
        issues.push(
          `警告: 人员结构比例失衡 (基层${grassroots.count}/中层${middle.count}=${(grassroots.count / middle.count).toFixed(1)}), 可能触发管理失控`
        );
      }
      if (parsed.executives.loyalty !== null && parsed.executives.loyalty < 50) {
        issues.push(
          `警告: 高管平均忠诚度${parsed.executives.loyalty}% < 50%, 可能触发叛变/贪腐事件`
        );
      }
    }

    return {
      valid: issues.length === 0 || !issues.some((i) => i.includes('已自动修正')),
      repaired,
      issues,
    };
  },

  /**
   * 过滤已汇入视角（在发送给 AI 之前）
   * @param {Array} tracks - 视角列表
   * @returns {Array} 过滤后的视角列表
   */
  filterConvergedTracks(tracks) {
    if (!Array.isArray(tracks)) return [];
    return tracks.filter((t) => t.status !== '已汇入');
  },

  /**
   * 生成下一个视角编号
   * @param {Array} tracks - 当前视角列表
   * @returns {string} 下一个编号如 "BG.5"
   */
  getNextTrackId(tracks) {
    const maxNum = (tracks || []).reduce((max, t) => {
      const match = String(t?.id || '').match(/BG\.(\d+)/);
      return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
    }, 0);
    return `BG.${maxNum + 1}`;
  },
};

// ---- src/core/BizSimEngine.js ----
class BizSimEngine {
  constructor() {
    this.config = deepClone(BIZSIM_CONFIG);
    this.data = null;
    this.worldSimulation = null;
    this.lastPromptSnapshot = '';
    this.lastPromptBuiltAt = null;
    this.promptTemplates = {
      COMPOSE_PROMPT: PROMPTS.COMPOSE_PROMPT,
      BREAK_PROMPT: PROMPTS.BREAK_PROMPT,
      CORE_PROMPT_BLOCK: PROMPTS.CORE_PROMPT_BLOCK,
      EMPIRE_AUDIT: PROMPTS.EMPIRE_AUDIT,
    };
    this.initialized = false;
    this.presetManager = null;
  }

  async initialize() {
    try {
      // 1. 从角色变量读取设置
      const charVars = await getCharacterVariablesSafe();
      const savedSettings = getByPath(charVars, `${this.config.VAR_PATH}.settings`);

      if (savedSettings) {
        if (savedSettings.LLM) {
          this.config.LLM = { ...this.config.LLM, ...savedSettings.LLM };
        }
        if (savedSettings.SIMULATION) {
          const migratedSimulation = { ...savedSettings.SIMULATION };
          if (migratedSimulation.includeFloorData === undefined && migratedSimulation.includeEmpireData !== undefined) {
            migratedSimulation.includeFloorData = !!migratedSimulation.includeEmpireData;
          }
          this.config.SIMULATION = { ...this.config.SIMULATION, ...migratedSimulation };
        }
        if (savedSettings.AUDIT) {
          this.config.AUDIT = { ...this.config.AUDIT, ...savedSettings.AUDIT };
        }
        if (savedSettings.prompts) {
          this.promptTemplates = { ...this.promptTemplates, ...savedSettings.prompts };
        }
      }

      // 2. 从楼层变量读取数据
      const messageId = getCurrentMessageIdSafe();
      const floorVars = getMessageVariablesSafe(messageId);

      if (floorVars) {
        const scoped = this.resolveFloorStatDataSource(floorVars);
        if (scoped) {
          const assetsData = this.extractAssetStatPayload(scoped);
          if (assetsData) {
            this.data = this.buildFloorDataFromSemanticAssets(assetsData);
          }

          const worldData = this.extractWorldSimulationPayload(scoped);
          if (worldData) {
            this.worldSimulation = worldData;
          }
        }
      }

      // 3. 如果没有找到楼层数据，使用默认值
      if (!this.data) {
        this.data = this.getDefaultFloorData();
      }
      if (!this.worldSimulation) {
        this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
      }

      // 初始化 tplRaw 和 tpl（支持模块化架构）
      this.initializePromptTemplates();

      // 初始化预设管理器
      this.presetManager = new PromptPresetManager(this);

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[BizSim] 初始化失败:', error);
      this.data = this.getDefaultFloorData();
      this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
      this.initialized = false;
      return false;
    }
  }

  initializePromptTemplates() {
    const cfg = this.config.SIMULATION;

    if (!cfg.tplRaw || !Array.isArray(cfg.tplRaw.scaffold)) {
      cfg.tplRaw = createDefaultTemplateStructure();
    }

    cfg.tplRaw = ensureCurrentTemplateStructure(cfg.tplRaw);

    cfg.tpl = compileTemplateWithUserPref(cfg.tplRaw, cfg.userPref);
  }

  getDefaultFloorData() {
    return deepClone(DEFAULT_DATA);
  }

  async saveData() {
    try {
      // 1. 保存设置到角色变量
      const safeLLM = {
        ...this.config.LLM,
        apiKey: this.config.LLM.persistApiKey ? this.config.LLM.apiKey : '',
      };

      const settingsPayload = {
        [this.config.VAR_PATH]: {
          settings: {
            LLM: safeLLM,
            SIMULATION: this.config.SIMULATION,
            AUDIT: this.config.AUDIT,
            prompts: this.promptTemplates,
          },
          lastUpdate: new Date().toISOString(),
          version: this.config.VERSION,
        },
      };

      insertOrAssignVariablesSafe(settingsPayload);

      // 2. 保存数据到楼层变量
      const messageId = getCurrentMessageIdSafe();
      if (messageId !== null && messageId !== undefined) {
        const { assetsKey, worldStateKey } = this.getFloorNamespaceKeys();
        const semanticAssets = this.normalizeBizsimAssetsPayload(this.buildSemanticAssetsFromFloorData(this.data));
        const floorVars = getMessageVariablesSafe(messageId);
        const currentScoped = this.resolveFloorStatDataSource(floorVars);
        const baseStatData = currentScoped && typeof currentScoped === 'object'
          ? deepClone(currentScoped)
          : {};

        const floorPayload = {
          stat_data: {
            ...baseStatData,
            [assetsKey]: semanticAssets,
            [worldStateKey]: this.worldSimulation,
          },
        };

        insertOrAssignVariablesSafe(floorPayload, { type: 'message', message_id: messageId });
      }

      return true;
    } catch (error) {
      console.error('[BizSim] 保存失败:', error);
      return false;
    }
  }

  getPromptTemplate(key) {
    return this.promptTemplates?.[key] || PROMPTS[key] || '';
  }

  async reloadFromVariables() {
    return this.reloadFromFloorVariables();
  }

  async reloadFromFloorVariables() {
    try {
      console.log('[BizSim Debug] reloadFromFloorVariables() 开始执行');

      // 只从楼层变量读取数据
      const messageId = getCurrentMessageIdSafe();
      console.log('[BizSim Debug] messageId:', messageId);

      const floorVars = getMessageVariablesSafe(messageId);
      console.log('[BizSim Debug] floorVars:', floorVars);

      if (floorVars) {
        const scoped = this.resolveFloorStatDataSource(floorVars);
        console.log('[BizSim Debug] scoped:', scoped);

        if (scoped) {
          // 提取 floorData
          const assetsData = this.extractAssetStatPayload(scoped);
          console.log('[BizSim Debug] assetsData:', assetsData);

          if (assetsData) {
            this.data = this.buildFloorDataFromSemanticAssets(assetsData);
          }

          // 提取 worldSimulation
          const worldData = this.extractWorldSimulationPayload(scoped);
          console.log('[BizSim Debug] worldData:', worldData);

          if (worldData) {
            this.worldSimulation = worldData;
          }

          // 如果没有找到楼层数据，使用默认值
          if (!this.data) {
            this.data = this.getDefaultFloorData();
          }
          if (!this.worldSimulation) {
            this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
          }

          console.log('[BizSim] 已从楼层变量重新加载数据');
          console.log('[BizSim Debug] 加载后的 this.data:', this.data);
          return true;
        }
      }

      // 楼层变量中无数据，重置为默认
      console.log('[BizSim Debug] 楼层变量中无数据，重置为默认值');
      this.data = this.getDefaultFloorData();
      this.worldSimulation = deepClone(DEFAULT_WORLD_SIMULATION);
      console.log('[BizSim] 楼层变量中无数据，已重置为默认值');
      console.log('[BizSim Debug] 重置后的 this.data:', this.data);
      return true;
    } catch (error) {
      console.error('[BizSim] 从楼层变量重新加载失败:', error);
      return false;
    }
  }
}

Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_PROMPT_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_VALIDATION_METHODS);
Object.assign(BizSimEngine.prototype, BIZSIM_ENGINE_CONTEXT_METHODS);

// ---- src/ui/templates.js ----
function createMainPanelHtml(engine) {
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
              <label><input type="checkbox" id="sim-body-injection-enabled" ${engine.config.SIMULATION.bodyInjectionEnabled ? 'checked' : ''}> 正文注入</label>
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

// ---- src/ui/BizSimUI.worldbook.js ----
function initWorldbookPanel(ui) {
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

function refreshWorldbookBindingHint(ui) {
  const hint = ui.byId('sim-worldbook-binding-hint');
  if (!hint) return;

  const selectedName = ui.byId('sim-worldbook-name')?.value || '';
  const defaultName = ui.engine.getDefaultWorldbookName();
  const effectiveName = selectedName || defaultName || '';
  hint.textContent = effectiveName
    ? `当前实际注入：${effectiveName}${selectedName ? '' : '（来自当前角色/聊天绑定）'}`
    : '未找到可用世界书';
}

async function loadWorldbookEntries(ui, worldbookName) {
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

function renderWorldbookEntries(ui, entries) {
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

function setWorldbookSelections(ui, checked) {
  ui.$$('.bizsim-worldbook-entry-checkbox').forEach((checkbox) => {
    checkbox.checked = checked;
  });
  syncWorldbookSelectionsToConfig(ui);
}

function syncWorldbookSelectionsToConfig(ui) {
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

// ---- src/ui/BizSimUI.prompts.js ----
function buildQuickFingerprint(value) {
  if (!value || typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `arr:${value.length}`;

  const keys = Object.keys(value);
  let score = keys.length;
  for (const key of keys.slice(0, 20)) {
    const cur = value[key];
    if (Array.isArray(cur)) score += cur.length;
    else if (cur && typeof cur === 'object') score += Object.keys(cur).length;
    else if (typeof cur === 'string') score += cur.length;
    else if (typeof cur === 'number') score += cur;
  }
  return `obj:${keys.length}:${score}`;
}

function memoSerialize(ui, slot, value) {
  const cache = ui.__previewSerializeCache || (ui.__previewSerializeCache = {});
  const record = cache[slot] || {};
  const ref = value;
  const fp = buildQuickFingerprint(value);

  if (record.ref === ref && record.fp === fp && typeof record.text === 'string') {
    return record.text;
  }

  const text = JSON.stringify(value || {}, null, 2);
  cache[slot] = { ref, fp, text };
  return text;
}

async function buildLivePromptPreview(ui) {
  const historyLimit = Number(ui.engine.config.SIMULATION?.historyLimit) || 10;
  const historyText = ui.engine.formatHistoryText(getChatHistorySafe(historyLimit));
  const floorDataText = memoSerialize(ui, 'empire', ui.engine.data || {});
  const worldStateText = memoSerialize(ui, 'world', ui.engine.worldSimulation || {});
  const useHistory = !!ui.byId('sim-use-history')?.checked;
  return ui.engine.buildSimulationPrompt({ historyText, floorDataText, worldStateText, useHistory });
}

function setPromptViewMode(ui, mode) {
  ui.promptViewMode = mode === 'lastSent' ? 'lastSent' : 'preview';
  const btn = ui.byId('btn-toggle-prompt-source');
  if (btn) {
    btn.textContent = ui.promptViewMode === 'preview' ? '查看上次真实发送' : '查看当前构建预览';
  }
}

function togglePromptViewMode(ui) {
  setPromptViewMode(ui, ui.promptViewMode === 'preview' ? 'lastSent' : 'preview');
  return refreshPromptSnapshot(ui);
}

async function refreshPromptSnapshot(ui) {
  if (ui.__refreshPromptInFlight) {
    return ui.__refreshPromptInFlight;
  }

  ui.__refreshPromptInFlight = (async () => {
  if (!ui.promptViewMode) ui.promptViewMode = 'preview';

  const view = ui.byId('prompt-snapshot-view');
  const meta = ui.byId('prompt-snapshot-meta');

  let content = '';
  let modeText = '';

  if (ui.promptViewMode === 'lastSent') {
    content = ui.engine.getLastPromptSnapshot?.() || ui.engine.lastPromptSnapshot || '';
    modeText = '上次真实发送';
  } else {
    try {
      content = await buildLivePromptPreview(ui);
      modeText = '当前构建预览';
    } catch (error) {
      content = '';
      modeText = `预览失败: ${error.message}`;
    }
  }

  if (view) view.value = content;

  if (meta) {
    const builtAt = ui.engine.lastPromptBuiltAt ? new Date(ui.engine.lastPromptBuiltAt) : null;
    const sentAtText = builtAt && !Number.isNaN(builtAt.getTime()) ? ` · 上次发送 ${builtAt.toLocaleString()}` : '';
    meta.textContent = content ? `${modeText} · 长度 ${content.length} 字符${sentAtText}` : `${modeText} · 暂无内容`;
  }
  })();

  try {
    return await ui.__refreshPromptInFlight;
  } finally {
    ui.__refreshPromptInFlight = null;
  }
}

async function copyLastPromptSnapshot(ui) {
  const snapshot = ui.byId('prompt-snapshot-view')?.value || '';
  if (!snapshot) {
    if (typeof toastr !== 'undefined') toastr.warning('当前没有可复制的提示词');
    return;
  }

  try {
    await navigator.clipboard.writeText(snapshot);
    if (typeof toastr !== 'undefined') toastr.success('已复制上一次提示词');
  } catch {
    if (typeof toastr !== 'undefined') toastr.error('复制失败');
  }
}

// ---- src/ui/BizSimUI.render.js ----
function refreshDashboard(ui) {
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

function refreshEmpire(ui) {
  ui.showSheet(ui.currentEmpireSheet || 'sheet_assetOVW0', true);
}

function showSheet(ui, sheetName, silent = false) {
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

function refreshTracks(ui) {
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

function showAddTrackForm(ui) {
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

function log(ui, message) {
  const logDiv = ui.byId('bizsim-logs');
  if (!logDiv) return;

  const time = new Date().toLocaleTimeString();
  logDiv.innerHTML += `\n[${time}] ${message}`;
  logDiv.scrollTop = logDiv.scrollHeight;
}

// ---- src/ui/BizSimUI.settings.js ----
function setModelStatus(ui, message, type = 'info') {
  const statusEl = ui.byId('setting-model-status');
  if (!statusEl) return;

  const colorMap = { info: '#90caf9', success: '#81c784', warning: '#ffb74d', error: '#ef9a9a' };
  statusEl.style.color = colorMap[type] || colorMap.info;
  statusEl.textContent = message;
}

function normalizeBaseApiUrl(url) {
  let base = String(url || '').trim().replace(/\/$/, '');
  base = base.replace(/\/chat\/completions$/i, '');
  if (!/\/v\d+$/i.test(base)) base += '/v1';
  return base;
}

function buildModelsUrl(apiUrl) {
  return `${normalizeBaseApiUrl(apiUrl)}/models`;
}

function parseModelListResponse(data) {
  let models = [];
  if (data && Array.isArray(data.data)) {
    models = data.data.map((item) => item?.id).filter(Boolean);
  } else if (data && Array.isArray(data.models)) {
    models = data.models.map((item) => item?.name || item?.id).filter(Boolean);
  } else if (Array.isArray(data)) {
    models = data.map((item) => (typeof item === 'string' ? item : item?.id)).filter(Boolean);
  }
  return [...new Set(models)].sort((a, b) => a.localeCompare(b));
}

function syncModelInputToSelect(ui) {
  const input = ui.byId('setting-model');
  const select = ui.byId('setting-model-select');
  if (!input || !select) return;

  const model = input.value?.trim();
  if (!model) {
    select.value = '';
    return;
  }

  let option = Array.from(select.options).find((o) => o.value === model);
  if (!option) {
    option = ui.rootDoc.createElement('option');
    option.value = model;
    option.textContent = `${model}（自定义）`;
    select.appendChild(option);
  }
  select.value = model;
}

async function fetchModels(ui) {
  const apiUrl = ui.byId('setting-api-url')?.value?.trim();
  const apiKey = ui.byId('setting-api-key')?.value?.trim();
  const modelSelect = ui.byId('setting-model-select');
  const btn = ui.byId('btn-fetch-models');

  if (!apiUrl) {
    setModelStatus(ui, '请先填写 API 地址', 'warning');
    if (typeof toastr !== 'undefined') toastr.warning('请先填写 API 地址');
    return;
  }
  if (!modelSelect || !btn) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '拉取中...';

  try {
    const headers = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(buildModelsUrl(apiUrl), { method: 'GET', headers });
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`HTTP ${response.status}: ${txt.slice(0, 180)}`);
    }

    const data = await response.json();
    const models = parseModelListResponse(data);
    modelSelect.innerHTML = '';

    const placeholder = ui.rootDoc.createElement('option');
    placeholder.value = '';
    placeholder.textContent = models.length ? '请选择模型' : '未获取到模型';
    placeholder.disabled = true;
    placeholder.selected = true;
    modelSelect.appendChild(placeholder);

    models.forEach((model) => {
      const option = ui.rootDoc.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });

    if (models.length) {
      setModelStatus(ui, `成功拉取 ${models.length} 个模型`, 'success');
      if (typeof toastr !== 'undefined') toastr.success(`成功拉取 ${models.length} 个模型`);
    } else {
      setModelStatus(ui, '返回成功，但模型列表为空或格式不可识别', 'warning');
    }

    syncModelInputToSelect(ui);
  } catch (error) {
    setModelStatus(ui, `拉取失败: ${error.message}`, 'error');
    if (typeof toastr !== 'undefined') toastr.error(`拉取模型失败: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText || '拉取模型';
  }
}

function saveSimulationSettings(ui, silent = false) {
  ui.syncWorldbookSelectionsToConfig();

  const simulationMode = ui.byId('sim-mode')?.value || 'balanced';
  const useHistory = !!ui.byId('sim-use-history')?.checked;
  const autoSave = !!ui.byId('sim-auto-save')?.checked;
  const historyLimit = Number.parseInt(ui.byId('sim-history-limit')?.value, 10);
  const assetHistoryFloors = Number.parseInt(ui.byId('sim-asset-history-floors')?.value, 10);
  const worldHistoryFloors = Number.parseInt(ui.byId('sim-world-history-floors')?.value, 10);
  const includeFloorData = !!ui.byId('sim-include-floor-data')?.checked;
  const includeWorldState = !!ui.byId('sim-include-world-state')?.checked;
  const bodyInjectionEnabled = !!ui.byId('sim-body-injection-enabled')?.checked;
  const retryCount = Number.parseInt(ui.byId('sim-retry-count')?.value, 10);
  const repairOnParseError = !!ui.byId('sim-repair-on-parse')?.checked;
  const autoRunEnabled = !!ui.byId('sim-auto-run-enabled')?.checked;
  const autoRunOnlyAssistant = !!ui.byId('sim-auto-run-only-assistant')?.checked;
  const autoRunAssistantFloorInterval = Number.parseInt(ui.byId('sim-auto-run-assistant-floor-interval')?.value, 10);
  const autoRunUseHistory = !!ui.byId('sim-auto-run-use-history')?.checked;
  const autoRunMinChars = Number.parseInt(ui.byId('sim-auto-run-min-chars')?.value, 10);
  const autoRunCooldownSec = Number.parseInt(ui.byId('sim-auto-run-cooldown')?.value, 10);
  const trackPrefix = (ui.byId('sim-track-prefix')?.value || 'BG').trim() || 'BG';
  const contentExtractTags = (ui.byId("sim-content-extract-tags")?.value || "content,game").trim();
  const contentExcludeTags = (ui.byId('sim-content-exclude-tags')?.value || '').trim();
  const minTracks = Number.parseInt(ui.byId('sim-min-tracks')?.value, 10);
  const maxTracks = Number.parseInt(ui.byId('sim-max-tracks')?.value, 10);
  const cashToleranceWan = Number.parseFloat(ui.byId('sim-cash-tolerance')?.value);
  const enterpriseToleranceWan = Number.parseFloat(ui.byId('sim-enterprise-tolerance')?.value);
  const loyaltyThreshold = Number.parseInt(ui.byId('sim-loyalty-threshold')?.value, 10);
  const liquidationMin = Number.parseFloat(ui.byId('sim-liquidation-min')?.value);
  const liquidationMax = Number.parseFloat(ui.byId('sim-liquidation-max')?.value);
  const useActiveWorldbooks = !!ui.byId('sim-use-active-worldbooks')?.checked;
  const worldbookNames = (ui.byId('sim-worldbook-names')?.value || '').trim();
  const worldbookEntrySelectors = (ui.byId('sim-worldbook-entry-selectors')?.value || '').trim();
  const worldbookEntryLimit = Number.parseInt(ui.byId('sim-worldbook-entry-limit')?.value, 10);

  ui.engine.config.SIMULATION.mode = simulationMode;
  ui.engine.config.SIMULATION.useActiveWorldbooks = useActiveWorldbooks;
  ui.engine.config.SIMULATION.worldbookNames = worldbookNames;
  ui.engine.config.SIMULATION.worldbookEntrySelectors = worldbookEntrySelectors;
  if (!Number.isNaN(worldbookEntryLimit) && worldbookEntryLimit > 0) ui.engine.config.SIMULATION.worldbookEntryLimit = worldbookEntryLimit;
  ui.engine.config.SIMULATION.useHistory = useHistory;
  ui.engine.config.SIMULATION.autoSave = autoSave;
  ui.engine.config.SIMULATION.includeFloorData = includeFloorData;
  ui.engine.config.SIMULATION.includeWorldState = includeWorldState;
  ui.engine.config.SIMULATION.bodyInjectionEnabled = bodyInjectionEnabled;
  ui.engine.config.SIMULATION.repairOnParseError = repairOnParseError;
  ui.engine.config.SIMULATION.autoRunEnabled = autoRunEnabled;
  ui.engine.config.SIMULATION.autoRunOnlyAssistant = autoRunOnlyAssistant;
  if (!Number.isNaN(autoRunAssistantFloorInterval) && autoRunAssistantFloorInterval > 0) {
    ui.engine.config.SIMULATION.autoRunAssistantFloorInterval = autoRunAssistantFloorInterval;
  }
  ui.engine.config.SIMULATION.autoRunUseHistory = autoRunUseHistory;
  ui.engine.config.SIMULATION.trackPrefix = trackPrefix;
  ui.engine.config.SIMULATION.worldbookName = ui.byId('sim-worldbook-name')?.value?.trim() || '';

  if (!Number.isNaN(historyLimit) && historyLimit > 0) ui.engine.config.SIMULATION.historyLimit = historyLimit;
  if (!Number.isNaN(assetHistoryFloors) && assetHistoryFloors > 0) ui.engine.config.SIMULATION.assetHistoryFloors = assetHistoryFloors;
  if (!Number.isNaN(worldHistoryFloors) && worldHistoryFloors > 0) ui.engine.config.SIMULATION.worldHistoryFloors = worldHistoryFloors;
  if (!Number.isNaN(retryCount) && retryCount >= 0) ui.engine.config.SIMULATION.retryCount = retryCount;
  if (!Number.isNaN(autoRunMinChars) && autoRunMinChars >= 0) ui.engine.config.SIMULATION.autoRunMinChars = autoRunMinChars;
  if (!Number.isNaN(autoRunCooldownSec) && autoRunCooldownSec >= 0) ui.engine.config.SIMULATION.autoRunCooldownSec = autoRunCooldownSec;
  if (!Number.isNaN(minTracks) && minTracks > 0) ui.engine.config.SIMULATION.minTracks = minTracks;
  if (!Number.isNaN(maxTracks) && maxTracks >= ui.engine.config.SIMULATION.minTracks) ui.engine.config.SIMULATION.maxTracks = maxTracks;
  ui.engine.config.SIMULATION.contentExtractTags = contentExtractTags;
  ui.engine.config.SIMULATION.contentExcludeTags = contentExcludeTags;
  if (!Number.isNaN(cashToleranceWan) && cashToleranceWan >= 0) ui.engine.config.AUDIT.cashToleranceWan = cashToleranceWan;
  if (!Number.isNaN(enterpriseToleranceWan) && enterpriseToleranceWan >= 0) ui.engine.config.AUDIT.enterpriseToleranceWan = enterpriseToleranceWan;
  if (!Number.isNaN(loyaltyThreshold) && loyaltyThreshold >= 0) ui.engine.config.AUDIT.loyaltyThreshold = loyaltyThreshold;
  if (!Number.isNaN(liquidationMin) && liquidationMin >= 0) ui.engine.config.AUDIT.liquidationPenalty.min = liquidationMin;
  if (!Number.isNaN(liquidationMax) && liquidationMax >= 0) ui.engine.config.AUDIT.liquidationPenalty.max = liquidationMax;

  if (ui.engine.config.AUDIT.liquidationPenalty.min > ui.engine.config.AUDIT.liquidationPenalty.max) {
    const temp = ui.engine.config.AUDIT.liquidationPenalty.min;
    ui.engine.config.AUDIT.liquidationPenalty.min = ui.engine.config.AUDIT.liquidationPenalty.max;
    ui.engine.config.AUDIT.liquidationPenalty.max = temp;
  }

  ui.engine.saveData();
  ui.log('推演配置已保存');
  if (!silent && typeof toastr !== 'undefined') toastr.success('推演配置已保存');
  return useHistory;
}

function resetSimulationSettings(ui) {
  ui.engine.config.SIMULATION = JSON.parse(JSON.stringify(BIZSIM_CONFIG.SIMULATION));
  ui.engine.config.AUDIT = JSON.parse(JSON.stringify(BIZSIM_CONFIG.AUDIT));

  if (ui.byId('sim-mode')) ui.byId('sim-mode').value = ui.engine.config.SIMULATION.mode;
  if (ui.byId('sim-use-history')) ui.byId('sim-use-history').checked = ui.engine.config.SIMULATION.useHistory !== false;
  if (ui.byId('sim-auto-save')) ui.byId('sim-auto-save').checked = ui.engine.config.SIMULATION.autoSave;
  if (ui.byId('sim-history-limit')) ui.byId('sim-history-limit').value = ui.engine.config.SIMULATION.historyLimit;
  if (ui.byId('sim-asset-history-floors')) ui.byId('sim-asset-history-floors').value = ui.engine.config.SIMULATION.assetHistoryFloors;
  if (ui.byId('sim-world-history-floors')) ui.byId('sim-world-history-floors').value = ui.engine.config.SIMULATION.worldHistoryFloors;
  if (ui.byId('sim-include-floor-data')) ui.byId('sim-include-floor-data').checked = ui.engine.config.SIMULATION.includeFloorData !== false;
  if (ui.byId('sim-include-world-state')) ui.byId('sim-include-world-state').checked = ui.engine.config.SIMULATION.includeWorldState;
  if (ui.byId('sim-body-injection-enabled')) ui.byId('sim-body-injection-enabled').checked = ui.engine.config.SIMULATION.bodyInjectionEnabled === true;
  if (ui.byId('sim-worldbook-name')) ui.byId('sim-worldbook-name').value = ui.engine.config.SIMULATION.worldbookName || '';
  if (ui.byId('sim-retry-count')) ui.byId('sim-retry-count').value = ui.engine.config.SIMULATION.retryCount;
  if (ui.byId('sim-repair-on-parse')) ui.byId('sim-repair-on-parse').checked = ui.engine.config.SIMULATION.repairOnParseError;
  if (ui.byId('sim-auto-run-enabled')) ui.byId('sim-auto-run-enabled').checked = !!ui.engine.config.SIMULATION.autoRunEnabled;
  if (ui.byId('sim-auto-run-only-assistant')) ui.byId('sim-auto-run-only-assistant').checked = ui.engine.config.SIMULATION.autoRunOnlyAssistant !== false;
  if (ui.byId('sim-auto-run-assistant-floor-interval')) ui.byId('sim-auto-run-assistant-floor-interval').value = ui.engine.config.SIMULATION.autoRunAssistantFloorInterval ?? 1;
  if (ui.byId('sim-auto-run-use-history')) ui.byId('sim-auto-run-use-history').checked = ui.engine.config.SIMULATION.autoRunUseHistory !== false;
  if (ui.byId('sim-auto-run-min-chars')) ui.byId('sim-auto-run-min-chars').value = ui.engine.config.SIMULATION.autoRunMinChars ?? 300;
  if (ui.byId('sim-auto-run-cooldown')) ui.byId('sim-auto-run-cooldown').value = ui.engine.config.SIMULATION.autoRunCooldownSec ?? 8;
  if (ui.byId("sim-content-extract-tags")) ui.byId("sim-content-extract-tags").value = ui.engine.config.SIMULATION.contentExtractTags;
  if (ui.byId('sim-content-exclude-tags')) ui.byId('sim-content-exclude-tags').value = ui.engine.config.SIMULATION.contentExcludeTags || '';
  if (ui.byId('sim-track-prefix')) ui.byId('sim-track-prefix').value = ui.engine.config.SIMULATION.trackPrefix;
  if (ui.byId('sim-min-tracks')) ui.byId('sim-min-tracks').value = ui.engine.config.SIMULATION.minTracks;
  if (ui.byId('sim-max-tracks')) ui.byId('sim-max-tracks').value = ui.engine.config.SIMULATION.maxTracks;
  if (ui.byId('sim-cash-tolerance')) ui.byId('sim-cash-tolerance').value = ui.engine.config.AUDIT.cashToleranceWan;
  if (ui.byId('sim-enterprise-tolerance')) ui.byId('sim-enterprise-tolerance').value = ui.engine.config.AUDIT.enterpriseToleranceWan;
  if (ui.byId('sim-loyalty-threshold')) ui.byId('sim-loyalty-threshold').value = ui.engine.config.AUDIT.loyaltyThreshold;
  if (ui.byId('sim-liquidation-min')) ui.byId('sim-liquidation-min').value = ui.engine.config.AUDIT.liquidationPenalty.min;
  if (ui.byId('sim-liquidation-max')) ui.byId('sim-liquidation-max').value = ui.engine.config.AUDIT.liquidationPenalty.max;
  if (ui.byId('sim-use-active-worldbooks')) ui.byId('sim-use-active-worldbooks').checked = ui.engine.config.SIMULATION.useActiveWorldbooks !== false;
  if (ui.byId('sim-worldbook-names')) ui.byId('sim-worldbook-names').value = ui.engine.config.SIMULATION.worldbookNames || '';
  if (ui.byId('sim-worldbook-entry-selectors')) ui.byId('sim-worldbook-entry-selectors').value = ui.engine.config.SIMULATION.worldbookEntrySelectors || '';
  if (ui.byId('sim-worldbook-entry-limit')) ui.byId('sim-worldbook-entry-limit').value = ui.engine.config.SIMULATION.worldbookEntryLimit;

  ui.engine.saveData();
  ui.log('推演配置已恢复默认');
  if (typeof toastr !== 'undefined') toastr.info('推演配置已恢复默认');
  ui.initWorldbookPanel();
}

function saveSettings(ui) {
  const apiUrl = ui.byId('setting-api-url')?.value;
  const apiKey = ui.byId('setting-api-key')?.value;
  const persistApiKey = !!ui.byId('setting-persist-api-key')?.checked;
  const model = ui.byId('setting-model')?.value;
  const temperature = Number.parseFloat(ui.byId('setting-temperature')?.value);
  const maxTokens = Number.parseInt(ui.byId('setting-max-tokens')?.value, 10);
  const timeoutMs = Number.parseInt(ui.byId('setting-timeout')?.value, 10);
  const customHeaders = ui.byId('setting-custom-headers')?.value?.trim();
  const forceJsonResponse = !!ui.byId('setting-force-json')?.checked;

  if (apiUrl) ui.engine.config.LLM.apiUrl = apiUrl.trim();
  if (typeof apiKey === 'string') ui.engine.config.LLM.apiKey = apiKey;
  ui.engine.config.LLM.persistApiKey = persistApiKey;
  if (model) ui.engine.config.LLM.model = model;
  if (!Number.isNaN(temperature)) ui.engine.config.LLM.temperature = temperature;
  if (!Number.isNaN(maxTokens)) ui.engine.config.LLM.maxTokens = maxTokens;
  if (!Number.isNaN(timeoutMs)) ui.engine.config.LLM.timeoutMs = timeoutMs;

  if (customHeaders) {
    try {
      JSON.parse(customHeaders);
      ui.engine.config.LLM.customHeaders = customHeaders;
    } catch {
      if (typeof toastr !== 'undefined') toastr.error('额外请求头不是合法 JSON');
      return;
    }
  } else {
    ui.engine.config.LLM.customHeaders = '{}';
  }

  ui.engine.config.LLM.forceJsonResponse = forceJsonResponse;

  // 重新编译 tpl（融入 userPref）
  if (ui.engine.config.SIMULATION?.tplRaw) {
    ui.engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
      ui.engine.config.SIMULATION.tplRaw,
      ui.engine.config.SIMULATION.userPref
    );
  }

  ui.engine.saveData();
  ui.log('设置已保存');
  if (typeof toastr !== 'undefined') toastr.success('设置已保存');
  ui.refreshPromptSnapshot();
}

// ---- src/ui/BizSimUI.operations.js ----
async function runSimulation(ui) {
  const resultDiv = ui.byId('simulation-result');
  const resultContent = ui.byId('simulation-result-content');
  if (!resultDiv || !resultContent) return;

  if (ui.isSimulating) return;

  const useHistory = ui.saveSimulationSettings(true);
  ui.setSimulationBusy(true, '运行中');

  try {
    const result = await ui.engine.runSimulation(useHistory);
    ui.setPromptViewMode('lastSent');
    await ui.refreshPromptSnapshot();
    ui.refreshDashboard();
    ui.refreshTracks();
    resultDiv.style.display = 'block';

    if (result.success) {
      const activeTracks = result.data.worldSimulation?.tracks?.filter((t) => t.status === '推演中').length || 0;
      resultContent.innerHTML = `<div class="bizsim-helper" style="color:var(--bizsim-success);">推演成功，活跃视角 ${activeTracks} 个。</div>`;
      const replaced = result.data?.floorSync?.replacedExisting;
      ui.log(replaced ? '推演成功（同楼层已覆盖旧变量）' : '推演成功');
    } else {
      const constraintErrors = Array.isArray(result.constraintErrors) ? result.constraintErrors : [];
      const constraintHtml = constraintErrors.length
        ? `<div class="bizsim-helper" style="margin-top:8px;color:var(--bizsim-danger);">约束详情:<br>${constraintErrors.map((item) => `- ${escapeHtml(item)}`).join('<br>')}</div>`
        : '';
      resultContent.innerHTML = `<div class="bizsim-helper" style="color:var(--bizsim-danger);">推演失败: ${escapeHtml(result.error || '未知错误')}</div>${constraintHtml}`;
      ui.log(`推演失败: ${result.error}`);
    }
  } catch (error) {
    resultDiv.style.display = 'block';
    resultContent.innerHTML = `<div class="bizsim-helper" style="color:var(--bizsim-danger);">错误: ${escapeHtml(error.message)}</div>`;
    ui.log(`错误: ${error.message}`);
  } finally {
    ui.setSimulationBusy(false);
  }
}

async function resetAllData(ui) {
  const ok = await showConfirm('确定要清空所有 BizSim 数据吗？');
  if (!ok) return;

  await deleteVariableSafe(ui.engine.config.VAR_PATH);
  await ui.engine.initialize();
  ui.refreshTracks();
  ui.log('已重置数据');
}

async function quickAudit(ui) {
  ui.log('执行快速审计...');
  const result = ui.engine.validateCrossSheetIntegrity();

  if (result.valid) {
    if (typeof toastr !== 'undefined') toastr.success('审计通过！所有跨表数据一致性检查正常。');
    ui.log('审计通过: 所有检查项正常');
  } else {
    if (typeof toastr !== 'undefined') toastr.warning(`发现 ${result.issues.length} 个问题，请查看控制台`);
    ui.log(`审计警告: ${result.issues.join(', ')}`);
  }
}

function exportReport(ui) {
  const report = ui.engine.getReportText();
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = ui.rootDoc.createElement('a');
  a.href = url;
  a.download = `BizSim_Report_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);

  ui.log('报告已导出');
  if (typeof toastr !== 'undefined') toastr.success('报告已导出为 Markdown 文件');
}

// ---- src/config/promptModules.js ----
/**
 * 内置提示词块库
 * 从 defaultPrompts 直接引用，作为模块化编辑的默认数据源
 */


const MODULE_META = {
  break_prompt: {
    id: 'break_prompt',
    name: '总闸门 - 最高优先级约束层',
    description: '首段强约束，锁定仅输出合法 JSON 且禁止额外文本',
    role: 'system',
    isBuiltIn: true,
  },
  constraint_layer: {
    id: 'constraint_layer',
    name: '约束层 - 身份定义与唯一输出要求',
    description: '最高优先级约束，定义引擎身份和输出格式',
    role: 'system',
    isBuiltIn: true,
  },
  rule_layer: {
    id: 'rule_layer',
    name: '规则层 - 推演/审计/表格生命周期规则',
    description: '世界推演、事业审计和表格生命周期的核心约束',
    role: 'system',
    isBuiltIn: true,
  },
  execution_steps: {
    id: 'execution_steps',
    name: '执行步骤 - 推演前的必要准备',
    description: '确保以正确的顺序和逻辑完成推演',
    role: 'system',
    isBuiltIn: true,
  },
  history_floor_info: {
    id: 'history_floor_info',
    name: '历史楼层信息 - 聊天正文',
    description: '最近聊天正文，作为历史语境输入',
    role: 'system',
    isBuiltIn: true,
  },
  worldbook_context: {
    id: 'worldbook_context',
    name: '世界书模块 - 条目注入',
    description: '当前选择的世界书与条目内容',
    role: 'system',
    isBuiltIn: true,
  },
  historical_asset_vars: {
    id: 'historical_asset_vars',
    name: '历史资产变量模块（不含最新楼层）',
    description: '历史楼层（不含最新楼层）中的资产变量快照',
    role: 'system',
    isBuiltIn: true,
  },
  historical_world_vars: {
    id: 'historical_world_vars',
    name: '历史世界演化模块（不含最新楼层）',
    description: '历史楼层（不含最新楼层）中的世界推演变量快照',
    role: 'system',
    isBuiltIn: true,
  },
  current_asset_context: {
    id: 'current_asset_context',
    name: '当前资产模块',
    description: '当前楼层资产状态 JSON',
    role: 'system',
    isBuiltIn: true,
  },
  current_world_context: {
    id: 'current_world_context',
    name: '当前世界演化模块',
    description: '当前楼层世界演化 JSON',
    role: 'system',
    isBuiltIn: true,
  },
  output_template: {
    id: 'output_template',
    name: '输出模板 - 完整的 JSON 输出结构',
    description: '定义推演结果的标准化格式',
    role: 'system',
    isBuiltIn: true,
  },
  output_enforcer_user: {
    id: 'output_enforcer_user',
    name: '执行锚点 - User 角色收束输出',
    description: '现在开始输出 Json，必须严格遵守以上所有约束和模板',
    role: 'user',
    isBuiltIn: true,
  },
};

const BUILTIN_PROMPT_MODULES = DEFAULT_CORE_PROMPT_BLOCK_ORDER.reduce((acc, id) => {
  acc[id] = {
    ...MODULE_META[id],
    text: DEFAULT_CORE_PROMPT_MODULES[id],
  };
  return acc;
}, {});

/**
 * 从内置块库创建默认的 template structure
 * @returns {Object} 包含 scaffold 数组和 specialIndex 的模板结构
 */
function createDefaultTemplateStructure() {
  const scaffold = DEFAULT_CORE_PROMPT_BLOCK_ORDER.map((id, index) => {
    const module = BUILTIN_PROMPT_MODULES[id];
    return {
      id,
      name: module.name,
      role: module.role,
      text: module.text,
      isBuiltIn: true,
      order: index
    };
  });

  return {
    version: '2.0',
    builtInSyncMode: 'follow-defaults',
    scaffold,
    specialIndex: undefined
  };
}

/**
 * 列出所有内置块的 ID
 */
function getBuiltInBlockIds() {
  return Object.keys(BUILTIN_PROMPT_MODULES);
}

/**
 * 获取内置块的元数据（不包含 text 内容）
 */
function getBuiltInBlockMetadata(id) {
  const module = BUILTIN_PROMPT_MODULES[id];
  if (!module) return null;
  const { text, ...metadata } = module;
  return metadata;
}

const DISALLOWED_PLACEHOLDER_PATTERN = /\{\{(HISTORY|FLOOR_DATA|WORLD_STATE|HISTORY_BLOCK|FLOOR_DATA_BLOCK|WORLD_STATE_BLOCK)\}\}/;

function isValidCurrentScaffold(scaffold) {
  if (!Array.isArray(scaffold) || scaffold.length === 0) return false;

  const builtInIdSet = new Set(
    scaffold
      .filter((block) => block && block.isBuiltIn === true)
      .map((block) => String(block.id || '').trim())
      .filter(Boolean)
  );

  const hasAllRequiredBuiltIns = DEFAULT_CORE_PROMPT_BLOCK_ORDER.every((id) => builtInIdSet.has(id));
  if (!hasAllRequiredBuiltIns) return false;

  const hasDisallowedPlaceholders = scaffold.some((block) => DISALLOWED_PLACEHOLDER_PATTERN.test(String(block?.text || '')));
  return !hasDisallowedPlaceholders;
}

function ensureCurrentTemplateStructure(tplRawLike) {
  if (!tplRawLike || !isValidCurrentScaffold(tplRawLike.scaffold)) {
    return createDefaultTemplateStructure();
  }

  return tplRawLike;
}

// ---- src/core/BizSimEngine.scaffold.js ----
/**
 * BizSim 提示词 Scaffold 编译与管理
 * 核心函数：规范化、编译、验证
 */

/**
 * 规范化模板结构，补齐默认值，验证字段
 * @param {Object} tplRawLike - 可能是完整结构、旧 CORE_PROMPT_BLOCK、或部分结构
 * @returns {Object} 标准化后的 TemplateStructure
 */
function normalizeTemplateStructure(tplRawLike) {
  if (!tplRawLike || typeof tplRawLike !== 'object') {
    return null;
  }

  const normalized = {
    version: tplRawLike.version || '2.0',
    scaffold: Array.isArray(tplRawLike.scaffold) ? tplRawLike.scaffold : [],
    specialIndex: Number.isInteger(tplRawLike.specialIndex) ? tplRawLike.specialIndex : undefined,
    specialRoleType: tplRawLike.specialRoleType || 'system'
  };

  // 验证 scaffold 数组中的每个块
  normalized.scaffold = normalized.scaffold.map((block, idx) => {
    if (!block || typeof block !== 'object') {
      console.warn(`[normalizeTemplateStructure] 块 ${idx} 无效，跳过`);
      return null;
    }

    return {
      id: block.id || `block_${idx}`,
      name: block.name || block.id || `块 ${idx}`,
      role: ['system', 'user', 'assistant'].includes(block.role) ? block.role : 'system',
      text: typeof block.text === 'string' ? block.text : '',
      isBuiltIn: block.isBuiltIn === true,
      isUserPref: block.isUserPref === true,
      order: Number.isInteger(block.order) ? block.order : idx
    };
  }).filter(b => b !== null);

  // 验证 specialIndex 是否有效
  if (Number.isInteger(normalized.specialIndex)) {
    const maxIdx = normalized.scaffold.length + 1; // +1 是因为可以插在最后
    if (normalized.specialIndex < 0 || normalized.specialIndex > maxIdx) {
      console.warn(`[normalizeTemplateStructure] specialIndex ${normalized.specialIndex} 超出范围，已调整`);
      normalized.specialIndex = Math.min(normalized.specialIndex, maxIdx);
    }
  }

  return normalized;
}

/**
 * 检测模板中是否有 specialIndex
 */
function hasSpecialIndex(tpl) {
  return tpl && Number.isInteger(tpl.specialIndex);
}

/**
 * 验证模板的完整性和合法性
 * @param {Object} tpl - 模板结构
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateTemplateIntegrity(tpl) {
  const errors = [];

  if (!tpl || typeof tpl !== 'object') {
    errors.push('模板为null或非对象');
    return { valid: false, errors };
  }

  // 检查 scaffold 数组
  if (!Array.isArray(tpl.scaffold)) {
    errors.push('scaffold 不是数组');
    return { valid: false, errors };
  }

  if (tpl.scaffold.length === 0) {
    errors.push('scaffold 数组为空');
  }

  // 检查块的唯一性
  const blockIds = tpl.scaffold.map(b => b.id);
  const uniqueIds = new Set(blockIds);
  if (blockIds.length !== uniqueIds.size) {
    errors.push('存在重复的块 ID');
  }

  // 检查块内容
  tpl.scaffold.forEach((block, idx) => {
    if (!block.id) errors.push(`块 ${idx} 缺少 id`);
    if (typeof block.text !== 'string') errors.push(`块 ${idx} 的 text 不是字符串`);
    if (!['system', 'user', 'assistant'].includes(block.role)) {
      errors.push(`块 ${idx} 的 role 无效: ${block.role}`);
    }
  });

  // 检查 specialIndex
  if (Number.isInteger(tpl.specialIndex)) {
    const maxValid = tpl.scaffold.length;
    if (tpl.specialIndex < 0 || tpl.specialIndex > maxValid) {
      errors.push(`specialIndex ${tpl.specialIndex} 超出有效范围 [0, ${maxValid}]`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 将用户偏好编译融入原始模板
 * 这是最关键的函数，实现 insertAt 精确位置的插入
 *
 * @param {Object} tplRaw - 原始模板结构
 * @param {Object} userPref - 用户偏好对象
 * @returns {Object} 编译后的模板结构（融入了 userPref）
 */
function compileTemplateWithUserPref(tplRaw, userPref) {
  // 规范化输入
  const tpl = normalizeTemplateStructure(tplRaw);
  if (!tpl) return null;

  const pref = normalizeUserPreference(userPref);

  // 如果偏好禁用，直接返回原始模板
  if (!pref || !pref.enabled) {
    return tpl;
  }

  // 构建用户偏好块
  const userPrefBlock = {
    id: pref.id || `pref_${Date.now()}`,
    name: '用户自定义块',
    role: pref.role,
    text: `${pref.before || '<user_preference>'}${pref.text}${pref.after || '</user_preference>'}`,
    isBuiltIn: false,
    isUserPref: true
  };

  // 计算插入位置（关键逻辑）
  const hasSpecial = Number.isInteger(tpl.specialIndex);
  const logicalTotal = tpl.scaffold.length + (hasSpecial ? 1 : 0);

  // insertAt 是逻辑坐标，需要转换为物理数组下标
  let insertAt = pref.insertAt;
  if (!Number.isInteger(insertAt)) {
    insertAt = logicalTotal; // 默认在最后
  } else {
    insertAt = Math.max(0, Math.min(insertAt, logicalTotal));
  }

  // 关键：如果存在 specialIndex，需要计算物理下标
  let scaffoldInsertIndex = insertAt;
  if (hasSpecial) {
    // 如果 insertAt 在 specialIndex 之前，直接使用；否则需要减 1（因为 special 是虚拟的）
    if (insertAt <= tpl.specialIndex) {
      scaffoldInsertIndex = insertAt;
    } else {
      scaffoldInsertIndex = insertAt - 1;
    }
  }

  // 执行 splice 操作
  const newScaffold = tpl.scaffold.slice();
  newScaffold.splice(scaffoldInsertIndex, 0, userPrefBlock);

  // 调整 specialIndex（如果用户块插在 special 前，special 需要后移）
  let newSpecialIndex = tpl.specialIndex;
  if (hasSpecial && insertAt <= tpl.specialIndex) {
    newSpecialIndex = tpl.specialIndex + 1;
  }

  return {
    ...tpl,
    scaffold: newScaffold,
    specialIndex: newSpecialIndex
  };
}

/**
 * 规范化用户偏好对象
 */
function normalizeUserPreference(prefLike) {
  if (!prefLike || typeof prefLike !== 'object') return null;

  return {
    enabled: prefLike.enabled === true,
    role: ['system', 'user', 'assistant'].includes(prefLike.role) ? prefLike.role : 'user',
    text: typeof prefLike.text === 'string' ? prefLike.text : '',
    insertAt: Number.isInteger(prefLike.insertAt) ? prefLike.insertAt : null,
    before: typeof prefLike.before === 'string' ? prefLike.before : '<user_preference>',
    after: typeof prefLike.after === 'string' ? prefLike.after : '</user_preference>',
    id: prefLike.id || null
  };
}

/**
 * 从 scaffold 和 specialIndex 构建完整的提示词文本
 * 用于 buildSimulationPrompt 中将块拼接成最终提示词
 *
 * @param {Object} tpl - 编译后的模板
 * @param {Object} dynamicContent - 动态内容 { historyText, floorText, worldText }
 * @returns {string} 拼接后的完整提示词
 */
function buildPromptFromScaffold(tpl, dynamicContent = {}) {
  if (!tpl || !Array.isArray(tpl.scaffold)) return '';

  const scaffold = tpl.scaffold;
  const hasSpecial = Number.isInteger(tpl.specialIndex);
  const { placeholders = {} } = dynamicContent;

  const placeholderMap = { ...placeholders };

  const placeholderPattern = /\{\{[A-Z0-9_]+\}\}/;
  const hasPlaceholders = scaffold.some((block) => typeof block?.text === 'string' && placeholderPattern.test(block.text));

  const parts = [];
  let scaffoldIdx = 0;

  for (let logicalIdx = 0; logicalIdx < scaffold.length + (hasSpecial ? 1 : 0); logicalIdx++) {
    if (hasSpecial && logicalIdx === tpl.specialIndex) {
      // specialIndex 仅作为插入锚点，不再承担上下文注入逻辑。
      continue;
    } else {
      // 插入普通块
      if (scaffoldIdx < scaffold.length) {
        const block = scaffold[scaffoldIdx];
        if (block && block.text) {
          const blockText = String(block.text).replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, key) => {
            const value = placeholderMap[key];
            return value === undefined || value === null ? m : String(value);
          });
          parts.push(blockText);
        }
        scaffoldIdx++;
      }
    }
  }

  // 拼接所有部分，使用双换行符分隔
  return parts.filter(p => p && p.trim()).join('\n\n');
}

// ---- src/ui/BizSimUI.scaffoldEditor.js ----
/**
 * BizSim UI 编辑器 - Scaffold 块编辑器
 * 用于模块化提示词编辑
 */

function renderScaffoldEditor(container, tpl, handlers = {}) {
  if (!container || !tpl || !Array.isArray(tpl.scaffold)) {
    console.warn('[renderScaffoldEditor] 输入参数不完整');
    return;
  }

  const scaffold = tpl.scaffold;
  const hasSpecial = Number.isInteger(tpl.specialIndex);

  // 构建逻辑视图
  const view = [];
  let scaffoldIdx = 0;
  for (let i = 0; i < scaffold.length + (hasSpecial ? 1 : 0); i++) {
    if (hasSpecial && i === tpl.specialIndex) {
      view.push({ kind: 'special', pos: i });
    } else {
      view.push({ kind: 'block', idx: scaffoldIdx, pos: i });
      scaffoldIdx++;
    }
  }

  // 生成 HTML
  const html = view.map((v, logicalPos) => {
    if (v.kind === 'special') {
      return `<div class="scaffold-block special-slot" data-pos="${logicalPos}">
        <div class="block-header">
          <span class="block-name">自定义插槽</span>
          <button class="btn-toggle-special" data-pos="${logicalPos}" title="移除插槽">✕</button>
        </div>
      </div>`;
    } else {
      const block = scaffold[v.idx];
      return `<div class="scaffold-block" data-block-id="${block.id}" data-idx="${v.idx}" data-pos="${logicalPos}">
        <div class="block-header">
          <span class="block-name">${block.name}</span>
          <span class="block-role">[${block.role}]</span>
          ${block.isBuiltIn ? '<span class="badge-builtin">内置</span>' : '<button class="btn-delete" title="删除块">✕</button>'}
        </div>
        <textarea class="block-content" data-idx="${v.idx}" placeholder="块内容..."></textarea>
        <div class="block-actions">
          <button class="btn-up" data-idx="${v.idx}" ${logicalPos === 0 ? 'disabled' : ''}>↑ 上移</button>
          <button class="btn-down" data-idx="${v.idx}" ${logicalPos >= view.length - 1 ? 'disabled' : ''}>↓ 下移</button>
        </div>
      </div>`;
    }
  }).join('');

  container.innerHTML = `<div class="scaffold-list">${html}</div>`;

  // 绑定事件
  bindScaffoldEditorEvents(container, tpl, handlers, view);
}

function bindScaffoldEditorEvents(container, tpl, handlers, view) {
  const scaffold = tpl.scaffold;

  // 块内容编辑
  container.querySelectorAll('.block-content').forEach((textarea) => {
    const idx = Number.parseInt(textarea.dataset.idx, 10);
    textarea.value = scaffold[idx]?.text || '';

    textarea.addEventListener('input', () => {
      const previousText = scaffold[idx]?.text || '';
      scaffold[idx].text = textarea.value;
      if (scaffold[idx]?.isBuiltIn && scaffold[idx].text !== previousText) {
        tpl.builtInSyncMode = 'customized';
      }
      if (handlers.onBlockChange) handlers.onBlockChange(idx);
    });
  });

  // 上移按钮
  container.querySelectorAll('.btn-up').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pos = Number.parseInt(btn.parentElement.parentElement.dataset.pos, 10);
      if (pos > 0 && moveBlockByLogicalStep(tpl, view, pos, -1)) {
        if (handlers.onReorder) handlers.onReorder();
        renderScaffoldEditor(container, tpl, handlers);
      }
    });
  });

  // 下移按钮
  container.querySelectorAll('.btn-down').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pos = Number.parseInt(btn.parentElement.parentElement.dataset.pos, 10);
      if (pos < view.length - 1 && moveBlockByLogicalStep(tpl, view, pos, 1)) {
        if (handlers.onReorder) handlers.onReorder();
        renderScaffoldEditor(container, tpl, handlers);
      }
    });
  });

  // 删除按钮
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number.parseInt(btn.parentElement.parentElement.dataset.idx, 10);
      scaffold.splice(idx, 1);
      if (Number.isInteger(tpl.specialIndex)) {
        tpl.specialIndex = Math.min(tpl.specialIndex, scaffold.length);
      }
      if (handlers.onDelete) handlers.onDelete(idx);
      renderScaffoldEditor(container, tpl, handlers);
    });
  });

  // 切换 specialIndex
  container.querySelectorAll('.btn-toggle-special').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (Number.isInteger(tpl.specialIndex)) {
        delete tpl.specialIndex;
      } else {
        tpl.specialIndex = Math.floor(scaffold.length / 2); // 放在中间
      }
      if (handlers.onReorder) handlers.onReorder();
      renderScaffoldEditor(container, tpl, handlers);
    });
  });
}

function swapScaffoldBlocks(scaffold, leftIdx, rightIdx) {
  if (leftIdx === rightIdx || leftIdx < 0 || rightIdx < 0) return;
  [scaffold[leftIdx], scaffold[rightIdx]] = [scaffold[rightIdx], scaffold[leftIdx]];
}

function moveBlockByLogicalStep(tpl, view, currentLogicalPos, delta) {
  const targetLogicalPos = currentLogicalPos + delta;
  if (targetLogicalPos < 0 || targetLogicalPos >= view.length) return false;

  const currentItem = view[currentLogicalPos];
  const targetItem = view[targetLogicalPos];
  if (!currentItem || currentItem.kind !== 'block') return false;

  if (targetItem && targetItem.kind === 'block') {
    swapScaffoldBlocks(tpl.scaffold, currentItem.idx, targetItem.idx);
    return true;
  }

  // 与 special 槽位交换时，只需移动 specialIndex
  if (targetItem && targetItem.kind === 'special' && Number.isInteger(tpl.specialIndex)) {
    if (delta < 0) {
      tpl.specialIndex += 1;
    } else if (delta > 0) {
      tpl.specialIndex -= 1;
    }
    return true;
  }

  return false;
}

/**
 * 渲染 insertAt 下拉列表
 * 用于用户偏好的位置选择
 */
function renderInsertAtOptions(tpl) {
  const scaffold = tpl.scaffold || [];
  const hasSpecial = Number.isInteger(tpl.specialIndex);

  const view = [];
  let scaffoldIdx = 0;
  for (let i = 0; i < scaffold.length + (hasSpecial ? 1 : 0); i++) {
    if (hasSpecial && i === tpl.specialIndex) {
      view.push({ kind: 'special' });
    } else {
      view.push({ kind: 'block', name: scaffold[scaffoldIdx]?.name });
      scaffoldIdx++;
    }
  }

  const total = view.length;
  const options = [];

  for (let i = 0; i <= total; i++) {
    let label;
    if (i === 0) {
      label = '最前';
    } else if (i > 0 && i <= view.length) {
      const prevItem = view[i - 1];
      if (prevItem.kind === 'special') {
        label = `第${i}条后（自定义插槽）`;
      } else {
        label = `第${i}条后（${prevItem.name}）`;
      }
    } else {
      label = '最后';
    }

    options.push({ value: i, label });
  }

  return options;
}

/**
 * 添加简单的编辑器 CSS 样式
 */
function injectEditorStyles() {
  if (document.getElementById('bizsim-scaffold-editor-styles')) return;

  const style = document.createElement('style');
  style.id = 'bizsim-scaffold-editor-styles';
  style.textContent = `
    .scaffold-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
    }

    .scaffold-block {
      background: rgba(6, 12, 22, 0.92);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 12px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      color: #e8eef8;
    }

    .scaffold-block.special-slot {
      background: rgba(93, 211, 255, 0.08);
      border-color: rgba(93, 211, 255, 0.35);
    }

    .block-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .block-name {
      font-weight: bold;
      flex: 1;
    }

    .block-role {
      font-size: 12px;
      color: #92a4c3;
    }

    .badge-builtin {
      font-size: 10px;
      background: rgba(52, 211, 153, 0.18);
      color: #8df7d2;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .block-content {
      width: 100%;
      min-height: 120px;
      padding: 8px;
      font-family: monospace;
      font-size: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(4, 10, 18, 0.9);
      color: #e8eef8;
      border-radius: 4px;
      margin-bottom: 8px;
      resize: vertical;
    }

    .block-actions {
      display: flex;
      gap: 6px;
    }

    .block-actions button {
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      background: rgba(255,255,255,0.06);
      color: #e8eef8;
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 3px;
    }

    .block-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .block-actions button:hover:not(:disabled) {
      background: rgba(93, 211, 255, 0.18);
    }

    .btn-delete {
      background: rgba(251, 113, 133, 0.16) !important;
      color: #ffd8de;
    }

    .btn-delete:hover:not(:disabled) {
      background: rgba(251, 113, 133, 0.24) !important;
    }

    .btn-toggle-special {
      background: rgba(255,255,255,0.06);
      color: #e8eef8;
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
    }

    .btn-toggle-special:hover {
      background: rgba(93, 211, 255, 0.18);
    }

    .userPref-editor,
    .presets-manager {
      padding: 12px;
      background: rgba(6, 12, 22, 0.92);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      color: #e8eef8;
      margin-top: 12px;
    }

    .module-field {
      margin-bottom: 12px;
    }

    .module-input,
    .module-select,
    .module-textarea {
      width: 100%;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(4, 10, 18, 0.9);
      color: #e8eef8;
    }

    .module-textarea {
      min-height: 110px;
      resize: vertical;
    }

    .module-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .module-btn {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      cursor: pointer;
      color: #e8eef8;
      background: rgba(255,255,255,0.06);
    }

    .module-btn-primary {
      background: linear-gradient(135deg, #6ad6ff, #4bb0ff);
      color: #04101d;
      border: none;
    }

    .module-btn-danger {
      background: rgba(251, 113, 133, 0.16);
      color: #ffd8de;
      border-color: rgba(251, 113, 133, 0.35);
    }
  `;

  document.head.appendChild(style);
}

// ---- src/ui/BizSimUI.userPreferences.js ----
/**
 * BizSim UI - 用户偏好编辑
 */



function renderUserPreferencesPanel(container, tpl, userPref, handlers = {}) {
  if (!container) return;

  const enabled = userPref?.enabled === true;
  const role = userPref?.role || 'user';
  const text = userPref?.text || '';
  const insertAt = userPref?.insertAt ?? null;

  const insertOptions = renderInsertAtOptions(tpl);
  const safeText = escapeHtml(text);
  const optionsHtml = insertOptions
    .map((opt) => `<option value="${opt.value}" ${insertAt === opt.value ? 'selected' : ''}>${opt.label}</option>`)
    .join('');

  container.innerHTML = `
      <div class="userPref-editor">
      <h4>用户偏好块</h4>
      
      <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <input type="checkbox" id="userPref-enabled" ${enabled ? 'checked' : ''}>
        <span>启用自定义块</span>
      </label>

      <div style="margin-bottom: 12px;">
        <label>角色：
            <select id="userPref-role" class="module-select">
            <option value="system" ${role === 'system' ? 'selected' : ''}>system</option>
            <option value="user" ${role === 'user' ? 'selected' : ''}>user</option>
            <option value="assistant" ${role === 'assistant' ? 'selected' : ''}>assistant</option>
          </select>
        </label>
      </div>

      <div style="margin-bottom: 12px;">
        <label>插入位置：
            <select id="userPref-insertAt" class="module-select">
            ${optionsHtml}
          </select>
        </label>
      </div>

      <div style="margin-bottom: 12px;">
        <label>块内容：</label>
          <textarea id="userPref-text" class="module-textarea">${safeText}</textarea>
      </div>

        <div class="module-actions">
          <button id="btn-apply-userPref" class="module-btn module-btn-primary">应用</button>
          <button id="btn-clear-userPref" class="module-btn">清除</button>
      </div>
    </div>
  `;

  // 事件绑定
  const enabledCb = container.querySelector('#userPref-enabled');
  const roleSelect = container.querySelector('#userPref-role');
  const insertSelect = container.querySelector('#userPref-insertAt');
  const textArea = container.querySelector('#userPref-text');
  const applyBtn = container.querySelector('#btn-apply-userPref');
  const clearBtn = container.querySelector('#btn-clear-userPref');

  applyBtn?.addEventListener('click', () => {
    const newPref = {
      enabled: enabledCb?.checked || false,
      role: roleSelect?.value || 'user',
      text: textArea?.value || '',
      insertAt: Number.parseInt(insertSelect?.value) || 0
    };
    if (handlers.onApply) handlers.onApply(newPref);
  });

  clearBtn?.addEventListener('click', () => {
    if (handlers.onClear) handlers.onClear();
  });
}

/**
 * 预设管理面板
 */
function renderPresetsPanel(container, presets, currentPresetId, handlers = {}) {
  if (!container) return;

  const presetOptions = (presets || [])
    .map((p) => `<option value="${p.id}" ${currentPresetId === p.id ? 'selected' : ''}>${p.name}</option>`)
    .join('');

  container.innerHTML = `
      <div class="presets-manager">
      <h4>预设管理</h4>
      
      <div style="margin-bottom: 12px;">
        <label>选择预设：
            <select id="preset-select" class="module-select">
            <option value="">-- 无（当前配置）--</option>
            ${presetOptions}
          </select>
        </label>
      </div>

        <div class="module-actions">
          <button id="btn-preset-save-new" class="module-btn module-btn-primary">保存为新预设</button>
          <button id="btn-preset-delete" class="module-btn module-btn-danger">删除预设</button>
      </div>
    </div>
  `;

  const select = container.querySelector('#preset-select');
  const saveBtn = container.querySelector('#btn-preset-save-new');
  const deleteBtn = container.querySelector('#btn-preset-delete');

  select?.addEventListener('change', () => {
    const presetId = select.value;
    if (presetId && handlers.onLoad) handlers.onLoad(presetId);
  });

  saveBtn?.addEventListener('click', () => {
    const name = prompt('输入预设名称：', '我的预设');
    if (name && handlers.onSaveNew) handlers.onSaveNew(name);
  });

  deleteBtn?.addEventListener('click', () => {
    const presetId = select?.value;
    if (presetId) {
      if (confirm('确定删除此预设？') && handlers.onDelete) {
        handlers.onDelete(presetId);
      }
    }
  });
}

// ---- src/ui/BizSimUI.presets.js ----
/**
 * 预设系统管理器
 */



class PromptPresetManager {
  constructor(engine) {
    this.engine = engine;
    this.presets = engine.config.SIMULATION?.presets || [];
    this.currentPresetId = engine.config.SIMULATION?.currentPresetId || null;
  }

  save() {
    this.engine.config.SIMULATION.presets = this.presets;
    this.engine.config.SIMULATION.currentPresetId = this.currentPresetId;
  }

  /**
   * 保存当前配置为新预设
   */
  createPreset(name, description = '') {
    const preset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      tplRaw: JSON.parse(JSON.stringify(this.engine.config.SIMULATION?.tplRaw || {})),
      userPref: JSON.parse(JSON.stringify(this.engine.config.SIMULATION?.userPref || null)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.presets.push(preset);
    this.currentPresetId = preset.id;
    this.save();

    return preset;
  }

  /**
   * 加载预设
   */
  loadPreset(presetId) {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) {
      console.warn(`[PromptPresetManager] 预设 ${presetId} 不存在`);
      return null;
    }

    // 深复制预设数据到 engine config
    this.engine.config.SIMULATION.tplRaw = ensureCurrentTemplateStructure(
      JSON.parse(JSON.stringify(preset.tplRaw))
    );
    this.engine.config.SIMULATION.userPref = preset.userPref ? JSON.parse(JSON.stringify(preset.userPref)) : null;

    // 重新编译
    this.engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
      this.engine.config.SIMULATION.tplRaw,
      this.engine.config.SIMULATION.userPref
    );

    this.currentPresetId = presetId;
    this.save();

    return preset;
  }

  /**
   * 删除预设
   */
  deletePreset(presetId) {
    this.presets = this.presets.filter((p) => p.id !== presetId);
    if (this.currentPresetId === presetId) {
      this.currentPresetId = null;
    }
    this.save();
  }

  /**
   * 更新预设内容
   */
  updatePreset(presetId) {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return null;

    preset.tplRaw = JSON.parse(JSON.stringify(this.engine.config.SIMULATION?.tplRaw || {}));
    preset.userPref = this.engine.config.SIMULATION?.userPref || null;
    preset.updatedAt = new Date().toISOString();
    this.save();

    return preset;
  }

  /**
   * 列出所有预设
   */
  listPresets() {
    return this.presets.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
  }

  /**
   * 获取预设数量
   */
  getPresetCount() {
    return this.presets.length;
  }

  /**
   * 获取当前预设
   */
  getCurrentPreset() {
    return this.presets.find((p) => p.id === this.currentPresetId) || null;
  }
}

// ---- src/ui/BizSimUI.integration.js ----
/**
 * BizSim UI - 预设与用户偏好系统集成
 */





/**
 * 渲染完整的模块化编辑界面
 */
function renderScaffoldEditingUI(ui) {
  const container = ui.byId('scaffold-editing-section');
  if (!container) return;

  const engine = ui.engine;
  const tplRaw = engine.config.SIMULATION?.tplRaw;
  const tpl = tplRaw && Array.isArray(tplRaw.scaffold) ? tplRaw : engine.config.SIMULATION?.tpl;
  const userPref = engine.config.SIMULATION?.userPref;
  const presetManager = engine.presetManager;
  const builtInSyncMode = String(engine.config.SIMULATION?.tplRaw?.builtInSyncMode || '').trim() || 'follow-defaults';
  const syncModeLabel = builtInSyncMode === 'customized' ? '已自定义（不跟随默认）' : '跟随默认（推荐）';

  if (!tpl || !Array.isArray(tpl.scaffold)) {
    container.innerHTML = '<p style="color: #f44336;">错误：模板结构无效</p>';
    return;
  }

  container.innerHTML = `
    <div class="bizsim-helper" style="margin-bottom:10px;display:flex;gap:8px;align-items:center;justify-content:space-between;">
      <span>内置块同步模式：${syncModeLabel}</span>
      <button id="btn-reset-builtins-defaults" class="bizsim-btn bizsim-btn-secondary" type="button">恢复内置块为最新默认</button>
    </div>
    <div id="scaffold-editor-wrapper"></div>
    <div id="userPref-wrapper"></div>
    <div id="presets-wrapper"></div>
  `;

  const editorWrapper = container.querySelector('#scaffold-editor-wrapper');
  const userPrefWrapper = container.querySelector('#userPref-wrapper');
  const presetsWrapper = container.querySelector('#presets-wrapper');
  const resetBuiltinsBtn = container.querySelector('#btn-reset-builtins-defaults');

  resetBuiltinsBtn?.addEventListener('click', () => {
    engine.config.SIMULATION.tplRaw = createDefaultTemplateStructure();
    engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
      engine.config.SIMULATION.tplRaw,
      engine.config.SIMULATION.userPref
    );
    void engine.saveData();
    renderScaffoldEditingUI(ui);
    if (typeof toastr !== 'undefined') toastr.success('内置块已恢复为最新默认');
  });

  // 1. 渲染块编辑器
  renderScaffoldEditor(editorWrapper, tpl, {
    onBlockChange: () => {
      if (engine.config.SIMULATION.tplRaw) {
        engine.config.SIMULATION.tplRaw.scaffold = tpl.scaffold;
      }
    },
    onReorder: () => {
      if (engine.config.SIMULATION.tplRaw) {
        engine.config.SIMULATION.tplRaw.scaffold = tpl.scaffold;
        engine.config.SIMULATION.tplRaw.specialIndex = tpl.specialIndex;
      }
      engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
        engine.config.SIMULATION.tplRaw,
        engine.config.SIMULATION.userPref
      );
    },
    onDelete: () => {
      if (engine.config.SIMULATION.tplRaw) {
        engine.config.SIMULATION.tplRaw.scaffold = tpl.scaffold;
      }
      engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
        engine.config.SIMULATION.tplRaw,
        engine.config.SIMULATION.userPref
      );
    }
  });

  // 2. 渲染用户偏好编辑
  renderUserPreferencesPanel(userPrefWrapper, tpl, userPref, {
    onApply: (newPref) => {
      engine.config.SIMULATION.userPref = newPref;
      // 重新编译 tpl
      engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
        engine.config.SIMULATION.tplRaw,
        newPref
      );
      void engine.saveData();
      // 刷新显示
      renderScaffoldEditingUI(ui);
      if (typeof toastr !== 'undefined') toastr.success('用户偏好已应用');
    },
    onClear: () => {
      engine.config.SIMULATION.userPref = null;
      engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
        engine.config.SIMULATION.tplRaw,
        null
      );
      void engine.saveData();
      renderScaffoldEditingUI(ui);
      if (typeof toastr !== 'undefined') toastr.info('用户偏好已清除');
    }
  });

  // 3. 渲染预设管理
  if (presetManager) {
    renderPresetsPanel(presetsWrapper, presetManager.listPresets(), presetManager.currentPresetId, {
      onLoad: (presetId) => {
        presetManager.loadPreset(presetId);
        void engine.saveData();
        renderScaffoldEditingUI(ui);
        if (typeof toastr !== 'undefined') toastr.success('预设已加载');
      },
      onSaveNew: (name) => {
        presetManager.createPreset(name);
        presetManager.save();
        void engine.saveData();
        renderScaffoldEditingUI(ui);
        if (typeof toastr !== 'undefined') toastr.success(`预设 "${name}" 已保存`);
      },
      onDelete: (presetId) => {
        presetManager.deletePreset(presetId);
        presetManager.save();
        void engine.saveData();
        renderScaffoldEditingUI(ui);
        if (typeof toastr !== 'undefined') toastr.info('预设已删除');
      }
    });
  }
}

/**
 * 在编辑后保存
 */
async function saveScaffoldChanges(ui) {
  const engine = ui.engine;
  const tplRaw = engine.config.SIMULATION?.tplRaw;

  // 1. 基础校验：模块化编辑源必须是 tplRaw
  if (!tplRaw || !Array.isArray(tplRaw.scaffold)) {
    if (typeof toastr !== 'undefined') toastr.error('模块化模板无效，保存失败');
    return false;
  }

  // 2. 重新编译可执行模板
  engine.config.SIMULATION.tpl = compileTemplateWithUserPref(
    engine.config.SIMULATION.tplRaw,
    engine.config.SIMULATION.userPref
  );

  // 3. 保存预设列表
  if (engine.presetManager) {
    engine.presetManager.save();
  }

  // 4. 持久化到引擎
  await engine.saveData();

  if (typeof toastr !== 'undefined') toastr.success('所有更改已保存');
  return true;
}

// ---- src/ui/BizSimUI.actions.js ----


// ---- src/ui/BizSimUI.js ----
class BizSimUI {
  constructor(engine) {
    this.engine = engine;
    this.panel = null;
    this.isOpen = false;
    this.rootDoc = getSafeDocument();
    this.currentEmpireSheet = 'sheet_assetOVW0';
    this.currentWorldbookName = '';
    this.currentWorldbookEntries = [];
    this.promptViewMode = 'preview';
    this.isSimulating = false;
    this.simulationSource = '';
  }

  initWorldbookPanel() {
    return initWorldbookPanel(this);
  }

  refreshWorldbookBindingHint() {
    return refreshWorldbookBindingHint(this);
  }

  loadWorldbookEntries(worldbookName) {
    return loadWorldbookEntries(this, worldbookName);
  }

  renderWorldbookEntries(entries) {
    return renderWorldbookEntries(this, entries);
  }

  setWorldbookSelections(checked) {
    return setWorldbookSelections(this, checked);
  }

  syncWorldbookSelectionsToConfig() {
    return syncWorldbookSelectionsToConfig(this);
  }

  refreshPromptSnapshot() {
    return refreshPromptSnapshot(this);
  }

  copyLastPromptSnapshot() {
    return copyLastPromptSnapshot(this);
  }

  togglePromptViewMode() {
    return togglePromptViewMode(this);
  }

  setPromptViewMode(mode) {
    return setPromptViewMode(this, mode);
  }

  refreshDashboard() {
    return refreshDashboard(this);
  }

  refreshEmpire() {
    return refreshEmpire(this);
  }

  showSheet(sheetName, silent = false) {
    return showSheet(this, sheetName, silent);
  }

  setModelStatus(message, type = 'info') {
    return setModelStatus(this, message, type);
  }

  syncModelInputToSelect() {
    return syncModelInputToSelect(this);
  }

  fetchModels() {
    return fetchModels(this);
  }

  saveSimulationSettings(silent = false) {
    return saveSimulationSettings(this, silent);
  }

  resetSimulationSettings() {
    return resetSimulationSettings(this);
  }

  saveSettings() {
    return saveSettings(this);
  }

  refreshTracks() {
    return refreshTracks(this);
  }

  showAddTrackForm() {
    return showAddTrackForm(this);
  }

  runSimulation() {
    return runSimulation(this);
  }

  resetAllData() {
    return resetAllData(this);
  }

  quickAudit() {
    return quickAudit(this);
  }

  exportReport() {
    return exportReport(this);
  }

  log(message) {
    return log(this, message);
  }

  getScopeElement() {
    return this.panel?.dlg || this.rootDoc;
  }

  $(selector) {
    return this.getScopeElement().querySelector(selector);
  }

  $$(selector) {
    return Array.from(this.getScopeElement().querySelectorAll(selector));
  }

  byId(id) {
    return this.getScopeElement().querySelector(`#${id}`);
  }

  setSimulationBusy(busy, source = '', publish = true) {
    this.isSimulating = !!busy;
    this.simulationSource = this.isSimulating ? String(source || this.simulationSource || '') : '';
    const targets = [this.byId('btn-global-simulation'), this.byId('btn-start-simulation')].filter(Boolean);

    for (const button of targets) {
      button.disabled = this.isSimulating;
      button.classList.toggle('is-loading', this.isSimulating);

      if (button.id === 'btn-global-simulation') {
        button.textContent = this.isSimulating ? `推演中${this.simulationSource ? ` · ${this.simulationSource}` : ''}` : '一键推演';
      } else {
        button.textContent = this.isSimulating ? `推演中${this.simulationSource ? ` · ${this.simulationSource}` : ''}` : '开始推演';
      }
    }

    try {
      if (publish) {
        const api = window.BizSim || window.parent?.BizSim || window.top?.BizSim;
        if (api?.setSimulationState) {
        api.setSimulationState(this.isSimulating, this.simulationSource);
        } else {
          const sharedState = { isSimulating: this.isSimulating, source: this.simulationSource };
          if (window.parent && window.parent !== window) window.parent.BizSimState = sharedState;
          if (window.top && window.top !== window) window.top.BizSimState = sharedState;
        }
      }
    } catch {
    }
  }

  async initializePanelWhenReady() {
    // 首先重新从变量系统加载数据，确保与最新状态同步
    await this.engine.reloadFromVariables();

    let ready = false;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (!this.isOpen) return;
      if (this.byId('btn-global-simulation') && this.byId('tab-dashboard')) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!ready) {
      this.log('面板初始化失败：未找到核心按钮，事件绑定已跳过');
      return;
    }

    this.attachEventListeners();
    this.setPromptViewMode('preview');
    this.refreshDashboard();
    this.refreshEmpire();
    this.refreshTracks();
    this.refreshPromptSnapshot();
    const sharedState = window.BizSim?.simulationState || window.parent?.BizSimState || window.top?.BizSimState;
    if (sharedState && typeof sharedState === 'object') {
      this.setSimulationBusy(!!sharedState.isSimulating, String(sharedState.source || ''), false);
    } else {
      this.setSimulationBusy(this.isSimulating, this.simulationSource, false);
    }
    this.initWorldbookPanel();
    injectEditorStyles();
    renderScaffoldEditingUI(this);
  }

  open() {
    if (this.isOpen) return;

    const html = createMainPanelHtml(this.engine);
    const ST = getSillyTavernGlobal();
    const Popup = ST?.Popup;

    if (!Popup || !ST?.POPUP_TYPE) {
      this.openFallback(html);
      return;
    }

    const popup = new Popup(html, ST.POPUP_TYPE.DISPLAY, '', {
      large: true,
      wide: true,
      okButton: '关闭',
      onClose: () => {
        this.isOpen = false;
        this.panel = null;
      },
    });

    this.panel = popup;
    this.isOpen = true;
    popup.show();

    void this.initializePanelWhenReady();
  }

  openFallback(html) {
    const modal = this.rootDoc.createElement('div');
    modal.id = 'bizsim-fallback-modal';
    modal.innerHTML = html;
    modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:900px;max-height:90vh;background:#1a1a2e;border-radius:8px;z-index:99999;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,0.8);';

    const overlay = this.rootDoc.createElement('div');
    overlay.id = 'bizsim-fallback-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99998;';
    overlay.addEventListener('click', () => this.closeFallback());

    this.rootDoc.body.appendChild(overlay);
    this.rootDoc.body.appendChild(modal);
    this.panel = { dlg: modal };
    this.isOpen = true;

    void this.initializePanelWhenReady();

    if (typeof toastr !== 'undefined') {
      toastr.info('使用原生弹窗模式');
    }
  }

  closeFallback() {
    this.rootDoc.getElementById('bizsim-fallback-modal')?.remove();
    this.rootDoc.getElementById('bizsim-fallback-overlay')?.remove();
    this.isOpen = false;
    this.panel = null;
  }

  attachEventListeners() {
    this.$$('.bizsim-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.currentTarget.dataset.tab);
      });
    });

    this.$$('[data-sheet]').forEach((button) => {
      button.addEventListener('click', (e) => {
        this.showSheet(e.currentTarget.dataset.sheet);
      });
    });

    this.byId('btn-global-simulation')?.addEventListener('click', async () => {
      await this.runSimulation();
    });

    this.byId('btn-global-audit')?.addEventListener('click', async () => {
      await this.quickAudit();
    });

    this.byId('btn-global-export')?.addEventListener('click', () => {
      this.exportReport();
    });

    this.byId('btn-open-simulation-tab')?.addEventListener('click', () => {
      this.switchTab('simulation');
    });

    this.byId('btn-refresh-dashboard')?.addEventListener('click', async () => {
      // 重新从变量系统加载数据，然后刷新UI
      await this.engine.reloadFromVariables();
      this.refreshDashboard();
      this.refreshEmpire();
      this.refreshTracks();
      void this.refreshPromptSnapshot();
      this.log('已刷新面板数据');
    });

    this.byId('btn-start-simulation')?.addEventListener('click', async () => {
      await this.runSimulation();
    });

    this.byId('btn-save-sim-settings')?.addEventListener('click', () => {
      this.saveSimulationSettings();
    });

    this.byId('btn-reset-sim-settings')?.addEventListener('click', () => {
      this.resetSimulationSettings();
    });

    this.byId('btn-add-track')?.addEventListener('click', () => {
      this.showAddTrackForm();
    });

    this.byId('btn-refresh-tracks')?.addEventListener('click', () => {
      this.refreshTracks();
    });

    this.byId('btn-save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    this.byId('btn-save-scaffold-module')?.addEventListener('click', async () => {
      await saveScaffoldChanges(this);
      this.setPromptViewMode('preview');
      void this.refreshPromptSnapshot();
    });

    this.byId('btn-refresh-scaffold-module')?.addEventListener('click', () => {
      renderScaffoldEditingUI(this);
    });

    this.byId('btn-fetch-models')?.addEventListener('click', async () => {
      await this.fetchModels();
    });

    this.byId('setting-model-select')?.addEventListener('change', (e) => {
      const selected = e.target?.value;
      if (!selected) return;
      const modelInput = this.byId('setting-model');
      if (modelInput) modelInput.value = selected;
      this.setModelStatus(`已选择模型: ${selected}`, 'info');
    });

    this.byId('setting-model')?.addEventListener('input', () => {
      this.syncModelInputToSelect();
    });

    this.byId('btn-refresh-last-prompt')?.addEventListener('click', () => {
      void this.refreshPromptSnapshot();
    });

    this.byId('btn-toggle-prompt-source')?.addEventListener('click', () => {
      void this.togglePromptViewMode();
    });

    this.byId('btn-copy-last-prompt')?.addEventListener('click', async () => {
      await this.copyLastPromptSnapshot();
    });

    this.byId('sim-worldbook-name')?.addEventListener('change', async (e) => {
      this.currentWorldbookName = e.currentTarget.value || '';
      await this.loadWorldbookEntries(this.currentWorldbookName);
      this.refreshWorldbookBindingHint();
    });

    this.byId('btn-worldbook-refresh')?.addEventListener('click', async () => {
      await this.loadWorldbookEntries(this.byId('sim-worldbook-name')?.value || '');
      this.refreshWorldbookBindingHint();
    });

    this.byId('btn-worldbook-select-all')?.addEventListener('click', () => {
      this.setWorldbookSelections(true);
    });

    this.byId('btn-worldbook-select-none')?.addEventListener('click', () => {
      this.setWorldbookSelections(false);
    });

    this.byId('worldbook-entry-search')?.addEventListener('input', () => {
      this.renderWorldbookEntries(this.currentWorldbookEntries || []);
    });

    this.syncModelInputToSelect();
  }

  switchTab(tabName) {
    this.$$('.bizsim-tab').forEach((t) => t.classList.remove('active'));
    this.$$('.bizsim-section').forEach((s) => s.classList.remove('active'));

    this.$(`.bizsim-tab[data-tab="${tabName}"]`)?.classList.add('active');
    this.byId(`tab-${tabName}`)?.classList.add('active');

    if (tabName === 'dashboard') {
      this.refreshDashboard();
      this.refreshEmpire();
      this.refreshTracks();
    }
    if (tabName === 'simulation') this.refreshWorldbookBindingHint();
    if (tabName === 'prompts') {
      this.setPromptViewMode('preview');
      void this.refreshPromptSnapshot();
      renderScaffoldEditingUI(this);
    }
  }

}

// ---- src/index.js ----
let engine = null;
let ui = null;
let autoSimInFlight = false;
let lastAutoSimAt = 0;
let assistantMessageCount = 0;
let manualSimInFlight = false;
const injectedAssistantMessageIds = new Set();
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

async function maybeAutoSimulate(messageId) {
  if (autoSimInFlight) return false;

  const ctx = await initBizSim();
  const cfg = ctx.engine?.config?.SIMULATION || {};
  const message = getMessageFromEvent(messageId);

  if (hasBizSimInjectionBlock(message)) return false;

  const assistantOnly = cfg.autoRunOnlyAssistant !== false;
  const assistantInterval = Math.max(1, Number(cfg.autoRunAssistantFloorInterval) || 1);
  const isAssistant = isAssistantMessage(message);

  if (assistantOnly && !isAssistant) return false;

  if (isAssistant) {
    assistantMessageCount += 1;
    if (assistantMessageCount % assistantInterval !== 0) return false;
  }

  if (!shouldRunAutoSimulation(cfg, message)) return false;

  autoSimInFlight = true;
  lastAutoSimAt = Date.now();

  try {
    const useHistory = cfg.autoRunUseHistory !== false;
    setSimulationState(true, '自动推演');
    const result = await ctx.engine.runSimulation(useHistory);
    if (result?.success) {
      const injectedMessageId = Number(result?.data?.floorSync?.messageId);
      if (Number.isInteger(injectedMessageId)) injectedAssistantMessageIds.add(injectedMessageId);
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

async function injectForAssistantMessage(messageId) {
  const ctx = await initBizSim();
  if (ctx.engine?.config?.SIMULATION?.bodyInjectionEnabled !== true) return;

  const targetMessageId = Number(messageId);
  if (injectedAssistantMessageIds.has(targetMessageId)) return;

  const latestAssistantMessageId = ctx.engine?.getLatestAssistantMessageIdSafe?.();
  if (latestAssistantMessageId === null || latestAssistantMessageId === undefined) return;
  if (Number(messageId) !== Number(latestAssistantMessageId)) return;

  const message = getMessageFromEvent(messageId);
  if (!isAssistantMessage(message)) return;
  if (hasBizSimInjectionBlock(message)) {
    injectedAssistantMessageIds.add(targetMessageId);
    return;
  }

  try {
    const result = await ctx.engine.injectBizSimBlocksToMessage(messageId, 10);
    if (result?.success) injectedAssistantMessageIds.add(targetMessageId);
  } catch (error) {
    console.warn('[BizSim] 正文注入失败:', error?.message || error);
  }
}

async function triggerSimulationFromHtml() {
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

async function initBizSim() {
  if (!engine) {
    engine = new BizSimEngine();
    await engine.initialize();
  }

  if (!ui) {
    ui = new BizSimUI(engine);
  }

  return { engine, ui };
}

async function openBizSim() {
  const ctx = await initBizSim();
  ctx.ui.open();
}

async function quickSimulate() {
  if (manualSimInFlight) return { success: false, error: '推演中' };
  manualSimInFlight = true;
  const ctx = await initBizSim();

  if (typeof toastr !== 'undefined') {
    toastr.info('开始执行推演...', 'BizSim');
  }

  try {
    setSimulationState(true, '手动推演');
    const result = await ctx.engine.runSimulation(true);
    if (result?.success && ctx.engine.config.SIMULATION?.bodyInjectionEnabled === true) {
      const injectedMessageId = Number(result?.data?.floorSync?.messageId);
      if (Number.isInteger(injectedMessageId)) injectedAssistantMessageIds.add(injectedMessageId);
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
  } finally {
    setSimulationState(false);
    manualSimInFlight = false;
  }
}

function registerBizSimEvents() {
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
      const autoSimStarted = await maybeAutoSimulate(messageId);
      if (!autoSimStarted) {
        await injectForAssistantMessage(messageId);
      }
    });

    eventOnSafe(tavern_events.MESSAGE_SWIPED, () => {
      console.log('[BizSim] 检测到消息切换');
    });
  }
}

function exposeBizSimDebugApi() {
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

async function bootBizSim() {
  registerBizSimEvents();
  exposeBizSimDebugApi();

  console.log('[BizSim] 模块化开发版本已加载，点击"世界推演"按钮使用');
  if (typeof toastr !== 'undefined') {
    toastr.success('BizSim 模块化开发版本已就绪', 'BizSim', { timeOut: 3000 });
  }
}

// ---- main.dev.js ----
bootBizSim();
