export const BIZSIM_ENGINE_AUDIT_METHODS = {
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
    this.emit?.('data-changed', {
      source: 'addWorldTrack',
      timestamp: Date.now(),
      data: {
        floorData: this.data,
        worldSimulation: this.worldSimulation,
      },
    });
    this.saveFloorDataOnly();
    return newTrack.id;
  },
};
