/** 集成测试 — RecoveryPhase 与 advanceState 联动 */

import { describe, expect, it } from 'vitest';
import type { AgentMessage, AgentState, ContinueTransition } from '@suga/ai-agent-loop';
import { advanceState, createMutableAgentContext } from '@suga/ai-agent-loop';
import { ToolRegistry } from '@suga/ai-tool-core';

/** 辅助：创建初始 AgentState */
function createInitialState(): AgentState {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  return {
    sessionId: 'test-session',
    turnCount: 0,
    messages: [{ id: 'u1', role: 'user', content: 'hello', timestamp: Date.now() }],
    toolUseContext: {
      sessionId: 'test-session',
      agentId: undefined as unknown as string,
      turnCount: 0,
      abortController,
      tools: registry
    },
    transition: { type: 'next_turn' }
  };
}

describe('RecoveryPhase + advanceState 集成', () => {
  it('reactive_compact_retry → advanceState 应使用压缩后的消息', () => {
    const compressedMessages: AgentMessage[] = [
      { id: 'c1', role: 'user', content: '压缩后消息', timestamp: Date.now() }
    ];

    const state = createInitialState();
    const ctx = createMutableAgentContext(state);

    const transition: ContinueTransition = {
      type: 'reactive_compact_retry',
      compressedMessages
    };

    const newState = advanceState(state, ctx, transition);
    expect(newState.messages).toHaveLength(1);
    expect(newState.messages[0].id).toBe('c1');
    expect(newState.turnCount).toBe(1);
  });

  it('max_output_tokens_escalate → advanceState 应保留本轮产出', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);
    ctx.appendText('截断的部分输出');

    const transition: ContinueTransition = {
      type: 'max_output_tokens_escalate',
      escalatedLimit: 16384
    };

    const newState = advanceState(state, ctx, transition);
    expect(newState.messages).toHaveLength(2);
    expect(newState.messages[1].role).toBe('assistant');
  });

  it('max_output_tokens_recovery → advanceState 应追加 recovery meta message', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);
    ctx.appendText('部分输出');

    const transition: ContinueTransition = {
      type: 'max_output_tokens_recovery',
      recoveryMessage: {
        id: 'recovery_1',
        role: 'user',
        content: '[Recovery: 输出 token 达到上限]',
        timestamp: Date.now()
      }
    };

    const newState = advanceState(state, ctx, transition);
    expect(newState.messages).toHaveLength(3);
    expect(newState.messages[2].role).toBe('user');
    expect(newState.messages[2].id).toBe('recovery_1');
  });

  it('advanceState 后 transition 应重置为 next_turn', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);

    const transition: ContinueTransition = {
      type: 'max_output_tokens_escalate',
      escalatedLimit: 16384
    };

    const newState = advanceState(state, ctx, transition);
    expect(newState.transition.type).toBe('next_turn');
  });

  it('collapse_drain_retry → advanceState 应使用折叠后的消息', () => {
    const foldedMessages: AgentMessage[] = [
      { id: 'f1', role: 'user', content: '折叠后消息', timestamp: Date.now() }
    ];

    const state = createInitialState();
    const ctx = createMutableAgentContext(state);

    const transition: ContinueTransition = {
      type: 'collapse_drain_retry',
      foldedMessages,
      boundaryUuid: 'uuid-1'
    };

    const newState = advanceState(state, ctx, transition);
    expect(newState.messages).toHaveLength(1);
    expect(newState.messages[0].id).toBe('f1');
    expect(newState.turnCount).toBe(1);
  });

  it('token_budget_continuation → advanceState 应追加 nudge 消息', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);
    ctx.appendText('部分输出');

    const nudgeMessage: AgentMessage = {
      id: 'nudge_1',
      role: 'user',
      content: 'Stopped at 45%. Keep working — do not summarize.',
      timestamp: Date.now(),
      isMeta: true
    };
    const transition: ContinueTransition = {
      type: 'token_budget_continuation',
      nudgeMessage,
      budgetUsage: 0.45
    };

    const newState = advanceState(state, ctx, transition);
    expect(newState.messages).toHaveLength(3);
    expect(newState.messages[2].id).toBe('nudge_1');
    expect(newState.messages[2].role).toBe('user');
  });

  it('stop_hook_blocking → advanceState 应追加 blocking error 消息', () => {
    const state = createInitialState();
    const ctx = createMutableAgentContext(state);
    ctx.appendText('部分输出');

    const transition: ContinueTransition = {
      type: 'stop_hook_blocking',
      blockingErrors: [
        { hookName: 'lint', message: '格式错误' },
        { hookName: 'sec', message: '安全风险', exitCode: 1 }
      ]
    };

    const newState = advanceState(state, ctx, transition);
    expect(newState.messages).toHaveLength(4);
    expect(newState.messages[2].role).toBe('user');
    expect(newState.messages[3].role).toBe('user');
  });
});
