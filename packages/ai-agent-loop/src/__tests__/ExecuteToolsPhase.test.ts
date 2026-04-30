/** ExecuteToolsPhase 测试 — 工具调度与执行 */

import { describe, expect, it } from 'vitest';
import { ToolExecutor, ToolRegistry } from '@suga/ai-tool-core';
import { ExecuteToolsPhase } from '../phase/ExecuteToolsPhase';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState } from '../types/state';
import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import { MockToolScheduler } from './mocks/MockToolScheduler';

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

/** 空的 next 函数 */
async function* emptyNext(): AsyncGenerator<AgentEvent> {}

describe('ExecuteToolsPhase', () => {
  it('needsToolExecution=false → 跳过执行，直接传递到 next', async () => {
    const ctx = createTestCtx();
    // 默认 needsToolExecution = false

    const scheduler = new MockToolScheduler();
    const executor = new ToolExecutor();
    const registry = new ToolRegistry();
    const phase = new ExecuteToolsPhase(scheduler, executor, registry, 30000);

    const events = await consumeAll(phase.execute(ctx, emptyNext));
    expect(events).toEqual([]);
    expect(scheduler.getCallHistory()).toHaveLength(0);
  });

  it('needsToolExecution=true → 通过调度器执行并产出 tool_result', async () => {
    const ctx = createTestCtx();
    ctx.setNeedsToolExecution(true);
    ctx.pushToolUse({ id: 'c1', name: 'calc', input: { a: 1, b: 2 } });

    const scheduler = new MockToolScheduler();
    scheduler.setPresetResult('c1', {
      id: 'r1',
      role: 'tool_result',
      toolUseId: 'c1',
      toolName: 'calc',
      result: 3,
      isSuccess: true,
      timestamp: Date.now()
    });

    const executor = new ToolExecutor();
    const registry = new ToolRegistry();
    const phase = new ExecuteToolsPhase(scheduler, executor, registry, 30000);

    const events = await consumeAll(phase.execute(ctx, emptyNext));

    expect(events.some(e => e.type === 'tool_result')).toBe(true);
    const toolResultEvent = events.find(e => e.type === 'tool_result');
    if (toolResultEvent && toolResultEvent.type === 'tool_result') {
      expect(toolResultEvent.result.isSuccess).toBe(true);
      expect(toolResultEvent.result.toolUseId).toBe('c1');
    }
  });

  it('工具结果应存储在 ctx.meta.toolResults', async () => {
    const ctx = createTestCtx();
    ctx.setNeedsToolExecution(true);
    ctx.pushToolUse({ id: 'c1', name: 'calc', input: {} });

    const scheduler = new MockToolScheduler();
    scheduler.setPresetResult('c1', {
      id: 'r1',
      role: 'tool_result',
      toolUseId: 'c1',
      toolName: 'calc',
      result: 42,
      isSuccess: true,
      timestamp: Date.now()
    });

    const executor = new ToolExecutor();
    const registry = new ToolRegistry();
    const phase = new ExecuteToolsPhase(scheduler, executor, registry, 30000);

    await consumeAll(phase.execute(ctx, emptyNext));

    const toolResults = ctx.meta.toolResults as any[];
    expect(toolResults).toHaveLength(1);
    expect(toolResults[0].isSuccess).toBe(true);
  });

  it('多个 tool_use → 多个 tool_result 事件', async () => {
    const ctx = createTestCtx();
    ctx.setNeedsToolExecution(true);
    ctx.pushToolUse({ id: 'c1', name: 'tool1', input: {} });
    ctx.pushToolUse({ id: 'c2', name: 'tool2', input: {} });

    const scheduler = new MockToolScheduler();
    scheduler.setPresetResult('c1', {
      id: 'r1',
      role: 'tool_result',
      toolUseId: 'c1',
      toolName: 'tool1',
      result: 'a',
      isSuccess: true,
      timestamp: Date.now()
    });
    scheduler.setPresetResult('c2', {
      id: 'r2',
      role: 'tool_result',
      toolUseId: 'c2',
      toolName: 'tool2',
      result: 'b',
      isSuccess: true,
      timestamp: Date.now()
    });

    const executor = new ToolExecutor();
    const registry = new ToolRegistry();
    const phase = new ExecuteToolsPhase(scheduler, executor, registry, 30000);

    const events = await consumeAll(phase.execute(ctx, emptyNext));

    const toolResultEvents = events.filter(e => e.type === 'tool_result');
    expect(toolResultEvents).toHaveLength(2);
  });
});
