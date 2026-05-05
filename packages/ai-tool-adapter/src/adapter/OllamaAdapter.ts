/** Ollama 本地推理适配器 — 复用 OpenAI Chat Completion 兼容格式 */

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
import { withLLMRetry } from '../retry/retry-strategy';
import { BaseLLMAdapter } from './BaseLLMAdapter';

/** Ollama 适配器配置 */
export interface OllamaAdapterConfig {
  /** Ollama 服务基础 URL（默认 http://localhost:11434） */
  readonly baseURL?: string;
  /** 模型名称（如 llama3, mistral, codellama） */
  readonly model: string;
  /** 请求超时 ms（默认 120000，本地推理较慢） */
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
}

/** 默认 Ollama 服务地址 */
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

/** 默认 Ollama 超时（本地推理较慢，120s） */
export const DEFAULT_OLLAMA_TIMEOUT = 120_000;

/**
 * Ollama 本地推理适配器
 *
 * Ollama v0.1.30+ 支持 OpenAI Chat Completion 兼容 API：
 *
 * - URL: `{baseURL}/v1/chat/completions`（与 OpenAI 格式完全一致）
 * - 无需 API 密钥（本地推理）
 * - SSE 流式格式与 OpenAI 相同（data: 行 + [DONE] 结束标记）
 * - 工具调用格式与 OpenAI 相同（tool_calls + function.name/arguments）
 *
 * 因此复用 OpenAI 的消息转换、SSE 解析、错误映射模块， 仅在认证（无需 Authorization header）和默认 URL 处差异化。
 */
export class OllamaAdapter extends BaseLLMAdapter {
  private readonly ollamaConfig: OllamaAdapterConfig;

  constructor(config: OllamaAdapterConfig) {
    super({
      baseURL: config.baseURL ?? DEFAULT_OLLAMA_BASE_URL,
      apiKey: 'ollama-no-key', // Ollama 不需要 API 密钥，但 BaseLLMAdapter 需要
      model: config.model,
      timeout: config.timeout ?? DEFAULT_OLLAMA_TIMEOUT,
      customHeaders: config.customHeaders,
      maxTokens: config.maxTokens
    });
    this.ollamaConfig = config;
  }

  /** 实现 formatToolDefinition — 与 OpenAI 格式相同 */
  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return formatOpenAIToolDefinition(tool);
  }

  /** 实现 callModel — Ollama OpenAI-compatible API 流式调用 */
  async *callModel(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    const apiMessages = convertToOpenAIMessages(messages, options?.systemPrompt);
    const requestBody = this.buildRequestBody(apiMessages, tools);
    const url = `${this.config.baseURL}/v1/chat/completions`;
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

  /** P87: 非流式调用 */
  async callModelOnce(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): Promise<LLMResponse> {
    const apiMessages = convertToOpenAIMessages(messages, options?.systemPrompt);
    const requestBody = this.buildRequestBody(apiMessages, tools);
    requestBody.stream = false;
    delete requestBody.stream_options;

    const url = `${this.config.baseURL}/v1/chat/completions`;
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

  /** 解析非流式 JSON 响应 → LLMResponse */
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
      usage: body.usage
        ? { inputTokens: body.usage.prompt_tokens, outputTokens: body.usage.completion_tokens }
        : undefined,
      stopReason: choice.finish_reason ?? undefined
    };
  }

  /** Ollama 无需 Authorization header */
  private buildHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  /** 构建请求体（与 OpenAI 格式相同，但无 response_format/reasoning_effort） */
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
      temperature: this.ollamaConfig.temperature,
      top_p: this.ollamaConfig.topP,
      frequency_penalty: this.ollamaConfig.frequencyPenalty,
      presence_penalty: this.ollamaConfig.presencePenalty
    };
  }
}
