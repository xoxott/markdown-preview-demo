/** StreamingCallModelPhase 测试 — P42 交错流式 Phase（合并 CallModel + ExecuteTools） */

import { describe, expect, it } from 'vitest';
import { ToolExecutor, ToolRegistry } from '@suga/ai-tool-core';
import { StreamingCallModelPhase } from '../phase/StreamingCallModelPhase';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState } from '../types/state';
import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import { createSystemPrompt } from '../types/provider';
import { MockLLMProvider } from './mocks/MockLLMProvider';
import { MockInterleavedScheduler } from './mocks/MockInterleavedScheduler';

/** 辅助：创建测试上下文 */
function createTestCtx(): MutableAgentContext {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  const state: AgentState = {
    sessionId: 'test',
    turnCount: 0,
    messages: [{ id: 'u1', role: 'user', content: 'hi', timestamp: Date.now() }],
    toolUseContext: createAgentToolUseContext('test', 0, registry, abortController),
    transition: { type: 'next_turn' }
  };
  return createMutableAgentContext(state);
}

/** 辅助：消费所有事件 */
async function consumeAll(gen: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

/** 空的 next 函数 */
async function* emptyNext(): AsyncGenerator<AgentEvent> {}

describe('StreamingCallModelPhase', () => {
  it('纯文本响应 → 累积文本 + 产出 text_delta 事件', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('abc');

    const scheduler = new MockInterleavedScheduler();
    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.accumulatedText).toBe('abc');
    expect(
      events.filter(e => e.type === 'text_delta').map(e => (e as { delta: string }).delta)
    ).toEqual(['a', 'b', 'c']);
  });

  it('应产出 turn_start 事件', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    const scheduler = new MockInterleavedScheduler();
    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(
      events.some(e => e.type === 'turn_start' && (e as { turnCount: number }).turnCount === 0)
    ).toBe(true);
  });

  it('tool_use → addTool调用 + tool_use_start + tool_result 交错yield', async () => {
    const provider = new MockLLMProvider();
    provider.addToolUseResponse('', [{ id: 'c1', name: 'calc', input: { a: 1 } }]);

    const scheduler = new MockInterleavedScheduler();
    scheduler.setPresetResult('c1', {
      id: 'r1',
      role: 'tool_result',
      toolUseId: 'c1',
      toolName: 'calc',
      result: 3,
      isSuccess: true,
      timestamp: Date.now()
    });

    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    // addTool 应被调用
    expect(scheduler.getAddToolCalls()).toHaveLength(1);
    expect(scheduler.getAddToolCalls()[0].name).toBe('calc');

    // tool_use_start 事件
    expect(events.some(e => e.type === 'tool_use_start')).toBe(true);

    // tool_result 事件
    expect(events.some(e => e.type === 'tool_result')).toBe(true);
    const toolResult = events.find(e => e.type === 'tool_result');
    if (toolResult && toolResult.type === 'tool_result') {
      expect(toolResult.result.isSuccess).toBe(true);
      expect(toolResult.result.toolUseId).toBe('c1');
    }

    // needsToolExecution 应为 true
    expect(ctx.needsToolExecution).toBe(true);
  });

  it('多个 tool_use → addTool逐个调用 + 结果按序收集', async () => {
    const provider = new MockLLMProvider();
    provider.addToolUseResponse('', [
      { id: 'c1', name: 'read', input: { file: 'a.txt' } },
      { id: 'c2', name: 'read', input: { file: 'b.txt' } }
    ]);

    const scheduler = new MockInterleavedScheduler();
    scheduler.setPresetResult('c1', {
      id: 'r1',
      role: 'tool_result',
      toolUseId: 'c1',
      toolName: 'read',
      result: 'content_a',
      isSuccess: true,
      timestamp: Date.now()
    });
    scheduler.setPresetResult('c2', {
      id: 'r2',
      role: 'tool_result',
      toolUseId: 'c2',
      toolName: 'read',
      result: 'content_b',
      isSuccess: true,
      timestamp: Date.now()
    });

    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    // addTool 应被调用两次
    expect(scheduler.getAddToolCalls()).toHaveLength(2);

    // 两个 tool_result 事件
    const toolResults = events.filter(e => e.type === 'tool_result');
    expect(toolResults).toHaveLength(2);
  });

  it('ctx.meta.toolResults 收集所有结果', async () => {
    const provider = new MockLLMProvider();
    provider.addToolUseResponse('', [{ id: 'c1', name: 'calc', input: {} }]);

    const scheduler = new MockInterleavedScheduler();
    scheduler.setPresetResult('c1', {
      id: 'r1',
      role: 'tool_result',
      toolUseId: 'c1',
      toolName: 'calc',
      result: 42,
      isSuccess: true,
      timestamp: Date.now()
    });

    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    await consumeAll(phase.execute(ctx, emptyNext));

    const toolResults = ctx.meta.toolResults as { isSuccess: boolean; toolUseId: string }[];
    expect(toolResults).toHaveLength(1);
    expect(toolResults[0].isSuccess).toBe(true);
    expect(toolResults[0].toolUseId).toBe('c1');
  });

  it('延迟完成的工具 → getCompletedResults不yield → getRemainingResults yield', async () => {
    const provider = new MockLLMProvider();
    provider.addToolUseResponse('', [{ id: 'c1', name: 'bash', input: { cmd: 'ls' } }]);

    const scheduler = new MockInterleavedScheduler();
    scheduler.setDelayedCompletion('c1');
    scheduler.setPresetResult('c1', {
      id: 'r1',
      role: 'tool_result',
      toolUseId: 'c1',
      toolName: 'bash',
      result: 'file1 file2',
      isSuccess: true,
      timestamp: Date.now()
    });

    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    // 工具最终应有结果
    expect(events.some(e => e.type === 'tool_result')).toBe(true);
    const toolResults = ctx.meta.toolResults as { isSuccess: boolean }[];
    expect(toolResults).toHaveLength(1);
  });

  it('thinking增量 → 累积思考 + 产出 thinking_delta', async () => {
    const provider = new MockLLMProvider();
    provider.addResponse([
      { thinkingDelta: '思考中...', done: false },
      { textDelta: '回答', done: false },
      { done: true }
    ]);

    const scheduler = new MockInterleavedScheduler();
    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.accumulatedThinking).toBe('思考中...');
    expect(events.some(e => e.type === 'thinking_delta')).toBe(true);
  });

  it('stopReason/usage → ctx.meta', async () => {
    const provider = new MockLLMProvider();
    provider.addResponse([
      { textDelta: 'hello', done: false },
      { stopReason: 'end_turn', usage: { inputTokens: 100, outputTokens: 50 }, done: true }
    ]);

    const scheduler = new MockInterleavedScheduler();
    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.meta.stopReason).toBe('end_turn');
    expect(ctx.meta.usage).toEqual({ inputTokens: 100, outputTokens: 50 });
    expect(ctx.meta.tokenBudgetUsed).toBe(50);
  });

  it("stopReason='max_tokens' → ctx.meta.maxOutputTokensReached=true", async () => {
    const provider = new MockLLMProvider();
    provider.addResponse([
      { textDelta: 'hello', done: false },
      { stopReason: 'max_tokens', done: true }
    ]);

    const scheduler = new MockInterleavedScheduler();
    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.meta.maxOutputTokensReached).toBe(true);
    expect(ctx.meta.stopReason).toBe('max_tokens');
  });

  it('unrecoverable error → setError短路', async () => {
    const provider = new MockLLMProvider();
    const error = Object.assign(new Error('auth failed'), { status: 401 });
    provider.setShouldFail(true, error);

    const scheduler = new MockInterleavedScheduler();
    const ctx = createTestCtx();
    let nextCalled = false;
    // eslint-disable-next-line require-yield
    async function* trackingNext(): AsyncGenerator<AgentEvent> {
      nextCalled = true;
    }

    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    await consumeAll(phase.execute(ctx, trackingNext));

    expect(ctx.error).toBeDefined();
    expect(nextCalled).toBe(false);
  });

  it('recoverable 413 → ctx.meta.apiError, 不设ctx.error', async () => {
    const provider = new MockLLMProvider();
    const error = Object.assign(new Error('prompt is too long'), { status: 413 });
    provider.setShouldFail(true, error);

    const scheduler = new MockInterleavedScheduler();
    const ctx = createTestCtx();
    // eslint-disable-next-line require-yield
    async function* trackingNext(): AsyncGenerator<AgentEvent> {}

    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    await consumeAll(phase.execute(ctx, trackingNext));

    expect(ctx.meta.apiError).toBeDefined();
    expect(ctx.error).toBeUndefined();
    const apiError = ctx.meta.apiError as { statusCode?: number };
    expect(apiError.statusCode).toBe(413);
  });

  it('systemPrompt → provider.callModel 接收到 options.systemPrompt', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    const scheduler = new MockInterleavedScheduler();
    const prompt = createSystemPrompt(['You are a helpful assistant.', 'Memory: remember X']);
    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000,
      undefined,
      prompt
    );
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(provider.getCallHistory()[0].systemPrompt).toBe(prompt);
  });
});

