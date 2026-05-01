/** 螺旋防护测试 — 防止同一恢复策略重复触发形成死循环 */

import { describe, expect, it } from 'vitest';
import type { AgentEvent, AgentMessage, MutableAgentContext } from '@suga/ai-agent-loop';
import type { CompressPipeline, CompressResult } from '@suga/ai-context';
import { createMutableAgentContext } from '@suga/ai-agent-loop';
import { RecoveryPhase } from '../integration/RecoveryPhase';

const createMockPipeline = (): CompressPipeline => {
  const mockResult: CompressResult = {
    messages: [
      {
        id: 'summary',
        role: 'assistant',
        content: 'compressed summary',
        toolUses: [],
        timestamp: Date.now()
      }
    ],
    didCompress: true
  };

  return {
    reactiveCompact: async () => mockResult,
    compress: async () => ({ messages: [], didCompress: false, stats: [] }),
    getState: () => ({
      contentReplacement: {
        seenIds: new Set(),
        replacements: new Map(),
        frozen: false,
        markSeen: () => {},
        recordReplacement: () => {},
        classify: () => 'fresh',
        freeze: () => {}
      },
      autoCompactFailures: 0,
      lastAssistantTimestamp: null,
      currentTime: Date.now(),
      estimatedTokens: 0,
      contextWindow: 200_000,
      config: {}
    }),
    updateState: () => {}
  } as unknown as CompressPipeline;
};

const createMockCtx = (meta?: Record<string, unknown>): MutableAgentContext => {
  const messages: AgentMessage[] = [
    { id: 'u1', role: 'user' as const, content: 'hello', timestamp: Date.now() },
    {
      id: 'a1',
      role: 'assistant' as const,
      content: 'response',
      toolUses: [],
      timestamp: Date.now()
    }
  ];
  const state = {
    sessionId: 'test',
    turnCount: 0,
    messages,
    toolUseContext: {
      abortController: new AbortController(),
      tools: { getAll: () => [], getByName: () => undefined, get: () => undefined } as never,
      sessionId: 'test',
      agentId: 'test',
      turnCount: 0
    },
    transition: { type: 'next_turn' as const }
  };

  const ctx = createMutableAgentContext(state);
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      ctx.meta[key] = value;
    }
  }
  return ctx;
};

const emptyNext = async function* (): AsyncGenerator<AgentEvent> {};

