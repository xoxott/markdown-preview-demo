/** Mock LLM Provider — 用于 P12 SubagentSpawner 测试的可控流式模拟 */

import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type {
  AgentMessage,
  CallModelOptions,
  LLMProvider,
  LLMResponse,
  LLMStreamChunk,
  ToolDefinition,
  ToolReferenceBlock,
  ToolUseBlock
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
    options?: import('@suga/ai-agent-loop').CallModelOptions
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
      if (options?.signal?.aborted) {
        throw new DOMException('Mock LLM aborted', 'AbortError');
      }
      yield chunk;
    }
  }

  async callModelOnce(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: CallModelOptions
  ): Promise<LLMResponse> {
    let content = '';
    let thinking: string | undefined;
    const toolUses: ToolUseBlock[] = [];
    const toolReferences: ToolReferenceBlock[] = [];
    let usage: LLMStreamChunk['usage'] | undefined;
    let stopReason: string | undefined;

    const stream = this.callModel(messages, tools, options);
    for await (const chunk of stream) {
      if (chunk.textDelta) content += chunk.textDelta;
      if (chunk.thinkingDelta) thinking = (thinking ?? '') + chunk.thinkingDelta;
      if (chunk.toolUse) toolUses.push(chunk.toolUse);
      if (chunk.toolReference) toolReferences.push(chunk.toolReference);
      if (chunk.usage) usage = chunk.usage;
      if (chunk.stopReason) stopReason = chunk.stopReason;
    }

    return {
      content,
      thinking,
      toolUses: toolUses.length > 0 ? toolUses : undefined,
      toolReferences: toolReferences.length > 0 ? toolReferences : undefined,
      usage,
      stopReason
    };
  }
}
