import { deepClone } from '../utils/object.js';

/**
 * AI 输出自动校验与修复模块
 * 基于前一层楼数据进行递增校验和 sanity check
 */
export const BIZSIM_ENGINE_VALIDATION_METHODS = {
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
   * @param {Object} empireData - 资产数据
   * @returns {Object} { valid: boolean, issues: Array, repaired: Object }
   */
  validateEmpireDataConstraints(empireData) {
    const issues = [];
    const repaired = deepClone(empireData || {});

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
    const empireData = result?.stat_data?.bizsim_assets;
    if (empireData) {
      const empireValidation = this.validateEmpireDataConstraints(empireData);
      if (empireValidation.issues.length > 0) {
        allIssues.push(...empireValidation.issues);
        autoRepaired = true;
      }
      result.stat_data.bizsim_assets = empireValidation.repaired;
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
   * @param {Object} empireData - 资产数据
   * @returns {Object} { valid: boolean, repaired: Object, issues: Array }
   */
  validateAndRepairStaffAudit(empireData) {
    const issues = [];
    const repaired = deepClone(empireData || {});

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
