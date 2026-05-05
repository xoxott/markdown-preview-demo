/** Mock LLM Provider — P2 会话层测试用可控 Provider */

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
import type { AnyBuiltTool } from '@suga/ai-tool-core';

/**
 * Mock LLM Provider
 *
 * 支持多轮响应预设，每次 callModel 使用下一轮。 所有响应耗尽后抛出 Error 防止无限循环。
 */
export class MockLLMProvider implements LLMProvider {
  private responses: LLMStreamChunk[][] = [];
  private shouldFail = false;
  private failError: Error = new Error('Mock LLM error');
  private delay = 0;
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

  /** 设置失败模式 */
  setShouldFail(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    if (error) this.failError = error;
  }

  /** 设置延迟 */
  setDelay(delay: number): void {
    this.delay = delay;
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
    options?: import('@suga/ai-agent-loop').CallModelOptions
  ): AsyncGenerator<LLMStreamChunk> {
    this.callCount++;

    if (this.shouldFail) {
      throw this.failError;
    }

    const chunks = this.responses[this.callCount - 1];
    if (!chunks) {
      throw new Error(`MockLLMProvider: 第 ${this.callCount} 轮无预设响应`);
    }

    for (const chunk of chunks) {
      if (options?.signal?.aborted) {
        throw new DOMException('Mock LLM aborted', 'AbortError');
      }

      if (this.delay > 0) {
        await new Promise<void>(resolve => {
          setTimeout(resolve, this.delay);
        });
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
