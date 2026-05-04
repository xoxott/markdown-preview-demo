/** stateMachine 测试 — advanceState 状态推进 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { advanceState } from '../loop/stateMachine';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState, ContinueTransition, HookBlockingError } from '../types/state';
import type { AgentMessage } from '../types/messages';

/** 辅助：获取 AgentMessage 的文本内容（ToolResultMessage 无 content） */
function getContent(msg: AgentMessage): string {
  if (msg.role === 'user') return typeof msg.content === 'string' ? msg.content : '';
  if (msg.role === 'assistant') return msg.content;
  return '';
}

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

  // === 溢出恢复路径测试 ===

  describe('reactive_compact_retry', () => {
    it('应使用压缩后的消息替换原始历史', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('本轮因 413 被丢弃');

      const compressedMessages: AgentMessage[] = [
        { id: 'c1', role: 'user', content: '压缩后的消息', timestamp: Date.now() }
      ];
      const transition: ContinueTransition = {
        type: 'reactive_compact_retry',
        compressedMessages
      };

      const newState = advanceState(state, ctx, transition);

      // 应直接使用 compressedMessages，不包含本轮 assistant
      expect(newState.messages).toHaveLength(1);
      expect(newState.messages[0].id).toBe('c1');
      expect(getContent(newState.messages[0])).toBe('压缩后的消息');
    });

    it('turnCount 应递增', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      const transition: ContinueTransition = {
        type: 'reactive_compact_retry',
        compressedMessages: [{ id: 'c1', role: 'user', content: 'x', timestamp: Date.now() }]
      };

      const newState = advanceState(state, ctx, transition);

      expect(newState.turnCount).toBe(1);
    });

    it('transition 应重置为 next_turn', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      const transition: ContinueTransition = {
        type: 'reactive_compact_retry',
        compressedMessages: [{ id: 'c1', role: 'user', content: 'x', timestamp: Date.now() }]
      };

      const newState = advanceState(state, ctx, transition);

      expect(newState.transition.type).toBe('next_turn');
    });
  });

  describe('max_output_tokens_escalate', () => {
    it('应保留本轮 assistant 消息（部分有效）+ tool results', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('截断的部分输出');
      ctx.pushToolUse({ id: 'c1', name: 'calc', input: {} });

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

      const transition: ContinueTransition = {
        type: 'max_output_tokens_escalate',
        escalatedLimit: 16384
      };

      const newState = advanceState(state, ctx, transition);

      // 应包含: 基础消息 + 本轮 assistant + tool results
      expect(newState.messages).toHaveLength(3);
      expect(newState.messages[1].role).toBe('assistant');
      expect(newState.messages[2].role).toBe('tool_result');
    });

    it('应忽略 transition.escalatedLimit（仅影响下一轮 API 参数）', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('部分输出');

      const transition: ContinueTransition = {
        type: 'max_output_tokens_escalate',
        escalatedLimit: 65536
      };

      const newState = advanceState(state, ctx, transition);

      // advanceState 不存储 escalatedLimit 到新状态，仅传递给下一轮 provider
      expect(newState.transition.type).toBe('next_turn');
    });
  });

  describe('max_output_tokens_recovery', () => {
    it('应在消息末尾追加 recovery meta message', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('部分输出');

      const recoveryMessage: AgentMessage = {
        id: 'recovery_1',
        role: 'user',
        content: '[Recovery: 输出 token 达到上限，请继续之前的输出]',
        timestamp: Date.now()
      };
      const transition: ContinueTransition = {
        type: 'max_output_tokens_recovery',
        recoveryMessage
      };

      const newState = advanceState(state, ctx, transition);

      // 应包含: 基础消息 + 本轮 assistant + recovery message
      expect(newState.messages).toHaveLength(3);
      expect(newState.messages[2].id).toBe('recovery_1');
      expect(getContent(newState.messages[2])).toContain('Recovery');
    });

    it('recoveryMessage 应作为 user 角色注入', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('');

      const recoveryMessage: AgentMessage = {
        id: 'recovery_2',
        role: 'user',
        content: '[Recovery]',
        timestamp: Date.now()
      };
      const transition: ContinueTransition = {
        type: 'max_output_tokens_recovery',
        recoveryMessage
      };

      const newState = advanceState(state, ctx, transition);

      const lastMsg = newState.messages[newState.messages.length - 1];
      expect(lastMsg.role).toBe('user');
    });
  });

  describe('compressedMessages meta 优先级', () => {
    it('ctx.meta.compressedMessages 应优先于 prevState.messages', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('新内容');

      // 注入压缩后的消息到 meta
      ctx.meta.compressedMessages = [
        { id: 'comp1', role: 'user', content: '压缩历史', timestamp: Date.now() }
      ];

      const newState = advanceState(state, ctx);

      // 应使用 compressedMessages 而非原始 state.messages
      expect(newState.messages[0].id).toBe('comp1');
      expect(getContent(newState.messages[0])).toBe('压缩历史');
    });

    it('无 compressedMessages 时应使用 prevState.messages', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('新内容');

      const newState = advanceState(state, ctx);

      // 应使用原始 state.messages
      expect(newState.messages[0]).toEqual(state.messages[0]);
    });
  });

  // === P11 扩展：3 种新 ContinueTransition ===

  describe('collapse_drain_retry', () => {
    it('应使用折叠后的消息替换原始历史', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('溢出中被丢弃');

      const foldedMessages: AgentMessage[] = [
        { id: 'f1', role: 'user', content: '折叠后消息', timestamp: Date.now() }
      ];
      const transition: ContinueTransition = {
        type: 'collapse_drain_retry',
        foldedMessages,
        boundaryUuid: 'uuid-boundary-1'
      };

      const newState = advanceState(state, ctx, transition);

      // 应直接使用 foldedMessages，不包含本轮 assistant
      expect(newState.messages).toHaveLength(1);
      expect(newState.messages[0].id).toBe('f1');
      expect(getContent(newState.messages[0])).toBe('折叠后消息');
    });

    it('transition 应重置为 next_turn', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      const transition: ContinueTransition = {
        type: 'collapse_drain_retry',
        foldedMessages: [{ id: 'f1', role: 'user', content: 'x', timestamp: Date.now() }],
        boundaryUuid: 'uuid-boundary-2'
      };

      const newState = advanceState(state, ctx, transition);

      expect(newState.transition.type).toBe('next_turn');
    });
  });

  describe('stop_hook_blocking', () => {
    it('应追加 blocking error 到消息列表', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('部分输出');

      const blockingErrors: HookBlockingError[] = [
        { hookName: 'lint-check', message: '代码格式不合规' },
        { hookName: 'security-scan', message: '潜在安全问题', exitCode: 1 }
      ];
      const transition: ContinueTransition = {
        type: 'stop_hook_blocking',
        blockingErrors
      };

      const newState = advanceState(state, ctx, transition);

      // 应包含: 基础消息 + 本轮 assistant + 2 个 blocking error 消息
      expect(newState.messages).toHaveLength(4);
      expect(newState.messages[1].role).toBe('assistant');
      // blocking errors 应作为 user 角色追加
      expect(newState.messages[2].role).toBe('user');
      expect(getContent(newState.messages[2])).toContain('lint-check');
      expect(getContent(newState.messages[3])).toContain('security-scan');
    });

    it('无 blockingErrors 时应仅保留基础 + assistant', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('输出');

      const transition: ContinueTransition = {
        type: 'stop_hook_blocking',
        blockingErrors: []
      };

      const newState = advanceState(state, ctx, transition);

      // 基础消息 + assistant
      expect(newState.messages).toHaveLength(2);
      expect(newState.messages[1].role).toBe('assistant');
    });
  });

  describe('token_budget_continuation', () => {
    it('应在消息末尾追加 nudge 消息', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('部分输出');

      const nudgeMessage: AgentMessage = {
        id: 'nudge_1',
        role: 'user',
        content: 'Stopped at 45% (4500/10000). Keep working — do not summarize.',
        timestamp: Date.now(),
        isMeta: true
      };
      const transition: ContinueTransition = {
        type: 'token_budget_continuation',
        nudgeMessage,
        budgetUsage: 0.45
      };

      const newState = advanceState(state, ctx, transition);

      // 应包含: 基础消息 + assistant + nudge
      expect(newState.messages).toHaveLength(3);
      expect(newState.messages[2].id).toBe('nudge_1');
      expect(getContent(newState.messages[2])).toContain('Keep working');
    });

    it('nudge 消息应作为 user 角色注入', () => {
      const state = createInitialState();
      const ctx = createMutableAgentContext(state);
      ctx.appendText('');

      const nudgeMessage: AgentMessage = {
        id: 'nudge_2',
        role: 'user',
        content: 'Stopped at 30%. Keep working.',
        timestamp: Date.now(),
        isMeta: true
      };
      const transition: ContinueTransition = {
        type: 'token_budget_continuation',
        nudgeMessage,
        budgetUsage: 0.3
      };

      const newState = advanceState(state, ctx, transition);

      const lastMsg = newState.messages[newState.messages.length - 1];
      expect(lastMsg.role).toBe('user');
    });
  });
});
