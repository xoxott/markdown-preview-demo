/** CheckInterruptPhase 测试 — AbortController 信号检测 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { CheckInterruptPhase } from '../phase/CheckInterruptPhase';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState } from '../types/state';
import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';

/** 辅助：创建测试上下文 */
function createTestCtx(abortController?: AbortController): MutableAgentContext {
  const registry = new ToolRegistry();
  const ac = abortController ?? new AbortController();
  const state: AgentState = {
    sessionId: 'test',
    turnCount: 0,
    messages: [],
    toolUseContext: createAgentToolUseContext('test', 0, registry, ac),
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

/** 会产出事件的 next 函数 */
async function* yieldingNext(): AsyncGenerator<AgentEvent> {
  yield { type: 'text_delta', delta: 'after-check' };
}

describe('CheckInterruptPhase', () => {
  it('signal 未中断 → 正常传递到 next', async () => {
    const ctx = createTestCtx();
    const phase = new CheckInterruptPhase();
    const events = await consumeAll(phase.execute(ctx, yieldingNext));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'text_delta', delta: 'after-check' });
  });

  it('signal 已中断 → 设置 AbortError 且不调用 next', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const ctx = createTestCtx(abortController);
    const phase = new CheckInterruptPhase();
    const events = await consumeAll(phase.execute(ctx, yieldingNext));

    expect(events).toHaveLength(0);
    expect(ctx.error).toBeDefined();
    expect((ctx.error as DOMException).name).toBe('AbortError');
  });
});
