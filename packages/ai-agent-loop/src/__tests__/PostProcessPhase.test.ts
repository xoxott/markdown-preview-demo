/** PostProcessPhase 测试 — 过渡判定 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { PostProcessPhase } from '../phase/PostProcessPhase';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState } from '../types/state';
import type { MutableAgentContext } from '../context/AgentContext';

/** 辅助：创建测试上下文 */
function createTestCtx(turnCount = 0): MutableAgentContext {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  const state: AgentState = {
    sessionId: 'test',
    turnCount,
    messages: [],
    toolUseContext: createAgentToolUseContext('test', turnCount, registry, abortController),
    transition: { type: 'next_turn' }
  };
  return createMutableAgentContext(state);
}

/** 辅助：消费所有事件 */
async function consumeAll(gen: AsyncGenerator<any>): Promise<any[]> {
  const events: any[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

/** 空的 next 函数 */
async function* emptyNext(): AsyncGenerator<any> {}

describe('PostProcessPhase', () => {
  it('无 tool_use 且无错误 → completed', async () => {
    const ctx = createTestCtx(0);
    // 不设置 needsToolExecution（默认 false）
    const phase = new PostProcessPhase(10);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.state.transition.type).toBe('completed');
  });

  it('有 tool_use 且 turnCount < maxTurns → next_turn', async () => {
    const ctx = createTestCtx(0);
    ctx.setNeedsToolExecution(true);
    ctx.pushToolUse({ id: 'c1', name: 'tool', input: {} });

    const phase = new PostProcessPhase(10);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.state.transition.type).toBe('next_turn');
  });

  it('有 tool_use 且 turnCount + 1 > maxTurns → max_turns', async () => {
    const ctx = createTestCtx(9); // turnCount=9, maxTurns=9, 9+1=10 > 9 超限
    ctx.setNeedsToolExecution(true);

    const phase = new PostProcessPhase(9);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.state.transition.type).toBe('max_turns');
  });

  it('有 AbortError → aborted', async () => {
    const ctx = createTestCtx(0);
    ctx.setError(new DOMException('abort', 'AbortError'));

    const phase = new PostProcessPhase(10);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.state.transition.type).toBe('aborted');
  });

  it('有普通错误 → model_error', async () => {
    const ctx = createTestCtx(0);
    ctx.setError(new Error('API error'));

    const phase = new PostProcessPhase(10);
    await consumeAll(phase.execute(ctx, emptyNext));

    expect(ctx.state.transition.type).toBe('model_error');
  });

  it('应产出 turn_end 事件', async () => {
    const ctx = createTestCtx(3);
    const phase = new PostProcessPhase(10);
    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(events.some(e => e.type === 'turn_end' && e.turnCount === 3)).toBe(true);
  });
});
