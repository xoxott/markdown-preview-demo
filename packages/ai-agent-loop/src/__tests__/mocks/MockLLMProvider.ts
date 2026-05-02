/** Mock LLM Provider — 用于测试的可控流式产出模拟 */

import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { CallModelOptions, LLMProvider, LLMStreamChunk, SystemPrompt, ToolDefinition } from '../../types/provider';
import type { AgentMessage, ToolUseBlock } from '../../types/messages';

/** Mock LLM Provider 配置 */
export interface MockLLMProviderConfig {
  /** 是否抛出错误 */
  shouldFail?: boolean;
  /** 抛出的错误对象 */
  failError?: Error;
  /** 每个块的延迟（ms） */
  delay?: number;
}

/**
 * Mock LLM Provider
 *
 * 支持多轮响应：通过 addResponse 添加每轮的 chunks 序列， 每次调用 callModel 时使用下一轮的响应。 如果所有轮次响应都已耗尽，抛出 Error 防止无限循环。
 */
export class MockLLMProvider implements LLMProvider {
  private responses: LLMStreamChunk[][] = [];
  private shouldFail = false;
  private failError: Error = new Error('Mock LLM error');
  private delay = 0;
  private callCount = 0;
  private callHistory: { messages: readonly AgentMessage[]; tools?: readonly ToolDefinition[]; systemPrompt?: SystemPrompt }[] =
    [];

  constructor(config?: MockLLMProviderConfig) {
    if (config?.shouldFail) this.shouldFail = config.shouldFail;
    if (config?.failError) this.failError = config.failError;
    if (config?.delay) this.delay = config.delay;
  }

  /** 添加一轮响应 */
  addResponse(chunks: LLMStreamChunk[]): void {
    this.responses.push(chunks);
  }

  /** 设置简单文本响应（逐字产出 + done） */
  addSimpleTextResponse(text: string): void {
    this.responses.push([
      ...text.split('').map(c => ({ textDelta: c, done: false })),
      { done: true }
    ]);
  }

  /** 设置带 usage 的简单文本响应 */
  addSimpleTextResponseWithUsage(
    text: string,
    usage: { inputTokens: number; outputTokens: number }
  ): void {
    this.responses.push([
      ...text.split('').map(c => ({ textDelta: c, done: false })),
      { done: true, usage, stopReason: 'end_turn' }
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

  /** 设置失败模式 */
  setShouldFail(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    if (error) this.failError = error;
  }

  /** 设置延迟 */
  setDelay(delay: number): void {
    this.delay = delay;
  }

  /** 获取调用历史 */
  getCallHistory() {
    return this.callHistory;
  }

  /** 获取调用次数 */
  getCallCount() {
    return this.callCount;
  }

  formatToolDefinition(tool: AnyBuiltTool): ToolDefinition {
    return {
      name: tool.name,
      description: 'mock description',
      inputSchema: {}
    };
  }

  async *callModel(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    this.callHistory.push({ messages, tools, systemPrompt: options?.systemPrompt });
    this.callCount++;

    if (this.shouldFail) {
      throw this.failError;
    }

    // 使用当前轮次的响应
    const chunks = this.responses[this.callCount - 1];
    if (!chunks) {
      throw new Error(
        `MockLLMProvider: 第 ${this.callCount} 轮没有预设响应，请先调用 addResponse/addSimpleTextResponse/addToolUseResponse`
      );
    }

    for (const chunk of chunks) {
      if (options?.signal?.aborted) {
        throw new DOMException('Mock LLM aborted', 'AbortError');
      }

      if (this.delay > 0) {
        await new Promise<void>(r => {
          setTimeout(r, this.delay);
        });
      }

      yield chunk;
    }
  }
}
