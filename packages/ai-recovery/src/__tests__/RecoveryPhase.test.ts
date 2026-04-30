/** RecoveryPhase 测试 — P1 Phase 链溢出检测与恢复集成 */

import { describe, expect, it, vi } from 'vitest';
import type { AgentMessage, AgentState } from '@suga/ai-agent-loop';
import type { CompressResult } from '@suga/ai-context';
import { RecoveryPhase } from '../integration/RecoveryPhase';
import { ReactiveCompactRecovery } from '../core/ReactiveCompactRecovery';
import { MaxOutputTokensRecovery } from '../core/MaxOutputTokensRecovery';
import { TokenBudgetTracker } from '../core/TokenBudgetTracker';
import { ContextCollapseStrategy } from '../core/ContextCollapseStrategy';
import { ToolRegistry } from '@suga/ai-tool-core';

/** 辅助：检查消息是否为 meta */
function isMetaMsg(msg: AgentMessage): boolean {
  if (msg.role === 'user') return msg.isMeta === true;
  return false;
}

/** 辅助：创建 mock CompressPipeline */
function createMockPipeline(reactiveCompactResult: CompressResult) {
  return {
    reactiveCompact: vi.fn().mockResolvedValue(reactiveCompactResult)
  } as unknown as import('@suga/ai-context').CompressPipeline;
}

/** 辅助：创建 mock MutableAgentContext */
function createMockCtx(metaOverrides?: Record<string, unknown>) {
  const registry = new ToolRegistry();
  const state: AgentState = {
    sessionId: 'test-session',
    turnCount: 0,
    messages: [{ id: 'u1', role: 'user', content: 'hello', timestamp: Date.now() }],
    toolUseContext: {
      sessionId: 'test-session',
      agentId: undefined as unknown as string,
      turnCount: 0,
      abortController: new AbortController(),
      tools: registry
    },
    transition: { type: 'next_turn' }
  };

  return {
    state,
    meta: { ...metaOverrides },
    accumulatedText: '',
    accumulatedThinking: '',
    toolUses: [],
    needsToolExecution: false,
    error: undefined,
    appendText: vi.fn(),
    appendThinking: vi.fn(),
    pushToolUse: vi.fn(),
    setNeedsToolExecution: vi.fn(),
    setError: vi.fn()
  } as unknown as import('@suga/ai-agent-loop').MutableAgentContext;
}

/** 辅助：创建空 next generator */
async function* emptyNext(): AsyncGenerator<import('@suga/ai-agent-loop').AgentEvent> {
  // 空的 next 链
}

