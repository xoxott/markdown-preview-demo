/** Azure OpenAI 适配器 — 复用 OpenAI Chat Completion 格式，差异化认证和 URL */

import type {
  AgentMessage,
  CallModelOptions,
  LLMResponse,
  LLMStreamChunk,
  ToolDefinition
} from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { OpenAINonStreamResponse, OpenAIToolDef } from '../types/openai';
import { DEFAULT_OPENAI_MAX_TOKENS } from '../types/openai';
import { convertToOpenAIMessages } from '../convert/openai-message-converter';
import { formatOpenAIToolDefinition } from '../convert/openai-tool-definition';
import { parseOpenAISSEStream } from '../stream/openai-sse-parser';
import { mapOpenAIError } from '../error/openai-error-mapper';
import { extractOpenAIRateLimitStatus } from '../rate-limit/extract-openai-rate-limit';
import { withLLMRetry } from '../retry/retry-strategy';
import { BaseLLMAdapter } from './BaseLLMAdapter';

/** Azure OpenAI 适配器配置 */
export interface AzureOpenAIAdapterConfig {
  /** Azure endpoint（如 https://my-resource.openai.azure.com） */
  readonly endpoint: string;
  /** Azure API 密钥 */
  readonly apiKey: string;
  /** Azure 部署名称（对应 OpenAI 的 model） */
  readonly deployment: string;
  /** Azure API 版本（如 2024-02-01） */
  readonly apiVersion?: string;
  /** 请求超时 ms（默认 60000） */
  readonly timeout?: number;
  /** 最大 token 数 */
  readonly maxTokens?: number;
  /** 自定义请求头 */
  readonly customHeaders?: Record<string, string>;
  /** 采样温度 */
  readonly temperature?: number;
  /** 顶部 P */
  readonly topP?: number;
  /** 频率惩罚 */
  readonly frequencyPenalty?: number;
  /** 存在惩罚 */
  readonly presencePenalty?: number;
  /** 推理努力程度 */
  readonly reasoningEffort?: 'low' | 'medium' | 'high';
  /** 响应格式 */
  readonly responseFormat?: import('../types/openai').OpenAIResponseFormat;
}

/** 默认 Azure API 版本 */
export const DEFAULT_AZURE_API_VERSION = '2024-02-01';

/**
 * Azure OpenAI 适配器
 *
 * Azure OpenAI 与标准 OpenAI 使用完全相同的 Chat Completion API 格式， 但认证方式和 URL 格式不同：
 *
 * - 认证：`api-key` header（而非 `Authorization: Bearer`）
 * - URL：`{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={version}`
 * - model 参数由 deployment 名称替代
 *
 * 直接继承 BaseLLMAdapter，复用 OpenAI 的消息转换、SSE 解析、错误映射等模块， 仅在 buildHeaders 和 URL 构建处差异化。
 */
export class AzureOpenAIAdapter extends BaseLLMAdapter {
  private readonly azureConfig: AzureOpenAIAdapterConfig;

  constructor(config: AzureOpenAIAdapterConfig) {
    super({
      baseURL: config.endpoint,
      apiKey: config.apiKey,
      model: config.deployment,
      timeout: config.timeout,
      customHeaders: config.customHeaders,
      maxTokens: config.maxTokens
    });
    this.azureConfig = config;
  }

  /** 实现 formatToolDefinition — 与 OpenAI 格式相同 */
  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return formatOpenAIToolDefinition(tool);
  }

  /** 实现 callModel — Azure OpenAI Chat Completion API 流式调用 */
  async *callModel(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    const apiMessages = convertToOpenAIMessages(messages, options?.systemPrompt);
    const requestBody = this.buildRequestBody(apiMessages, tools);
    const url = this.getApiUrl();
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

    if (!response.ok) {
      const errorBody = await response.text();
      throw mapOpenAIError(response.status, errorBody);
    }

    const rateLimitStatus = extractOpenAIRateLimitStatus(response.headers);
    if (rateLimitStatus) {
      const provider = this.getRateLimitProvider();
      if (provider) provider.onRateLimitUpdate(rateLimitStatus);
    }

    const tracker = this.getUsageTracker();
    for await (const chunk of parseOpenAISSEStream(response, signal)) {
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

  /** P87: 非流式调用 — BaseLLMAdapter 默认实现已足够 */
  async callModelOnce(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): Promise<LLMResponse> {
    // BaseLLMAdapter 的默认实现消费 callModel 流式输出并组装 LLMResponse
    // 但 Azure 的非流式路径可以更高效
    const apiMessages = convertToOpenAIMessages(messages, options?.systemPrompt);
    const requestBody = this.buildRequestBody(apiMessages, tools);
    requestBody.stream = false;
    delete requestBody.stream_options;

    const url = this.getApiUrl();
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

    if (!response.ok) {
      const errorBody = await response.text();
      throw mapOpenAIError(response.status, errorBody);
    }

    const body = (await response.json()) as OpenAINonStreamResponse;
    const tracker = this.getUsageTracker();
    if (body.usage && tracker) {
      tracker.trackUsage({
        inputTokens: body.usage.prompt_tokens,
        outputTokens: body.usage.completion_tokens,
        cacheReadInputTokens: body.usage.prompt_tokens_details?.cached_tokens
      });
    }

    return this.parseNonStreamResponse(body);
  }

  /** 解析非流式 JSON 响应 → LLMResponse（与 OpenAI 格式相同） */
  private parseNonStreamResponse(body: OpenAINonStreamResponse): LLMResponse {
    const choice = body.choices[0];
    if (!choice) return { content: '', usage: undefined, stopReason: undefined };

    const toolUses: import('@suga/ai-agent-loop').ToolUseBlock[] = [];
    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        toolUses.push({
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments) as Record<string, unknown>
        });
      }
    }

    return {
      content: choice.message.content ?? '',
      toolUses: toolUses.length > 0 ? toolUses : undefined,
      usage: {
        inputTokens: body.usage.prompt_tokens,
        outputTokens: body.usage.completion_tokens,
        cacheReadInputTokens: body.usage.prompt_tokens_details?.cached_tokens
      },
      stopReason: choice.finish_reason ?? undefined
    };
  }

  /** Azure API URL */
  private getApiUrl(): string {
    const apiVersion = this.azureConfig.apiVersion ?? DEFAULT_AZURE_API_VERSION;
    return `${this.azureConfig.endpoint}/openai/deployments/${this.azureConfig.deployment}/chat/completions?api-version=${apiVersion}`;
  }

  /** Azure 认证：api-key header（而非 Authorization: Bearer） */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'api-key': this.config.apiKey
    };
    return headers;
  }

  /** 构建请求体（与 OpenAI 格式相同） */
  private buildRequestBody(
    messages: readonly import('../types/openai').OpenAIMessage[],
    tools?: readonly ToolDefinition[]
  ): Record<string, unknown> {
    const retryContext = this.getRetryContext();
    const maxTokensOverride = retryContext?.maxTokensOverride;
    const maxTokens = maxTokensOverride ?? this.config.maxTokens ?? DEFAULT_OPENAI_MAX_TOKENS;

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
      temperature: this.azureConfig.temperature,
      top_p: this.azureConfig.topP,
      frequency_penalty: this.azureConfig.frequencyPenalty,
      presence_penalty: this.azureConfig.presencePenalty,
      reasoning_effort: this.azureConfig.reasoningEffort,
      response_format: this.azureConfig.responseFormat
    };
  }
}
