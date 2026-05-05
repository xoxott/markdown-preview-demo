/** Anthropic Claude API 适配器 — HTTP 流式调用实现 */

import type {
  AgentMessage,
  CallModelOptions,
  LLMResponse,
  LLMStreamChunk,
  SystemPrompt,
  ToolDefinition
} from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type {
  AnthropicAdapterConfig,
  AnthropicMessage,
  AnthropicNonStreamResponse,
  AnthropicRequestBody,
  AnthropicSystemField,
  AnthropicSystemTextBlock
} from '../types/anthropic';
import {
  ANTHROPIC_PROMPT_CACHE_BETA,
  ANTHROPIC_TOKEN_BATCHING_BETA,
  DEFAULT_ANTHROPIC_API_VERSION,
  DEFAULT_ANTHROPIC_MAX_TOKENS
} from '../types/anthropic';
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
    options?: CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    // 1. 转换消息格式
    const apiMessages = convertToAnthropicMessages(messages);

    // 2. 构建请求体（支持 systemPrompt + RetryContext.maxTokensOverride）
    const requestBody = this.buildRequestBody(apiMessages, tools, options?.systemPrompt);

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

  /**
   * P87: 非流式调用 — Anthropic Messages API stream:false 模式
   *
   * 直接获取完整响应，不经过 SSE 流式解析。适用于 cost estimate、token 预估等场景。
   */
  async callModelOnce(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): Promise<LLMResponse> {
    // 1. 转换消息格式
    const apiMessages = convertToAnthropicMessages(messages);

    // 2. 构建非流式请求体（stream: false）
    const requestBody = this.buildRequestBody(apiMessages, tools, options?.systemPrompt);
    requestBody.stream = false;

    // 3. 发送 HTTP 请求
    const url = `${this.config.baseURL}/v1/messages`;
    const headers = this.buildHeaders();
    const signal = options?.signal;

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

    // 4. 检查错误响应
    if (!response.ok) {
      const errorBody = await response.text();
      throw mapAnthropicError(response.status, errorBody);
    }

    // 5. 提取 Rate Limit headers
    const rateLimitStatus = extractRateLimitStatus(response.headers);
    if (rateLimitStatus) {
      const provider = this.getRateLimitProvider();
      if (provider) provider.onRateLimitUpdate(rateLimitStatus);
    }

    // 6. 解析非流式 JSON 响应
    const body = (await response.json()) as AnthropicNonStreamResponse;
    const tracker = this.getUsageTracker();

    // 提取 usage → UsageTracker
    if (body.usage && tracker) {
      tracker.trackUsage({
        inputTokens: body.usage.input_tokens,
        outputTokens: body.usage.output_tokens,
        cacheCreationInputTokens: body.usage.cache_creation_input_tokens,
        cacheReadInputTokens: body.usage.cache_read_input_tokens
      });
    }

    // 组装 LLMResponse
    return this.parseNonStreamResponse(body);
  }

  /** 解析 Anthropic 非流式 JSON 响应 → LLMResponse */
  private parseNonStreamResponse(body: AnthropicNonStreamResponse): LLMResponse {
    let content = '';
    let thinking: string | undefined;
    const toolUses: import('@suga/ai-agent-loop').ToolUseBlock[] = [];
    const toolReferences: import('@suga/ai-agent-loop').ToolReferenceBlock[] = [];

    for (const block of body.content) {
      switch (block.type) {
        case 'text':
          content += block.text;
          break;
        case 'thinking':
          thinking = (thinking ?? '') + block.thinking;
          break;
        case 'tool_use':
          toolUses.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>
          });
          break;
        case 'tool_reference':
          toolReferences.push({
            toolUseId: block.id,
            name: block.name,
            input: block.input ?? {}
          });
          break;

        default:
          // 未知 content block 类型忽略
          break;
      }
    }

    return {
      content,
      thinking,
      toolUses: toolUses.length > 0 ? toolUses : undefined,
      toolReferences: toolReferences.length > 0 ? toolReferences : undefined,
      usage: body.usage
        ? {
            inputTokens: body.usage.input_tokens,
            outputTokens: body.usage.output_tokens,
            cacheCreationInputTokens: body.usage.cache_creation_input_tokens,
            cacheReadInputTokens: body.usage.cache_read_input_tokens
          }
        : undefined,
      stopReason: body.stop_reason
    };
  }
  private buildHeaders(): Record<string, string> {
    const apiVersion = this.anthropicConfig.apiVersion ?? DEFAULT_ANTHROPIC_API_VERSION;

    const headers: Record<string, string> = {
      'x-api-key': this.config.apiKey,
      'anthropic-version': apiVersion
    };

    // 组合 anthropic-beta header（多 feature 逗号拼接）
    const betaFlags: string[] = [];
    if (this.anthropicConfig.betaFeatures?.promptCaching) {
      betaFlags.push(ANTHROPIC_PROMPT_CACHE_BETA);
    }
    if (this.anthropicConfig.betaFeatures?.tokenBatching) {
      betaFlags.push(ANTHROPIC_TOKEN_BATCHING_BETA);
    }
    if (betaFlags.length > 0) {
      headers['anthropic-beta'] = betaFlags.join(',');
    }

    return headers;
  }

  /** 构建 Anthropic API 请求体 */
  private buildRequestBody(
    messages: readonly AnthropicMessage[],
    tools?: readonly ToolDefinition[],
    systemPrompt?: SystemPrompt
  ): AnthropicRequestBody {
    // 支持 RetryContext.maxTokensOverride（context overflow auto-adjust）
    const retryContext = this.getRetryContext();
    const maxTokensOverride = retryContext?.maxTokensOverride;
    const maxTokens = maxTokensOverride ?? this.config.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS;

    // system 字段：传入 systemPrompt 时用动态构建，否则 fallback 到构造时配置
    const systemField: AnthropicSystemField | undefined = systemPrompt
      ? this.buildSystemPromptBlocks(systemPrompt)
      : this.anthropicConfig.system;

    const body: AnthropicRequestBody = {
      model: this.config.model,
      max_tokens: maxTokens,
      stream: true,
      messages: [...messages],
      system: systemField,
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

  /** 将 SystemPrompt (branded string[]) 转为 Anthropic API system 字段 */
  private buildSystemPromptBlocks(systemPrompt: SystemPrompt): AnthropicSystemField {
    // 过滤空段
    const filtered = systemPrompt.filter(s => s !== '');
    if (filtered.length === 0) return undefined as unknown as AnthropicSystemField;

    // 单段 → 简化为 string（无需 TextBlockParam）
    if (filtered.length === 1) return filtered[0];

    // 多段 → AnthropicSystemTextBlock[]（最后一段带 cache_control）
    return filtered.map((text, i) => {
      const block: AnthropicSystemTextBlock = {
        type: 'text',
        text,
        cache_control: i === filtered.length - 1 ? { type: 'ephemeral' } : undefined
      };
      return block;
    });
  }
}
