/** Anthropic Claude API 适配器 — HTTP 流式调用实现 */

import type { AgentMessage, LLMStreamChunk, ToolDefinition } from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type {
  AnthropicAdapterConfig,
  AnthropicMessage,
  AnthropicRequestBody
} from '../types/anthropic';
import { DEFAULT_ANTHROPIC_API_VERSION, DEFAULT_ANTHROPIC_MAX_TOKENS } from '../types/anthropic';
import { convertToAnthropicMessages } from '../convert/message-converter';
import { formatAnthropicToolDefinition } from '../convert/tool-definition';
import { parseAnthropicSSEStream } from '../stream/sse-parser';
import { mapAnthropicError } from '../error/error-mapper';
import { extractRateLimitStatus } from '../rate-limit/extract-rate-limit';
import { withLLMRetry } from '../retry/retry-strategy';
import { BaseLLMAdapter } from './BaseLLMAdapter';

/**
 * Anthropic Claude API 适配器
 *
 * 轻量 HTTP 实现，不依赖 @anthropic-ai/sdk：
 *
 * - 直接使用原生 fetch 发送请求
 * - 支持自定义 baseURL 和 headers（适配代理环境）
 * - SSE 流式响应解析
 * - 工具调用（tool_use）和思考模式（thinking）支持
 * - Rate Limit header 提取 → RateLimitProvider
 * - SSE usage 提取 → UsageTracker
 * - withLLMRetry 包裹 HTTP 请求部分（流式消费不重试）
 */
export class AnthropicAdapter extends BaseLLMAdapter {
  private readonly anthropicConfig: AnthropicAdapterConfig;

  constructor(config: AnthropicAdapterConfig) {
    super({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
      timeout: config.timeout,
      customHeaders: config.customHeaders,
      maxTokens: config.maxTokens
    });
    this.anthropicConfig = config;
  }

  /** 实现 formatToolDefinition */
  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return formatAnthropicToolDefinition(tool);
  }

  /** 实现 callModel — Anthropic Messages API 流式调用 */
  async *callModel(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: import('@suga/ai-agent-loop').CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    // 1. 转换消息格式
    const apiMessages = convertToAnthropicMessages(messages);

    // 2. 构建请求体（支持 RetryContext.maxTokensOverride）
    const requestBody = this.buildRequestBody(apiMessages, tools);

    // 3. 发送 HTTP 请求（可重试部分）
    const url = `${this.config.baseURL}/v1/messages`;
    const headers = this.buildHeaders();
    const signal = options?.signal;

    const response = await withLLMRetry(
      () => this.fetchWithAbort(url, requestBody, signal, headers),
      this.getRetryConfig(),
      (attempt, error, delayMs) => {
        // 通知生命周期钩子
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

    // 4. 检查非流式错误响应
    if (!response.ok) {
      const errorBody = await response.text();
      throw mapAnthropicError(response.status, errorBody);
    }

    // 5. 提取 Rate Limit headers → RateLimitProvider
    const rateLimitStatus = extractRateLimitStatus(response.headers);
    if (rateLimitStatus) {
      const provider = this.getRateLimitProvider();
      if (provider) {
        provider.onRateLimitUpdate(rateLimitStatus);
      }
    }

    // 6. 解析 SSE 流 → LLMStreamChunk + 提取 usage → UsageTracker
    const tracker = this.getUsageTracker();

    for await (const chunk of parseAnthropicSSEStream(response, signal)) {
      // 提取 usage → UsageTracker
      if (chunk.usage && tracker) {
        tracker.trackUsage({
          inputTokens: chunk.usage.inputTokens,
          outputTokens: chunk.usage.outputTokens,
          cacheCreationInputTokens: chunk.usage.cacheCreationInputTokens,
          cacheReadInputTokens: chunk.usage.cacheReadInputTokens,
          cacheCreationEphemeralInputTokens: chunk.usage.cacheCreationEphemeralInputTokens,
          serviceTier: chunk.usage.serviceTier
        });
      }
      yield chunk;
    }
  }

  /** 构建 Anthropic API 请求头 */
  private buildHeaders(): Record<string, string> {
    const apiVersion = this.anthropicConfig.apiVersion ?? DEFAULT_ANTHROPIC_API_VERSION;

    return {
      'x-api-key': this.config.apiKey,
      'anthropic-version': apiVersion
    };
  }

  /** 构建 Anthropic API 请求体 */
  private buildRequestBody(
    messages: readonly AnthropicMessage[],
    tools?: readonly ToolDefinition[]
  ): AnthropicRequestBody {
    // 支持 RetryContext.maxTokensOverride（context overflow auto-adjust）
    const retryContext = this.getRetryContext();
    const maxTokensOverride = retryContext?.maxTokensOverride;
    const maxTokens = maxTokensOverride ?? this.config.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS;

    const body: AnthropicRequestBody = {
      model: this.config.model,
      max_tokens: maxTokens,
      stream: true,
      messages: [...messages],
      system: this.anthropicConfig.system,
      tools:
        tools && tools.length > 0
          ? tools.map(t => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema
            }))
          : undefined,
      thinking: this.anthropicConfig.thinking
    };

    return body;
  }
}
