import { DEFAULT_DATA } from '../config/defaultData.js';
import { getChatHistorySafe, getChatMessageByIdSafe, setChatMessageTextSafe } from '../utils/stCompat.js';

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const BIZSIM_ENGINE_SIMULATION_METHODS = {
  isAssistantMessage(message) {
    if (!message || typeof message !== 'object') return false;
    const role = String(message.role || '').toLowerCase();
    if (role === 'assistant') return true;
    if (role === 'system') return false;
    return !(message.is_user === true || message.from_user === true || message.isUser === true || role === 'user');
  },

  getTagRegexPack(tagName) {
    const normalizedTag = String(tagName || '').trim().toLowerCase();
    if (!normalizedTag) return null;

    if (!this._tagRegexCache) {
      this._tagRegexCache = new Map();
    }

    if (!this._tagRegexCache.has(normalizedTag)) {
      const escaped = escapeRegExp(normalizedTag);
      this._tagRegexCache.set(normalizedTag, {
        completeBlockPattern: new RegExp(`<${escaped}\\b[^>]*>[\\s\\S]*?<\\/${escaped}>`, 'gi'),
        danglingOpenPattern: new RegExp(`<${escaped}\\b[^>]*>[\\s\\S]*$`, 'i'),
        danglingClosePattern: new RegExp(`<\\/${escaped}>`, 'gi'),
      });
    }

    return this._tagRegexCache.get(normalizedTag);
  },

  replaceTaggedBlock(text, tagName, newBlock, options = {}) {
    const pack = this.getTagRegexPack(tagName);
    if (!pack) return String(text || '');
    const { completeBlockPattern, danglingOpenPattern, danglingClosePattern } = pack;

    const cleaned = String(text || '')
      .replace(completeBlockPattern, '')
      .replace(danglingOpenPattern, '')
      .replace(danglingClosePattern, '')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd();

    const trimmed = cleaned;
    const blockText = String(newBlock || '').trim();
    if (!blockText) return trimmed;

    const mode = String(options?.position || 'append').toLowerCase();
    if (mode === 'prepend') {
      return trimmed ? `${blockText}\n\n${trimmed}` : blockText;
    }
    return trimmed ? `${trimmed}\n\n${blockText}` : blockText;
  },

  async injectBizSimBlocksToMessage(messageId, maxLookback = 10, injectionMode = 'append') {
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
    if (worldBlock) updatedText = this.replaceTaggedBlock(updatedText, 'bz_world_state', worldBlock, { position: injectionMode });
    if (assetBlock) updatedText = this.replaceTaggedBlock(updatedText, 'bz_asset_sheet', assetBlock, { position: injectionMode });
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
    const traceId = `sim_${Date.now()}`;
    let completionPayload = null;
    this._setSimulationRunning?.(true, 'runSimulation');

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

      if (!parsed) {
        const failResult = { success: false, error: lastError || '无法解析推演结果', raw: lastRawResult };
        completionPayload = {
          success: false,
          traceId,
          source: 'runSimulation',
          error: failResult.error,
          timestamp: Date.now(),
        };
        return failResult;
      }

      const previousData = this.data;
      const previousWorldSimulation = this.worldSimulation;
      const normalized = this.normalizeSimulationOutput(parsed);
      const validationResult = this.validateAIParsedResult(normalized, {
        floorData: previousData,
        worldSimulation: previousWorldSimulation,
      });
      const blockingIssues = Array.isArray(validationResult?.blockingIssues) ? validationResult.blockingIssues : [];
      const warningIssues = Array.isArray(validationResult?.warningIssues) ? validationResult.warningIssues : [];

      this._stagePendingState?.(normalized.floorData, normalized.worldSimulation, {
        source: 'simulation:parsed',
        traceId,
      });

      const syncResult = await this.syncLatestFloorVariables(this._pendingData, this._pendingWorldSimulation);
      if (!syncResult?.success) {
        this.data = previousData;
        this.worldSimulation = previousWorldSimulation;
        this._clearPendingState?.();
        const failResult = {
          success: false,
          error: '本地约束校验未通过，已阻止写回。',
          constraintErrors: Array.isArray(syncResult?.errors) ? syncResult.errors : ['未知约束错误'],
          localValidationIssues: Array.isArray(validationResult?.issues) ? validationResult.issues : [],
          localValidationBlockingIssues: blockingIssues,
          localValidationWarningIssues: warningIssues,
        };
        completionPayload = {
          success: false,
          traceId,
          source: 'syncLatestFloorVariables',
          error: failResult.error,
          constraintErrors: failResult.constraintErrors,
          timestamp: Date.now(),
        };
        return failResult;
      }

      this._stagePendingState?.(
        syncResult.normalizedFloorData || this._pendingData,
        syncResult.normalizedWorldSimulation || this._pendingWorldSimulation,
        {
          source: 'simulation:post-sync',
          traceId,
        },
      );
      this._commitState?.({ source: 'runSimulation', traceId });

      this.validateCrossSheetIntegrity();
      if (this.config.SIMULATION?.autoSave !== false) await this.saveSettingsOnly();

      const injected = this.config.SIMULATION?.bodyInjectionEnabled === true
        ? await this.injectBizSimBlocksToMessage(syncResult.messageId, 10)
        : { success: false, updated: false, reason: 'body-injection-disabled' };

      const successResult = {
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
      completionPayload = {
        success: true,
        traceId,
        source: 'runSimulation',
        timestamp: Date.now(),
        data: successResult.data,
      };
      return successResult;
    } catch (error) {
      this._clearPendingState?.();
      completionPayload = {
        success: false,
        traceId,
        source: 'runSimulation:exception',
        error: error?.message || 'unknown-error',
        timestamp: Date.now(),
      };
      return { success: false, error: error.message };
    } finally {
      this._clearPendingState?.();
      this._setSimulationRunning?.(false, 'runSimulation');
      if (completionPayload) {
        this.emit?.('simulation-completed', completionPayload);
      }
    }
  },
};
