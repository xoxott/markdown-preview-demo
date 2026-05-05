/** P88 测试 — AgentLoop 硬性循环上限 + abort 信号传播 */

import { describe, expect, it } from 'vitest';
import { AgentLoop } from '../loop/AgentLoop';
import type { AgentEvent } from '../types/events';
import type { LoopResult } from '../types/result';
import type { UserMessage } from '../types/messages';
import { MAX_LOOP_ITERATIONS } from '../constants';
import { MockLLMProvider } from './mocks/MockLLMProvider';

/** 辅助：创建用户消息 */
function createUserMessage(content: string): UserMessage {
  return { id: 'user_1', role: 'user', content, timestamp: Date.now() };
}

/** 辅助：消费所有事件 */
async function consumeAllEvents(generator: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

/** 辅助：获取 loop_end 结果 */
function getLoopEnd(events: AgentEvent[]): LoopResult | undefined {
  const loopEndEvent = events.find(e => e.type === 'loop_end');
  if (loopEndEvent && loopEndEvent.type === 'loop_end') {
    return loopEndEvent.result;
  }
  return undefined;
}

// ============================================================
// P88: 硬性循环上限测试
// ============================================================

describe('AgentLoop — P88 硬性循环上限', () => {
  it('正常循环不会触发硬上限', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');
    const loop = new AgentLoop({ provider, maxTurns: 5 });
    const events = await consumeAllEvents(loop.queryLoop([createUserMessage('hi')]));
    const result = getLoopEnd(events);
    expect(result?.type).toBe('completed');
  });

  it('MAX_LOOP_ITERATIONS 常量 = 200', () => {
    expect(MAX_LOOP_ITERATIONS).toBe(200);
  });

  it('maxTurns 超限 → max_turns 终止（不超过硬上限）', async () => {
    const provider = new MockLLMProvider();
    // 模拟每轮都返回 tool_use，让循环继续
    for (let i = 0; i < 5; i++) {
      provider.addToolUseResponse('thinking', [{ id: `tu_${i}`, name: `tool_${i}`, input: {} }]);
    }
    // 最后一轮返回纯文本终止
    provider.addSimpleTextResponse('done');

    const loop = new AgentLoop({ provider, maxTurns: 3 });
    const events = await consumeAllEvents(loop.queryLoop([createUserMessage('test')]));
    const result = getLoopEnd(events);
    expect(result?.type).toBe('max_turns');
  });
});

// ============================================================
// P88: Abort 信号传播测试
// ============================================================

describe('AgentLoop — P88 abort 信号传播', () => {
  it('外部 abort → loop_end aborted', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');
    provider.setDelay(100); // 添加延迟以确保 abort 在循环过程中发生

    const loop = new AgentLoop({ provider });
    const abortController = new AbortController();

    // 在循环开始后立即 abort
    const generator = loop.queryLoop([createUserMessage('hi')], abortController.signal);
    const eventsPromise = consumeAllEvents(generator);

    // 立即中断
    abortController.abort();

    const events = await eventsPromise;
    const result = getLoopEnd(events);
    expect(result?.type).toBe('aborted');
  });

  it('abort 在第一轮之前 → 立即 aborted', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    const loop = new AgentLoop({ provider });
    const abortController = new AbortController();
    abortController.abort(); // 先中断

    const events = await consumeAllEvents(
      loop.queryLoop([createUserMessage('hi')], abortController.signal)
    );
    const result = getLoopEnd(events);
    expect(result?.type).toBe('aborted');
  });

  it('ctx.signal 在 Phase 层可访问', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('hello');

    // 创建一个自定义 Phase 来验证 ctx.signal
    let signalSeen: AbortSignal | undefined;
    const signalCheckPhase = {
      async *execute(
        ctx: import('../context/AgentContext').MutableAgentContext,
        next: () => AsyncGenerator<AgentEvent>
      ) {
        signalSeen = ctx.signal;
        yield* next();
      }
    };

    const loop = new AgentLoop({ provider, phases: [signalCheckPhase] });
    const abortController = new AbortController();

    await consumeAllEvents(loop.queryLoop([createUserMessage('hi')], abortController.signal));

    expect(signalSeen).toBeDefined();
    // ctx.signal 是内部级联的 abortController.signal，与外部 signal 的 abort 状态同步
    expect(signalSeen?.aborted).toBe(abortController.signal.aborted);
  });
});
