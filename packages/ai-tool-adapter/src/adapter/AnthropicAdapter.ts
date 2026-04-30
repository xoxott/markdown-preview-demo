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
 *
 * @example
 *   const adapter = new AnthropicAdapter({
 *     baseURL: 'https://api.anthropic.com',
 *     apiKey: process.env.ANTHROPIC_API_KEY!,
 *     model: 'claude-sonnet-4-20250514'
 *   });
 *
 *   const loop = new AgentLoop({ provider: adapter, maxTurns: 5 });
 *   for await (const event of loop.queryLoop([userMsg])) {
 *     console.log(event);
 *   }
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
    signal?: AbortSignal
  ): AsyncGenerator<LLMStreamChunk> {
    // 1. 转换消息格式
    const apiMessages = convertToAnthropicMessages(messages);

    // 2. 构建请求体
    const requestBody = this.buildRequestBody(apiMessages, tools);

    // 3. 发送 HTTP 请求
    const url = `${this.config.baseURL}/v1/messages`;
    const response = await this.fetchWithAbort(url, requestBody, signal, this.buildHeaders());

    // 4. 检查非流式错误响应
    if (!response.ok) {
      const errorBody = await response.text();
      throw mapAnthropicError(response.status, errorBody);
    }

    // 5. 解析 SSE 流 → LLMStreamChunk
    yield* parseAnthropicSSEStream(response, signal);
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
    const maxTokens = this.config.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS;

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
