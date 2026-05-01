/** HookStopPhase 测试 — stop_hook_blocking Continue 路径 */

import { describe, expect, it, vi } from 'vitest';
import type { AgentEvent, AgentState, MutableAgentContext } from '@suga/ai-agent-loop';
import { ToolRegistry } from '@suga/ai-tool-core';
import { HookStopPhase } from '../phase/HookStopPhase';
import { HookRegistry } from '../registry/HookRegistry';

/** 辅助：创建 mock MutableAgentContext */
function createMockCtx(transitionType: string, metaOverrides?: Record<string, unknown>) {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  const state: AgentState = {
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
    transition: { type: transitionType, reason: '' } as AgentState['transition']
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
  } as unknown as MutableAgentContext;
}

/** 辅助：注册 Stop hook */
function registerStopHook(
  registry: HookRegistry,
  outcome: 'success' | 'blocking' | 'non_blocking_error',
  preventContinuation: boolean,
  error?: string
) {
  registry.register({
    name: 'test-stop-hook',
    event: 'Stop',
    handler: vi.fn().mockResolvedValue({
      outcome,
      preventContinuation,
      error,
      stopReason: outcome === 'blocking' ? '安全检查失败' : undefined
    })
  });
}

/** 辅助：创建空 next generator */
async function* emptyNext(): AsyncGenerator<AgentEvent> {
  // 空的 next 链
}

describe('HookStopPhase', () => {
  describe('stop_hook_blocking', () => {
    it('errors + preventContinuation=false 应设置 stop_hook_blocking transition', async () => {
      const registry = new HookRegistry();
      // non_blocking_error 产生 error 但 preventContinuation=false
      registerStopHook(registry, 'non_blocking_error', false, '代码格式不合规');

      const phase = new HookStopPhase(registry);
      const ctx = createMockCtx('completed');

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      // 应设置 stop_hook_blocking transition
      expect(ctx.state.transition.type).toBe('stop_hook_blocking');
      if (ctx.state.transition.type === 'stop_hook_blocking') {
        expect(ctx.state.transition.blockingErrors).toHaveLength(1);
        expect(ctx.state.transition.blockingErrors[0].hookName).toBe('Stop');
      }
      expect(ctx.meta.recoveryStrategy).toBe('stop_hook_blocking');
      expect(ctx.meta.recovered).toBe(true);
      expect(ctx.meta.hasAttemptedReactiveCompact).toBe(true);
    });

    it('blocking + preventContinuation=true 应保持 terminal transition', async () => {
      const registry = new HookRegistry();
      registerStopHook(registry, 'blocking', true, '安全风险');

      const phase = new HookStopPhase(registry);
      const ctx = createMockCtx('completed');

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      // preventContinuation=true → 不设置 stop_hook_blocking，保持 terminal + meta 标记
      expect(ctx.state.transition.type).toBe('completed');
      expect(ctx.meta.hookStopPreventContinuation).toBe(true);
    });

    it('outcome=success 无 errors 不应修改 transition', async () => {
      const registry = new HookRegistry();
      registerStopHook(registry, 'success', false);

      const phase = new HookStopPhase(registry);
      const ctx = createMockCtx('completed');

      const events: unknown[] = [];
      for await (const event of phase.execute(ctx, emptyNext)) {
        events.push(event);
      }

      // success → 不修改 transition
      expect(ctx.state.transition.type).toBe('completed');
      expect(ctx.meta.recoveryStrategy).toBeUndefined();
    });
  });
});