describe('螺旋防护', () => {
  it('首次 413 触发 reactive_compact_retry（正常）', async () => {
    const pipeline = createMockPipeline();
    const phase = new RecoveryPhase(pipeline);
    const ctx = createMockCtx({ apiError: { statusCode: 413, message: 'PTL' } });

    const events: AgentEvent[] = [];
    for await (const event of phase.execute(ctx, emptyNext)) {
      events.push(event);
    }

    expect(ctx.meta.recoveryStrategy).toBe('reactive_compact');
    expect(ctx.meta.recovered).toBe(true);
    expect(ctx.meta.hasAttemptedReactiveCompact).toBe(true);
  });

  it('第二次 413（已尝试过 reactive compact）直接终止', async () => {
    const pipeline = createMockPipeline();
    const phase = new RecoveryPhase(pipeline);

    // 第一次：正常 reactive compact
    const ctx1 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL' } });
    for await (const _ of phase.execute(ctx1, emptyNext)) {
    }

    // 第二次：螺旋防护 → 终止
    const ctx2 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL again' } });
    const events: AgentEvent[] = [];
    for await (const event of phase.execute(ctx2, emptyNext)) {
      events.push(event);
    }

    expect(ctx2.meta.recoveryStrategy).toBe('spiral_terminated');
    expect(ctx2.meta.recovered).toBe(false);
    expect(ctx2.state.transition.type).toBe('model_error');
  });

  it('reactive compact 成功后下一轮无 413 时重置标记', async () => {
    const pipeline = createMockPipeline();
    const phase = new RecoveryPhase(pipeline);

    // 第一次：413 → reactive compact 成功
    const ctx1 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL' } });
    for await (const _ of phase.execute(ctx1, emptyNext)) {
    }
    expect(ctx1.meta.hasAttemptedReactiveCompact).toBe(true);

    // 第二次：无 apiError → 重置标记
    const ctx2 = createMockCtx(); // 无溢出
    for await (const _ of phase.execute(ctx2, emptyNext)) {
    }

    // 第三次：如果再次 413 → 应正常触发 reactive compact（标记已重置）
    const ctx3 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL new' } });
    for await (const _ of phase.execute(ctx3, emptyNext)) {
    }

    expect(ctx3.meta.recoveryStrategy).toBe('reactive_compact');
    expect(ctx3.meta.recovered).toBe(true);
  });

  it('无 apiError 时 hasAttemptedReactiveCompact 不影响正常流程', async () => {
    const pipeline = createMockPipeline();
    const phase = new RecoveryPhase(pipeline);

    const ctx = createMockCtx(); // 无溢出
    for await (const _ of phase.execute(ctx, emptyNext)) {
    }

    expect(ctx.state.transition.type).toBe('next_turn');
  });

  it('SpiralGuardConfig.enabled=false 时不执行螺旋防护', async () => {
    const pipeline = createMockPipeline();
    const phase = new RecoveryPhase(pipeline, { spiralGuard: { enabled: false } });

    // 第一次：413 → reactive compact
    const ctx1 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL' } });
    for await (const _ of phase.execute(ctx1, emptyNext)) {
    }

    // 第二次：413 → 仍然触发 reactive compact（不防护）
    const ctx2 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL again' } });
    for await (const _ of phase.execute(ctx2, emptyNext)) {
    }

    expect(ctx2.meta.recoveryStrategy).toBe('reactive_compact');
    expect(ctx2.meta.recovered).toBe(true);
  });

  // 新增：per-strategy maxAttempts 测试
  it('per-strategy maxAttempts 允许同策略多次尝试', async () => {
    const pipeline = createMockPipeline();
    const phase = new RecoveryPhase(pipeline, {
      spiralGuard: { maxAttemptsPerStrategy: { reactive_compact: 2 } }
    });

    // 第一次：413 → 正常 reactive compact
    const ctx1 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL' } });
    for await (const _ of phase.execute(ctx1, emptyNext)) {
    }
    expect(ctx1.meta.recoveryStrategy).toBe('reactive_compact');

    // 第二次：413 → 仍允许（maxAttempts=2）
    const ctx2 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL again' } });
    for await (const _ of phase.execute(ctx2, emptyNext)) {
    }
    expect(ctx2.meta.recoveryStrategy).toBe('reactive_compact');

    // 第三次：超过 maxAttempts=2 → spiral terminated
    const ctx3 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL 3rd' } });
    for await (const _ of phase.execute(ctx3, emptyNext)) {
    }
    expect(ctx3.meta.recoveryStrategy).toBe('spiral_terminated');
  });

  it('跨策略螺旋防护不互相影响', async () => {
    const pipeline = createMockPipeline();
    const phase = new RecoveryPhase(pipeline);

    // reactive_compact 策略触发
    const ctx1 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL' } });
    for await (const _ of phase.execute(ctx1, emptyNext)) {
    }
    expect(ctx1.meta.recoveryStrategy).toBe('reactive_compact');

    // 无溢出 → 重置计数
    const ctx2 = createMockCtx();
    for await (const _ of phase.execute(ctx2, emptyNext)) {
    }

    // max_output_tokens 策略触发（不受 reactive_compact 影响）
    const ctx3 = createMockCtx({ maxOutputTokensReached: true });
    for await (const _ of phase.execute(ctx3, emptyNext)) {
    }
    expect(ctx3.meta.recoveryStrategy).toBe('max_output_tokens_escalate');
  });

  it('所有策略计数在无溢出时全部重置', async () => {
    const pipeline = createMockPipeline();
    const phase = new RecoveryPhase(pipeline);

    // 触发两种策略
    const ctx1 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL' } });
    for await (const _ of phase.execute(ctx1, emptyNext)) {
    }

    // 无溢出 → 重置
    const ctx2 = createMockCtx();
    for await (const _ of phase.execute(ctx2, emptyNext)) {
    }

    // 之前触发过的策略现在可重新触发
    const ctx3 = createMockCtx({ apiError: { statusCode: 413, message: 'PTL again' } });
    for await (const _ of phase.execute(ctx3, emptyNext)) {
    }
    expect(ctx3.meta.recoveryStrategy).toBe('reactive_compact');
    expect(ctx3.meta.recovered).toBe(true);
  });
});
