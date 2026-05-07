/** G13 结构化输出强制测试 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { PostProcessPhase, registerStructuredOutputEnforcement } from '../phase/PostProcessPhase';
import { createMutableAgentContext } from '../context/AgentContext';
import { createAgentToolUseContext } from '../context/ToolUseContext';
import type { AgentState, StructuredOutputEnforcementConfig } from '../types/state';
import type { MutableAgentContext } from '../context/AgentContext';

/** 辅助：消费 AsyncGenerator */
async function consume(gen: AsyncGenerator<any>): Promise<void> {
  for await (const _ of gen) {
    /* 消费所有事件 */
  }
}

/** 辅助：创建测试上下文 */
function createTestCtx(turnCount = 0, meta?: Record<string, unknown>): MutableAgentContext {
  const registry = new ToolRegistry();
  const abortController = new AbortController();
  const state: AgentState = {
    sessionId: 'test',
    turnCount,
    messages: [],
    toolUseContext: createAgentToolUseContext('test', turnCount, registry, abortController),
    transition: { type: 'next_turn' }
  };
  const ctx = createMutableAgentContext(state, abortController.signal);
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      ctx.meta[k] = v;
    }
  }
  return ctx;
}

async function* emptyNext(): AsyncGenerator<any> {}

describe('registerStructuredOutputEnforcement', () => {
  beforeEach(() => {
    registerStructuredOutputEnforcement();
  });

  it('重置后 → 新会话重试计数清零', async () => {
    const config: StructuredOutputEnforcementConfig = { enabled: true, maxRetries: 3 };
    const phase = new PostProcessPhase(10, config);

    // 第一次触发
    const ctx1 = createTestCtx(0, { stopReason: 'end_turn' });
    await consume(phase.execute(ctx1, emptyNext));
    expect(ctx1.state.transition.type).toBe('structured_output_retry');

    // 重置后再触发
    registerStructuredOutputEnforcement();
    const ctx2 = createTestCtx(0, { stopReason: 'end_turn' });
    await consume(phase.execute(ctx2, emptyNext));
    if (ctx2.state.transition.type === 'structured_output_retry') {
      expect(ctx2.state.transition.retryCount).toBe(1);
    }
  });
});

describe('PostProcessPhase G13 结构化输出强制', () => {
  beforeEach(() => {
    registerStructuredOutputEnforcement();
  });

  it('未启用 → 无 tool_use → completed', async () => {
    const phase = new PostProcessPhase(10);
    const ctx = createTestCtx(0, { stopReason: 'end_turn' });
    await consume(phase.execute(ctx, emptyNext));
    expect(ctx.state.transition.type).toBe('completed');
  });

  it('启用 + stopReason=end_turn + 无tool_use → structured_output_retry', async () => {
    const config: StructuredOutputEnforcementConfig = { enabled: true, maxRetries: 3 };
    const phase = new PostProcessPhase(10, config);
    const ctx = createTestCtx(0, { stopReason: 'end_turn' });
    await consume(phase.execute(ctx, emptyNext));
    expect(ctx.state.transition.type).toBe('structured_output_retry');
    if (ctx.state.transition.type === 'structured_output_retry') {
      expect(ctx.state.transition.retryCount).toBe(1);
      expect(ctx.state.transition.nudgeMessage.role).toBe('user');
    }
  });

  it('启用 + 有 tool_use → next_turn', async () => {
    const config: StructuredOutputEnforcementConfig = { enabled: true, maxRetries: 3 };
    const phase = new PostProcessPhase(10, config);
    const ctx = createTestCtx(0, { stopReason: 'end_turn' });
    ctx.setNeedsToolExecution(true);
    ctx.pushToolUse({ id: 'c1', name: 'bash', input: { command: 'ls' } });
    await consume(phase.execute(ctx, emptyNext));
    expect(ctx.state.transition.type).toBe('next_turn');
  });

  it('启用 + stopReason=max_tokens → completed', async () => {
    const config: StructuredOutputEnforcementConfig = { enabled: true, maxRetries: 3 };
    const phase = new PostProcessPhase(10, config);
    const ctx = createTestCtx(0, { stopReason: 'max_tokens' });
    await consume(phase.execute(ctx, emptyNext));
    expect(ctx.state.transition.type).toBe('completed');
  });

  it('超过 maxRetries → completed', async () => {
    const config: StructuredOutputEnforcementConfig = { enabled: true, maxRetries: 2 };
    const phase = new PostProcessPhase(10, config);

    // 手动触发3次让计数器超过maxRetries=2
    const ctx1 = createTestCtx(0, { stopReason: 'end_turn' });
    await consume(phase.execute(ctx1, emptyNext));
    expect(ctx1.state.transition.type).toBe('structured_output_retry');

    const ctx2 = createTestCtx(0, { stopReason: 'end_turn' });
    await consume(phase.execute(ctx2, emptyNext));
    expect(ctx2.state.transition.type).toBe('structured_output_retry');

    // 第3次 → 达到maxRetries=2，不再重试
    const ctx3 = createTestCtx(0, { stopReason: 'end_turn' });
    await consume(phase.execute(ctx3, emptyNext));
    expect(ctx3.state.transition.type).toBe('completed');
  });

  it('expectedTools → nudge包含工具名', async () => {
    const config: StructuredOutputEnforcementConfig = {
      enabled: true,
      maxRetries: 3,
      expectedTools: ['bash', 'file-edit']
    };
    const phase = new PostProcessPhase(10, config);
    const ctx = createTestCtx(0, { stopReason: 'end_turn' });
    await consume(phase.execute(ctx, emptyNext));
    if (ctx.state.transition.type === 'structured_output_retry') {
      const { nudgeMessage } = ctx.state.transition;
      const text =
        nudgeMessage.role === 'user'
          ? typeof nudgeMessage.content === 'string'
            ? nudgeMessage.content
            : ''
          : nudgeMessage.role === 'assistant'
            ? nudgeMessage.content
            : '';
      expect(text).toContain('bash, file-edit');
    }
  });
});
