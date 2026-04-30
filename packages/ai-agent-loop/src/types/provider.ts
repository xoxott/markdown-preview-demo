/** LLM Provider 接口定义（LLM Provider Types） 抽象 Anthropic/OpenAI 等 SDK 的流式调用接口 */

import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { AgentMessage, ToolUseBlock } from './messages';

/** LLM 流式产出块 */
export interface LLMStreamChunk {
  /** 文本增量 */
  readonly textDelta?: string;
  /** 思考增量 */
  readonly thinkingDelta?: string;
  /** 完整的 tool_use block */
  readonly toolUse?: ToolUseBlock;
  /** 是否流结束 */
  readonly done: boolean;
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
 *     async *callModel(messages, tools, signal) {
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
   * @param signal 中断信号（可选）
   * @returns AsyncGenerator<LLMStreamChunk> 流式产出块
   */
  callModel(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<LLMStreamChunk>;

  /**
   * 将 BuiltTool 转换为 LLM 可理解的工具定义格式
   *
   * 不同 LLM Provider 的工具定义格式不同，由 Provider 实现自行适配。 ToolDefinition 使用 JSON Schema 作为通用中间格式。
   */
  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition;
}
