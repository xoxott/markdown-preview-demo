/** Mock LLM Provider — 用于 P12 SubagentSpawner 测试的可控流式模拟 */

import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type {
  AgentMessage,
  LLMProvider,
  LLMStreamChunk,
  ToolDefinition
} from '@suga/ai-agent-loop';

/**
 * MockLLMProvider — 实现 LLMProvider 接口
 *
 * 支持预设多轮响应、失败模式、延迟模拟。 用于 SubagentSpawner 的真实 spawn 测试。
 */
export class MockLLMProvider implements LLMProvider {
  private responses: LLMStreamChunk[][] = [];
  private shouldFail = false;
  private callCount = 0;

  constructor(config?: { shouldFail?: boolean }) {
    if (config?.shouldFail) this.shouldFail = config.shouldFail;
  }

  /** 添加简单文本响应 */
  addSimpleTextResponse(text: string): void {
    this.responses.push([
      ...text.split('').map(c => ({ textDelta: c, done: false })),
      { done: true }
    ]);
  }

  /** 设置失败模式 */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return {
      name: tool.name,
      description: 'mock description',
      inputSchema: {}
    };
  }

  async *callModel(
    _messages: readonly AgentMessage[],
    _tools?: readonly ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<LLMStreamChunk> {
    this.callCount++;

    if (this.shouldFail) {
      throw new Error('Mock LLM error');
    }

    const chunks = this.responses[this.callCount - 1];
    if (!chunks) {
      throw new Error(`MockLLMProvider: 第 ${this.callCount} 轮没有预设响应`);
    }

    for (const chunk of chunks) {
      if (signal?.aborted) {
        throw new DOMException('Mock LLM aborted', 'AbortError');
      }
      yield chunk;
    }
  }
}
