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
