/** Google Gemini 适配器 — streamGenerateContent + generateContent API */

import type {
  AgentMessage,
  CallModelOptions,
  LLMResponse,
  LLMStreamChunk,
  ToolDefinition
} from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type {
  GeminiAdapterConfig,
  GeminiFunctionCall,
  GeminiNonStreamResponse,
  GeminiRequestBody
} from '../types/gemini';
import {
  DEFAULT_GEMINI_API_VERSION,
  DEFAULT_GEMINI_BASE_URL,
  DEFAULT_GEMINI_MAX_TOKENS
} from '../types/gemini';
import { convertToGeminiContents } from '../convert/gemini-message-converter';
import {
  formatGeminiToolDefinition,
  formatGeminiToolDefs
} from '../convert/gemini-tool-definition';
import { parseGeminiSSEStream } from '../stream/gemini-sse-parser';
import { mapGeminiError } from '../error/gemini-error-mapper';
import { withLLMRetry } from '../retry/retry-strategy';
import { BaseLLMAdapter } from './BaseLLMAdapter';

/**
 * Google Gemini 适配器
 *
 * Gemini API 与 Anthropic/OpenAI 的关键差异：
 *
 * - 认证：`?key=API_KEY` URL 参数（而非 header）
 * - 流式：`streamGenerateContent?alt=sse` URL 参数启用 SSE
 * - 非流式：`generateContent` 端点
 * - 角色：assistant → model
 * - 工具调用：`functionCall { name, args }` 一次性完整输出（无需分片累积）
 * - 工具结果：`functionResponse { name, response }` role: 'function'
 * - System prompt：`systemInstruction` 请求体顶层字段
 * - 无 `[DONE]` SSE 结束标记（流自然结束）
 * - finishReason 用大写：STOP / MAX_TOKENS / SAFETY / FUNCTION_CALL
 */
export class GeminiAdapter extends BaseLLMAdapter {
  private readonly geminiConfig: GeminiAdapterConfig;
  private readonly apiVersion: string;

  constructor(config: GeminiAdapterConfig) {
    super({
      baseURL: config.baseURL ?? DEFAULT_GEMINI_BASE_URL,
      apiKey: config.apiKey,
      model: config.model,
      timeout: config.timeout,
      customHeaders: config.customHeaders,
      maxTokens: config.maxTokens
    });
    this.geminiConfig = config;
    this.apiVersion = config.apiVersion ?? DEFAULT_GEMINI_API_VERSION;
  }