describe('RecoveryPhase', () => {
  describe('API 413 恢复', () => {
    it('ctx.meta.apiError 存在时应触发 reactive_compact', async () => {
      const compressedMessages: AgentMessage[] = [
        { id: 'u1', role: 'user', content: '压缩后', timestamp: Date.now() }
      ];
      const pipeline = createMockPipeline({
        messages: compressedMessages,
        didCompress: true
      });
      const phase = new RecoveryPhase(pipeline);

      const ctx = createMockCtx({
        apiError: { statusCode: 413, message: 'prompt-too-long' }
      });

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      expect(ctx.state.transition.type).toBe('reactive_compact_retry');
      if (ctx.state.transition.type === 'reactive_compact_retry') {
        expect(ctx.state.transition.compressedMessages).toHaveLength(1);
      }
      expect(ctx.meta.recoveryStrategy).toBe('reactive_compact');
      expect(ctx.meta.recovered).toBe(true);
      // 应产出 turn_end 事件
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'turn_end', turnCount: 0 });
    });

    it('API 413 但压缩失败时不应设置 recovery transition', async () => {
      const pipeline = createMockPipeline({
        messages: [],
        didCompress: false
      });
      const phase = new RecoveryPhase(pipeline);

      const ctx = createMockCtx({
        apiError: { statusCode: 413, message: 'prompt-too-long' }
      });

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      // 压缩失败 → transition 保持 next_turn（由 PostProcessPhase 处理错误）
      expect(ctx.state.transition.type).toBe('next_turn');
      expect(ctx.meta.recovered).not.toBe(true);
    });
  });

  describe('max_output_tokens 恢复', () => {
    it('ctx.meta.maxOutputTokensReached 时应触发 escalation', async () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const phase = new RecoveryPhase(pipeline);

      const ctx = createMockCtx({
        maxOutputTokensReached: true
      });

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      expect(ctx.state.transition.type).toBe('max_output_tokens_escalate');
      if (ctx.state.transition.type === 'max_output_tokens_escalate') {
        expect(ctx.state.transition.escalatedLimit).toBe(8192);
      }
      expect(ctx.meta.recoveryStrategy).toBe('max_output_tokens_escalate');
      expect(ctx.meta.currentEscalatedLimit).toBe(8192);
    });

    it('多次 maxOutputTokensReached 应逐步 escalation', async () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const phase = new RecoveryPhase(pipeline);

      // 第一次
      const ctx1 = createMockCtx({ maxOutputTokensReached: true });
      for await (const _ of phase.execute(ctx1, emptyNext)) {
        /* consume */
      }
      if (ctx1.state.transition.type === 'max_output_tokens_escalate') {
        expect(ctx1.state.transition.escalatedLimit).toBe(8192);
      }

      // 第二次
      const ctx2 = createMockCtx({ maxOutputTokensReached: true });
      for await (const _ of phase.execute(ctx2, emptyNext)) {
        /* consume */
      }
      if (ctx2.state.transition.type === 'max_output_tokens_escalate') {
        expect(ctx2.state.transition.escalatedLimit).toBe(16384);
      }
    });
  });

  describe('无溢出错误', () => {
    it('无 apiError 且无 maxOutputTokensReached 时不应修改 transition', async () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const phase = new RecoveryPhase(pipeline);

      const ctx = createMockCtx(); // 无溢出标记

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      // transition 保持 next_turn（未修改）
      expect(ctx.state.transition.type).toBe('next_turn');
      expect(ctx.meta.recoveryStrategy).toBeUndefined();
    });
  });

  describe('collapse_drain_retry 检测', () => {
    it('ctx.meta.needsContextCollapse=true 时应触发 collapse_drain_retry', async () => {
      const foldedMessages: AgentMessage[] = [
        { id: 'f1', role: 'user', content: '折叠后消息', timestamp: Date.now() }
      ];
      const pipeline = createMockPipeline({ messages: foldedMessages, didCompress: true });
      const phase = new RecoveryPhase(pipeline);

      const ctx = createMockCtx({ needsContextCollapse: true });

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      expect(ctx.state.transition.type).toBe('collapse_drain_retry');
      if (ctx.state.transition.type === 'collapse_drain_retry') {
        expect(ctx.state.transition.foldedMessages).toHaveLength(1);
        expect(ctx.state.transition.boundaryUuid).toMatch(/^collapse_/);
      }
      expect(ctx.meta.recoveryStrategy).toBe('collapse_drain_retry');
      expect(ctx.meta.recovered).toBe(true);
    });
  });

  describe('token_budget_continuation 检测', () => {
    it('ctx.meta.tokenBudget + tokenBudgetUsed 且应续写时应触发 token_budget_continuation', async () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const phase = new RecoveryPhase(pipeline);

      // 4500/10000 = 45% < 90% → 应续写
      const ctx = createMockCtx({
        tokenBudget: 10000,
        tokenBudgetUsed: 4500
      });

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      expect(ctx.state.transition.type).toBe('token_budget_continuation');
      if (ctx.state.transition.type === 'token_budget_continuation') {
        expect(ctx.state.transition.budgetUsage).toBe(0.45);
        expect(isMetaMsg(ctx.state.transition.nudgeMessage)).toBe(true);
      }
      expect(ctx.meta.recoveryStrategy).toBe('token_budget_continuation');
      expect(ctx.meta.recovered).toBe(true);
    });

    it('tokenBudgetUsed 超过阈值时不应触发续写', async () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const phase = new RecoveryPhase(pipeline);

      // 9500/10000 = 95% > 90% → 不应续写
      const ctx = createMockCtx({
        tokenBudget: 10000,
        tokenBudgetUsed: 9500
      });

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      // transition 保持 next_turn（不续写）
      expect(ctx.state.transition.type).toBe('next_turn');
    });
  });

  describe('getter 方法', () => {
    it('getReactiveCompactRecovery 应返回 ReactiveCompactRecovery 实例', () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const phase = new RecoveryPhase(pipeline);

      const recovery = phase.getReactiveCompactRecovery();
      expect(recovery).toBeInstanceOf(ReactiveCompactRecovery);
    });

    it('getMaxOutputTokensRecovery 应返回内部实例', () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const phase = new RecoveryPhase(pipeline);

      const recovery = phase.getMaxOutputTokensRecovery();
      expect(recovery).toBeInstanceOf(MaxOutputTokensRecovery);
    });

    it('getTokenBudgetTracker 应返回 TokenBudgetTracker 实例', () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const phase = new RecoveryPhase(pipeline);

      const tracker = phase.getTokenBudgetTracker();
      expect(tracker).toBeInstanceOf(TokenBudgetTracker);
    });

    it('getContextCollapseStrategy 应返回 ContextCollapseStrategy 实例', () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const phase = new RecoveryPhase(pipeline);

      const strategy = phase.getContextCollapseStrategy();
      expect(strategy).toBeInstanceOf(ContextCollapseStrategy);
    });
  });
});
