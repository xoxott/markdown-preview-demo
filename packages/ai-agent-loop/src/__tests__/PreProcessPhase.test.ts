/** PreProcessPhase 测试 — 预处理标记 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { PreProcessPhase } from '../phase/PreProcessPhase';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState } from '../types/state';
import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';

/** 辅助：创建测试上下文 */
function createTestCtx(): MutableAgentContext {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  const state: AgentState = {
    sessionId: 'test',
    turnCount: 0,
    messages: [],
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

/** 会产出事件的 next 函数 */
async function* yieldingNext(): AsyncGenerator<AgentEvent> {
  yield { type: 'text_delta', delta: 'after-preprocess' };
}

describe('PreProcessPhase', () => {
  it('应标记 ctx.meta.preProcessed = true', async () => {
    const ctx = createTestCtx();
    const phase = new PreProcessPhase();
    await consumeAll(phase.execute(ctx, yieldingNext));

    expect(ctx.meta.preProcessed).toBe(true);
  });

  it('应传递到 next 阶段', async () => {
    const ctx = createTestCtx();
    const phase = new PreProcessPhase();
    const events = await consumeAll(phase.execute(ctx, yieldingNext));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'text_delta', delta: 'after-preprocess' });
  });
});