  /** 实现 formatToolDefinition — 中间格式 */
  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return formatGeminiToolDefinition(tool);
  }

  /** 实现 callModel — Gemini streamGenerateContent SSE 流式调用 */
  async *callModel(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    const { contents, systemInstruction } = convertToGeminiContents(
      messages,
      options?.systemPrompt
    );
    const requestBody = this.buildRequestBody(contents, systemInstruction, tools);
    const url = this.getStreamUrl();
    const signal = options?.signal;

    // Gemini 认证通过 URL 参数，无需额外 headers
    const headers: Record<string, string> = {};

    const response = await withLLMRetry(
      () => this.fetchWithAbort(url, requestBody, signal, headers),
      this.getRetryConfig(),
      (attempt, error, delayMs) => {
        const hook = this.getLifecycleHook();
        if (hook?.onRetry) {
          hook.onRetry(
            {
              model: this.config.model,
              messageCount: messages.length,
              toolCount: tools?.length ?? 0,
              startTime: Date.now()
            },
            attempt,
            error,
            delayMs
          );
        }
      },
      this.getRetryContext(),
      this.getAuthRefreshProvider()
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw mapGeminiError(response.status, errorBody);
    }

    const tracker = this.getUsageTracker();
    for await (const chunk of parseGeminiSSEStream(response, signal)) {
      if (chunk.usage && tracker) {
        tracker.trackUsage({
          inputTokens: chunk.usage.inputTokens,
          outputTokens: chunk.usage.outputTokens,
          cacheReadInputTokens: chunk.usage.cacheReadInputTokens
        });
      }
      yield chunk;
    }
  }

  /** P87: 非流式调用 — Gemini generateContent 端点 */
  async callModelOnce(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): Promise<LLMResponse> {
    const { contents, systemInstruction } = convertToGeminiContents(
      messages,
      options?.systemPrompt
    );
    const requestBody = this.buildRequestBody(contents, systemInstruction, tools);
    const url = this.getNonStreamUrl();
    const signal = options?.signal;

    const headers: Record<string, string> = {};

    const response = await withLLMRetry(
      () => this.fetchWithAbort(url, requestBody, signal, headers),
      this.getRetryConfig(),
      (attempt, error, delayMs) => {
        const hook = this.getLifecycleHook();
        if (hook?.onRetry) {
          hook.onRetry(
            {
              model: this.config.model,
              messageCount: messages.length,
              toolCount: tools?.length ?? 0,
              startTime: Date.now()
            },
            attempt,
            error,
            delayMs
          );
        }
      },
      this.getRetryContext(),
      this.getAuthRefreshProvider()
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw mapGeminiError(response.status, errorBody);
    }

    const body = (await response.json()) as GeminiNonStreamResponse;
    const tracker = this.getUsageTracker();
    if (body.usageMetadata && tracker) {
      tracker.trackUsage({
        inputTokens: body.usageMetadata.promptTokenCount,
        outputTokens: body.usageMetadata.candidatesTokenCount,
        cacheReadInputTokens: body.usageMetadata.cachedContentTokenCount
      });
    }

    return this.parseNonStreamResponse(body);
  }

  /** 解析非流式 JSON 响应 → LLMResponse */
  private parseNonStreamResponse(body: GeminiNonStreamResponse): LLMResponse {
    const candidate = body.candidates?.[0];
    if (!candidate?.content?.parts) {
      return { content: '', usage: undefined, stopReason: undefined };
    }

    let content = '';
    const toolUses: import('@suga/ai-agent-loop').ToolUseBlock[] = [];

    for (const part of candidate.content.parts) {
      if ('text' in part && part.text) {
        content += part.text;
      }
      if ('functionCall' in part && part.functionCall) {
        const fc: GeminiFunctionCall = part.functionCall;
        toolUses.push({
          id: `fc_${fc.name}_${Date.now()}`,
          name: fc.name,
          input: fc.args as Record<string, unknown>
        });
      }
    }

    return {
      content,
      toolUses: toolUses.length > 0 ? toolUses : undefined,
      usage: body.usageMetadata
        ? {
            inputTokens: body.usageMetadata.promptTokenCount,
            outputTokens: body.usageMetadata.candidatesTokenCount,
            cacheReadInputTokens: body.usageMetadata.cachedContentTokenCount
          }
        : undefined,
      stopReason: candidate.finishReason ? this.mapFinishReason(candidate.finishReason) : undefined
    };
  }

  /** 流式 URL：streamGenerateContent?alt=sse&key=API_KEY */
  private getStreamUrl(): string {
    const base = this.config.baseURL ?? DEFAULT_GEMINI_BASE_URL;
    return `${base}/${this.apiVersion}/models/${this.config.model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;
  }

  /** 非流式 URL：generateContent?key=API_KEY */
  private getNonStreamUrl(): string {
    const base = this.config.baseURL ?? DEFAULT_GEMINI_BASE_URL;
    return `${base}/${this.apiVersion}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
  }

  /** 构建请求体 */
  private buildRequestBody(
    contents: readonly import('../types/gemini').GeminiContent[],
    systemInstruction?: import('../types/gemini').GeminiSystemInstruction,
    tools?: readonly ToolDefinition[]
  ): GeminiRequestBody {
    const retryContext = this.getRetryContext();
    const maxTokensOverride = retryContext?.maxTokensOverride;
    const maxTokens = maxTokensOverride ?? this.config.maxTokens ?? DEFAULT_GEMINI_MAX_TOKENS;

    const generationConfig: import('../types/gemini').GeminiGenerationConfig = {
      temperature: this.geminiConfig.temperature,
      topP: this.geminiConfig.topP,
      topK: this.geminiConfig.topK,
      maxOutputTokens: maxTokens,
      stopSequences: this.geminiConfig.stopSequences,
      responseMimeType: this.geminiConfig.responseMimeType
    };

    const geminiTools = tools && tools.length > 0 ? formatGeminiToolDefs(tools) : undefined;

    return {
      contents: [...contents],
      systemInstruction,
      tools: geminiTools,
      generationConfig
    };
  }

  /** 将 Gemini finishReason 映射为标准 stopReason */
  private mapFinishReason(finishReason: string): string | undefined {
    switch (finishReason) {
      case 'STOP':
        return 'end_turn';
      case 'MAX_TOKENS':
        return 'max_tokens';
      case 'SAFETY':
        return 'content_filter';
      case 'RECITATION':
        return 'recitation';
      case 'FUNCTION_CALL':
        return 'tool_use';
      default:
        return finishReason;
    }
  }
}
