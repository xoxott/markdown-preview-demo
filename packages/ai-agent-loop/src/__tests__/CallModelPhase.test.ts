/** CallModelPhase 测试 — LLM 流式调用 + tool_use 检测 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { CallModelPhase } from '../phase/CallModelPhase';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState } from '../types/state';
import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import { MockLLMProvider } from './mocks/MockLLMProvider';

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

describe('CallModelPhase', () => {
  it('纯文本响应 → 累积文本 + 产出 text_delta 事件', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('abc');

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.accumulatedText).toBe('abc');
    expect(events.filter(e => e.type === 'text_delta').map(e => (e as any).delta)).toEqual([
      'a',
      'b',
      'c'
    ]);
  });

  it('有 tool_use → 设置 needsToolExecution=true + 产出 tool_use_start', async () => {
    const provider = new MockLLMProvider();
    provider.addToolUseResponse('', [{ id: 'c1', name: 'calc', input: { a: 1 } }]);

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.needsToolExecution).toBe(true);
    expect(ctx.toolUses).toHaveLength(1);
    expect(events.some(e => e.type === 'tool_use_start')).toBe(true);
  });

  it('应产出 turn_start 事件', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(events.some(e => e.type === 'turn_start' && (e as any).turnCount === 0)).toBe(true);
  });

  it('thinking 増量 → 累积思考 + 产出 thinking_delta', async () => {
    const provider = new MockLLMProvider();
    provider.addResponse([
      { thinkingDelta: '思考中...', done: false },
      { textDelta: '回答', done: false },
      { done: true }
    ]);

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.accumulatedThinking).toBe('思考中...');
    expect(events.some(e => e.type === 'thinking_delta')).toBe(true);
  });

  it('LLM 抛出普通错误 → 设置 ctx.error', async () => {
    const provider = new MockLLMProvider();
    provider.setShouldFail(true, new Error('API error'));

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.error).toBeDefined();
    expect((ctx.error as Error).message).toBe('API error');
    // 错误时不调用 next，不应产出任何 next 事件
    expect(events.some(e => e.type === 'text_delta')).toBe(false);
  });

  it('LLM 抛出 AbortError → 设置 ctx.error 为 AbortError', async () => {
    const provider = new MockLLMProvider();
    provider.setShouldFail(true, new DOMException('abort', 'AbortError'));

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.error).toBeDefined();
    expect((ctx.error as DOMException).name).toBe('AbortError');
  });
});

describe('CallModelPhase P33增强', () => {
  it("stopReason='max_tokens' → ctx.meta.maxOutputTokensReached=true", async () => {
    const provider = new MockLLMProvider();
    provider.addResponse([
      { textDelta: 'hello', done: false },
      { stopReason: 'max_tokens', done: true }
    ]);

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.meta.maxOutputTokensReached).toBe(true);
    expect(ctx.meta.stopReason).toBe('max_tokens');
  });

  it("stopReason='end_turn' → ctx.meta.stopReason='end_turn'（非max_tokens不设标记）", async () => {
    const provider = new MockLLMProvider();
    provider.addResponse([
      { textDelta: 'hello', done: false },
      { stopReason: 'end_turn', done: true }
    ]);

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.meta.stopReason).toBe('end_turn');
    expect(ctx.meta.maxOutputTokensReached).toBeUndefined();
  });

  it('usage chunk → ctx.meta.usage + tokenBudgetUsed', async () => {
    const provider = new MockLLMProvider();
    provider.addResponse([
      { textDelta: 'hello', done: false },
      { usage: { inputTokens: 100, outputTokens: 50 }, done: true }
    ]);

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.meta.usage).toEqual({ inputTokens: 100, outputTokens: 50 });
    expect(ctx.meta.tokenBudgetUsed).toBe(50);
  });

  it('recoverable 413 → ctx.meta.apiError, 不设ctx.error', async () => {
    const provider = new MockLLMProvider();
    const error = Object.assign(new Error('prompt is too long'), { status: 413 });
    provider.setShouldFail(true, error);

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    await consumeAll(phase.execute(ctx, emptyNext));

    // 可恢复错误：apiError在meta，error不在ctx
    expect(ctx.meta.apiError).toBeDefined();
    expect(ctx.error).toBeUndefined();
    const apiError = ctx.meta.apiError as { statusCode?: number };
    expect(apiError.statusCode).toBe(413);
  });

  it('recoverable overloaded(529) → ctx.meta.apiError', async () => {
    const provider = new MockLLMProvider();
    const error = Object.assign(new Error('Overloaded'), { status: 529 });
    provider.setShouldFail(true, error);

    const ctx = createTestCtx();
    const phase = new CallModelPhase(provider);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.meta.apiError).toBeDefined();
    expect(ctx.error).toBeUndefined();
    const apiError = ctx.meta.apiError as { statusCode?: number };
    expect(apiError.statusCode).toBe(529);
  });

  it('recoverable error → yield* next()被调用', async () => {
    const provider = new MockLLMProvider();
    const error = Object.assign(new Error('prompt is too long'), { status: 413 });
    provider.setShouldFail(true, error);

    const ctx = createTestCtx();
    let nextCalled = false;
    // eslint-disable-next-line require-yield
    async function* trackingNext(): AsyncGenerator<AgentEvent> {
      nextCalled = true;
    }

    const phase = new CallModelPhase(provider);
    await consumeAll(phase.execute(ctx, trackingNext));

    expect(nextCalled).toBe(true);
  });

  it('unrecoverable 401 → ctx.setError + 短路', async () => {
    const provider = new MockLLMProvider();
    const error = Object.assign(new Error('auth failed'), { status: 401 });
    provider.setShouldFail(true, error);

    const ctx = createTestCtx();
    let nextCalled = false;
    // eslint-disable-next-line require-yield
    async function* trackingNext(): AsyncGenerator<AgentEvent> {
      nextCalled = true;
    }

    const phase = new CallModelPhase(provider);
    await consumeAll(phase.execute(ctx, trackingNext));

    expect(ctx.error).toBeDefined();
    expect(nextCalled).toBe(false); // 不可恢复 → 短路，next未调用
  });
});
