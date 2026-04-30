/** stateMachine 测试 — advanceState 状态推进 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { advanceState } from '../loop/stateMachine';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState } from '../types/state';

/** 辅助：创建初始 AgentState */
function createInitialState(): AgentState {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  return {
    sessionId: 'test-session',
    turnCount: 0,
    messages: [{ id: 'u1', role: 'user', content: 'hello', timestamp: Date.now() }],
    toolUseContext: createAgentToolUseContext('test-session', 0, registry, abortController),
    transition: { type: 'next_turn' }
  };
}

describe('advanceState', () => {
  it('应构造 AssistantMessage 并追加到消息列表', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);
    ctx.appendText('你好');
    ctx.pushToolUse({ id: 'c1', name: 'calc', input: { a: 1 } });

    const newState = advanceState(state, ctx);

    // 消息列表应包含原始用户消息 + 新的助手消息
    expect(newState.messages).toHaveLength(2);
    const assistantMsg = newState.messages[1];
    expect(assistantMsg.role).toBe('assistant');
    if (assistantMsg.role === 'assistant') {
      expect(assistantMsg.content).toBe('你好');
    }
  });

  it('有工具调用时 AssistantMessage 应包含 toolUses', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);
    ctx.appendText('计算中');
    ctx.pushToolUse({ id: 'c1', name: 'calc', input: { a: 1 } });
    ctx.pushToolUse({ id: 'c2', name: 'read', input: { path: '/test' } });

    const newState = advanceState(state, ctx);

    const assistantMsg = newState.messages[1];
    if (assistantMsg.role === 'assistant') {
      expect(assistantMsg.toolUses).toHaveLength(2);
      expect(assistantMsg.toolUses[0].name).toBe('calc');
    }
  });

  it('有工具结果时应追加 ToolResultMessage', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);
    ctx.appendText('');
    ctx.pushToolUse({ id: 'c1', name: 'calc', input: {} });
    ctx.setNeedsToolExecution(true);

    const toolResult = {
      id: 'r1',
      role: 'tool_result' as const,
      toolUseId: 'c1',
      toolName: 'calc',
      result: 42,
      isSuccess: true,
      timestamp: Date.now()
    };
    ctx.meta.toolResults = [toolResult];

    const newState = advanceState(state, ctx);

    // 消息列表: 用户消息 + 助手消息 + 工具结果消息
    expect(newState.messages).toHaveLength(3);
    expect(newState.messages[2].role).toBe('tool_result');
  });

  it('turnCount 应递增', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);

    const newState = advanceState(state, ctx);

    expect(newState.turnCount).toBe(1);
  });

  it('transition 应默认为 next_turn', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);

    const newState = advanceState(state, ctx);

    expect(newState.transition.type).toBe('next_turn');
  });

  it('toolUseContext.turnCount 应与 state.turnCount 同步', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);

    const newState = advanceState(state, ctx);

    expect(newState.toolUseContext.turnCount).toBe(newState.turnCount);
  });

  it('sessionId 应保持不变', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);

    const newState = advanceState(state, ctx);

    expect(newState.sessionId).toBe(state.sessionId);
  });
});
