/** MockLLMProvider — P10 测试用可控 Provider */

import type {
  AgentMessage,
  CallModelOptions,
  LLMProvider,
  LLMStreamChunk,
  ToolDefinition,
  ToolUseBlock
} from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';

/**
 * Mock LLM Provider
 *
 * 支持多轮响应预设，每次 callModel 使用下一轮。
 */
export class MockLLMProvider implements LLMProvider {
  private responses: LLMStreamChunk[][] = [];
  private callCount = 0;

  /** 添加一轮响应 */
  addResponse(chunks: LLMStreamChunk[]): void {
    this.responses.push(chunks);
  }

  /** 设置简单文本响应 */
  addSimpleTextResponse(text: string): void {
    this.responses.push([
      ...text.split('').map(c => ({ textDelta: c, done: false })),
      { done: true }
    ]);
  }

  /** 设置带工具调用的响应 */
  addToolUseResponse(text: string, toolUses: ToolUseBlock[]): void {
    this.responses.push([
      ...text.split('').map(c => ({ textDelta: c, done: false })),
      ...toolUses.map(tu => ({ toolUse: tu, done: false })),
      { done: true }
    ]);
  }

  /** 获取调用次数 */
  getCallCount(): number {
    return this.callCount;
  }

  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return { name: tool.name, description: 'mock', inputSchema: {} };
  }

  async *callModel(
    _messages: readonly AgentMessage[],
    _tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    this.callCount++;

    const chunks = this.responses[this.callCount - 1];
    if (!chunks) {
      throw new Error(`MockLLMProvider: 第 ${this.callCount} 轮无预设响应`);
    }

    for (const chunk of chunks) {
      if (options?.signal?.aborted) {
        throw new DOMException('Mock LLM aborted', 'AbortError');
      }
      yield chunk;
    }
  }
}
