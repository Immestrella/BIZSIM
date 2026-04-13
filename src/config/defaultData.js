export const DEFAULT_DATA = {
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

export const DEFAULT_WORLD_SIMULATION = {
  tracks: [],
  checks: {
    allTracksAdvanced: false,
    convergenceChecked: false,
    newTracksAdded: false,
  },
};