describe('StreamingCallModelPhase — 交错事件顺序', () => {
  it('text_delta和tool_use_start交错 → 事件按流顺序yield', async () => {
    const provider = new MockLLMProvider();
    provider.addResponse([
      { textDelta: 'hello', done: false },
      { toolUse: { id: 'c1', name: 'read', input: { file: 'a.txt' } }, done: false },
      { textDelta: ' world', done: false },
      { done: true }
    ]);

    const scheduler = new MockInterleavedScheduler();
    scheduler.setPresetResult('c1', {
      id: 'r1',
      role: 'tool_result',
      toolUseId: 'c1',
      toolName: 'read',
      result: 'content',
      isSuccess: true,
      timestamp: Date.now()
    });

    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    // 事件顺序: turn_start, text_delta, tool_use_start, tool_result(getCompletedResults), text_delta
    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain('turn_start');
    expect(eventTypes).toContain('text_delta');
    expect(eventTypes).toContain('tool_use_start');
    expect(eventTypes).toContain('tool_result');

    // 确认交错: tool_result 应出现在 tool_use_start 之后
    const toolUseStartIdx = eventTypes.indexOf('tool_use_start');
    const toolResultIdx = eventTypes.indexOf('tool_result');
    expect(toolResultIdx).toBeGreaterThan(toolUseStartIdx);
  });

  it('tool_use后立即有已完成结果 → 在getCompletedResults中yield', async () => {
    // 模拟: LLM流产出2个safe tool_use，第一个在流中即完成
    const provider = new MockLLMProvider();
    provider.addToolUseResponse('', [
      { id: 'c1', name: 'read', input: { file: 'a.txt' } },
      { id: 'c2', name: 'read', input: { file: 'b.txt' } }
    ]);

    const scheduler = new MockInterleavedScheduler();
    // c1 立即完成，c2 延迟（模拟仍在执行）
    scheduler.setPresetResult('c1', {
      id: 'r1',
      role: 'tool_result',
      toolUseId: 'c1',
      toolName: 'read',
      result: 'content_a',
      isSuccess: true,
      timestamp: Date.now()
    });
    scheduler.setDelayedCompletion('c2');
    scheduler.setPresetResult('c2', {
      id: 'r2',
      role: 'tool_result',
      toolUseId: 'c2',
      toolName: 'read',
      result: 'content_b',
      isSuccess: true,
      timestamp: Date.now()
    });

    const ctx = createTestCtx();
    const phase = new StreamingCallModelPhase(
      provider,
      scheduler,
      new ToolExecutor(),
      new ToolRegistry(),
      30000
    );
    await consumeAll(phase.execute(ctx, emptyNext));

    // 两个工具都应有结果
    const toolResults = ctx.meta.toolResults as { toolUseId: string }[];
    expect(toolResults).toHaveLength(2);
    expect(toolResults.map(r => r.toolUseId)).toEqual(['c1', 'c2']);
  });
});
