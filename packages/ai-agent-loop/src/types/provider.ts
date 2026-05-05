/** LLM Provider 接口定义（LLM Provider Types） 抽象 Anthropic/OpenAI 等 SDK 的流式调用接口 */

import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { AgentMessage, ToolReferenceBlock, ToolUseBlock } from './messages';

/** LLM 流式产出块 */
export interface LLMStreamChunk {
  /** 文本增量 */
  readonly textDelta?: string;
  /** 思考增量 */
  readonly thinkingDelta?: string;
  /** 完整的 tool_use block */
  readonly toolUse?: ToolUseBlock;
  /** 完整的 tool_reference block (P12) */
  readonly toolReference?: ToolReferenceBlock;
  /** 是否流结束 */
  readonly done: boolean;
  /** 用量信息（message_start 或 message_delta 事件中的 usage） */
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheCreationInputTokens?: number;
    readonly cacheReadInputTokens?: number;
    readonly cacheCreationEphemeralInputTokens?: number;
    readonly serviceTier?: string;
  };
  /** 停止原因（message_delta 事件中的 stop_reason） */
  readonly stopReason?: string;
}

/** P87: 非流式 LLM 响应 — 一次性返回完整结果 */
export interface LLMResponse {
  /** 完整文本内容 */
  readonly content: string;
  /** 完整思考内容（仅支持 thinking 的模型） */
  readonly thinking?: string;
  /** 工具调用列表 */
  readonly toolUses?: readonly ToolUseBlock[];
  /** 工具引用列表 (P12) */
  readonly toolReferences?: readonly ToolReferenceBlock[];
  /** 用量信息 */
  readonly usage?: LLMStreamChunk['usage'];
  /** 停止原因 */
  readonly stopReason?: string;
}

/** LLM 工具定义（Provider 适配后的格式） */
export interface ToolDefinition {
  /** 工具名称 */
  readonly name: string;
  /** 工具描述 */
  readonly description: string;
  /** 输入 Schema（JSON Schema 格式） */
  readonly inputSchema: Record<string, unknown>;
}

/** SystemPrompt — branded string[]，不可与普通 string[] 混用 */
export type SystemPrompt = readonly string[] & { readonly __brand: 'SystemPrompt' };

/** 创建 branded SystemPrompt */
export function createSystemPrompt(sections: readonly string[]): SystemPrompt {
  return sections as SystemPrompt;
}

/** callModel 的 Options 参数（P35 新增，替代原 AbortSignal 位置参数） */
export interface CallModelOptions {
  /** 系统提示段落（branded string[]，可选） */
  readonly systemPrompt?: SystemPrompt;
  /** 中断信号（可选） */
  readonly signal?: AbortSignal;
}

/**
 * LLM Provider 接口（抽象 Anthropic/OpenAI 等 SDK）
 *
 * 下游包可实现具体的 Provider 适配器：
 *
 * - AnthropicProvider（对接 Anthropic Claude API）
 * - OpenAIProvider（对接 OpenAI GPT API）
 * - OllamaProvider（对接本地 Ollama 服务）
 *
 * @example
 *   class MyProvider implements LLMProvider {
 *     async *callModel(messages, tools, options) {
 *       // 调用具体的 LLM API，流式产出 LLMStreamChunk
 *     }
 *     formatToolDefinition(tool) {
 *       // 将 BuiltTool 转换为具体 SDK 的工具定义格式
 *     }
 *   }
 */
export interface LLMProvider {
  /**
   * 流式调用 LLM
   *
   * @param messages 消息历史
   * @param tools 可用工具定义（可选，无工具时不传）
   * @param options 调用选项（含 systemPrompt 和 signal，可选）
   * @returns AsyncGenerator<LLMStreamChunk> 流式产出块
   */
  callModel(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): AsyncGenerator<LLMStreamChunk>;

  /**
   * P87: 非流式调用 LLM — 一次性返回完整响应
   *
   * 适用于 cost estimate、dry-run、token 计数预估等不需要流式输出的场景。 默认实现会消费 callModel 的流式输出并组装为 LLMResponse。
   *
   * @param messages 消息历史
   * @param tools 可用工具定义（可选）
   * @param options 调用选项（含 systemPrompt 和 signal，可选）
   * @returns LLMResponse 完整响应
   */
  callModelOnce(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): Promise<LLMResponse>;

  /**
   * 将 BuiltTool 转换为 LLM 可理解的工具定义格式
   *
   * 不同 LLM Provider 的工具定义格式不同，由 Provider 实现自行适配。 ToolDefinition 使用 JSON Schema 作为通用中间格式。
   */
  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition;
}
