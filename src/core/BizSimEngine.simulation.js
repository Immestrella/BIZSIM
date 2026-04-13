import { DEFAULT_DATA } from '../config/defaultData.js';
import { getChatHistorySafe } from '../utils/stCompat.js';

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const BIZSIM_ENGINE_SIMULATION_METHODS = {
  getTrackIdPattern() {
    const prefix = escapeRegExp(String(this.config.SIMULATION?.trackPrefix || 'BG'));
    return new RegExp(`^${prefix}\\.(\\d+)$`);
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
    return history
      .map((h) => {
        const speaker = String(h?.name || h?.speaker_name || h?.character_name || (h?.is_user ? 'User' : 'Assistant') || 'Unknown');
        const rawText = String(h?.mes || h?.message || h?.content || '').trim();
        if (!rawText) return '';
        return `[${speaker}] ${rawText}`;
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

  normalizeEmpireData(input) {
    const keys = ['sheet_bizStruct', 'sheet_rlEst02b', 'sheet_cashInv1a', 'sheet_assetOVW0', 'sheet_luxuryAssets', 'sheet_bizSegments', 'sheet_dbt4Lst4'];
    const current = this.data || this.getDefaultEmpireData();
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
    const semanticAssetsRaw = parsed?.stat_data?.bizsim_assets ?? parsed?.bizsim_assets;
    const worldStateRaw = parsed?.stat_data?.bizsim_world_state ?? parsed?.bizsim_world_state ?? parsed?.worldSimulation;

    let normalizedEmpireData;
    if (semanticAssetsRaw && typeof semanticAssetsRaw === 'object') {
      const semanticAssets = this.normalizeBizsimAssetsPayload(semanticAssetsRaw);
      normalizedEmpireData = this.buildEmpireDataFromSemanticAssets(semanticAssets);
    } else {
      normalizedEmpireData = this.normalizeEmpireData(parsed?.empireData);
    }

    return {
      _chainOfThought: {
        world_analysis: Array.isArray(parsed?._chainOfThought?.world_analysis) ? parsed._chainOfThought.world_analysis : ['1. 缺少 world_analysis，已由系统兜底。'],
        empire_audit: Array.isArray(parsed?._chainOfThought?.empire_audit) ? parsed._chainOfThought.empire_audit : ['1. 缺少 empire_audit，已由系统兜底。'],
      },
      empireData: normalizedEmpireData,
      worldSimulation: this.normalizeWorldSimulation(worldStateRaw),
    };
  },

  async runSimulation(useHistory = true) {
    if (!this.initialized) await this.initialize();

    try {
      const historyLimit = Number(this.config.SIMULATION?.historyLimit) || 10;
      const historyText = useHistory ? this.formatHistoryText(getChatHistorySafe(historyLimit)) : '';
      const empireDataText = JSON.stringify(this.data, null, 2);
      const worldStateText = JSON.stringify(this.worldSimulation, null, 2);

      const prompt = await this.buildSimulationPrompt({ historyText, empireDataText, worldStateText, useHistory });
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
      if (normalized.empireData) this.data = normalized.empireData;
      if (normalized.worldSimulation) this.worldSimulation = normalized.worldSimulation;

      const syncResult = await this.syncLatestFloorVariables(normalized.empireData, normalized.worldSimulation);
      if (!syncResult?.success) {
        this.data = previousData;
        this.worldSimulation = previousWorldSimulation;
        return {
          success: false,
          error: '本地约束校验未通过，已阻止写回。',
          constraintErrors: Array.isArray(syncResult?.errors) ? syncResult.errors : ['未知约束错误'],
        };
      }

      if (syncResult.normalizedEmpireData) this.data = syncResult.normalizedEmpireData;
      if (syncResult.normalizedWorldSimulation) this.worldSimulation = syncResult.normalizedWorldSimulation;

      this.validateCrossSheetIntegrity();
      if (this.config.SIMULATION?.autoSave !== false) await this.saveData();

      return {
        success: true,
        data: {
          ...normalized,
          empireData: this.data,
          worldSimulation: this.worldSimulation,
          floorSync: {
            messageId: syncResult.messageId,
            replacedExisting: !!syncResult.replacedExisting,
          },
          schemaAuditLogs: Array.isArray(syncResult.schemaAuditLogs) ? syncResult.schemaAuditLogs : [],
        },
        chainOfThought: normalized._chainOfThought,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
