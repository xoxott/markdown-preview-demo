/** OpenAI Chat Completion API 适配器 — HTTP 流式调用实现 */

import type {
  AgentMessage,
  CallModelOptions,
  LLMStreamChunk,
  ToolDefinition
} from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { OpenAIAdapterConfig, OpenAIToolDef } from '../types/openai';
import { DEFAULT_OPENAI_MAX_TOKENS } from '../types/openai';
import { convertToOpenAIMessages } from '../convert/openai-message-converter';
import { formatOpenAIToolDefinition } from '../convert/openai-tool-definition';
import { parseOpenAISSEStream } from '../stream/openai-sse-parser';
import { mapOpenAIError } from '../error/openai-error-mapper';
import { extractOpenAIRateLimitStatus } from '../rate-limit/extract-openai-rate-limit';
import { withLLMRetry } from '../retry/retry-strategy';
import { BaseLLMAdapter } from './BaseLLMAdapter';

/**
 * OpenAI Chat Completion API 适配器
 *
 * 轻量 HTTP 实现，不依赖 openai SDK：
 *
 * - 直接使用原生 fetch 发送请求
 * - 支持自定义 baseURL 和 headers（适配代理环境）
 * - OpenAI SSE 流式响应解析（data: 行格式 + [DONE] 结束标记）
 * - 工具调用（tool_calls）按 index 增量累积
 * - stream_options: { include_usage: true } 支持用量信息
 * - x-ratelimit-* header 提取 → RateLimitProvider
 * - SSE usage 提取 → UsageTracker
 * - withLLMRetry 包裹 HTTP 请求部分（流式消费不重试）
 * - 支持 temperature/top_p/frequency_penalty/presence_penalty/reasoning_effort/response_format
 */
export class OpenAIAdapter extends BaseLLMAdapter {
  private readonly openaiConfig: OpenAIAdapterConfig;

  constructor(config: OpenAIAdapterConfig) {
    super({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
      timeout: config.timeout,
      customHeaders: config.customHeaders,
      maxTokens: config.maxTokens
    });
    this.openaiConfig = config;
  }

  /** 实现 formatToolDefinition */
  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return formatOpenAIToolDefinition(tool);
  }

  /** 实现 callModel — OpenAI Chat Completion API 流式调用 */
  async *callModel(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    // 1. 转换消息格式（含 system prompt）
    const apiMessages = convertToOpenAIMessages(messages, options?.systemPrompt);

    // 2. 构建请求体（含 stream + stream_options + max_tokens + 采样参数）
    const requestBody = this.buildRequestBody(apiMessages, tools);

    // 3. 发送 HTTP 请求（可重试部分）
    const url = `${this.config.baseURL}/v1/chat/completions`;
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
      throw mapOpenAIError(response.status, errorBody);
    }

    // 5. 提取 Rate Limit headers → RateLimitProvider
    const rateLimitStatus = extractOpenAIRateLimitStatus(response.headers);
    if (rateLimitStatus) {
      const provider = this.getRateLimitProvider();
      if (provider) {
        provider.onRateLimitUpdate(rateLimitStatus);
      }
    }

    // 6. 解析 SSE 流 → LLMStreamChunk + 提取 usage → UsageTracker
    const tracker = this.getUsageTracker();

    for await (const chunk of parseOpenAISSEStream(response, signal)) {
      // 提取 usage → UsageTracker
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

  /** 构建 OpenAI API 请求头 */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`
    };

    // 组织 ID（可选）
    if (this.openaiConfig.organization) {
      headers['OpenAI-Organization'] = this.openaiConfig.organization;
    }

    return headers;
  }

  /** 构建 OpenAI API 请求体 */
  private buildRequestBody(
    messages: readonly import('../types/openai').OpenAIMessage[],
    tools?: readonly ToolDefinition[]
  ): import('../types/openai').OpenAIRequestBody {
    // 支持 RetryContext.maxTokensOverride（context overflow auto-adjust）
    const retryContext = this.getRetryContext();
    const maxTokensOverride = retryContext?.maxTokensOverride;
    const maxTokens = maxTokensOverride ?? this.config.maxTokens ?? DEFAULT_OPENAI_MAX_TOKENS;

    // 将 ToolDefinition 转为 OpenAIToolDef 格式
    const openaiTools: OpenAIToolDef[] | undefined =
      tools && tools.length > 0
        ? tools.map(t => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.inputSchema as Record<string, unknown>
            }
          }))
        : undefined;

    return {
      model: this.config.model,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      messages: [...messages],
      tools: openaiTools,
      // 采样参数（从配置传入）
      temperature: this.openaiConfig.temperature,
      top_p: this.openaiConfig.topP,
      frequency_penalty: this.openaiConfig.frequencyPenalty,
      presence_penalty: this.openaiConfig.presencePenalty,
      // o1/o3 系列推理努力
      reasoning_effort: this.openaiConfig.reasoningEffort,
      // JSON mode / structured output
      response_format: this.openaiConfig.responseFormat
    };
  }
}