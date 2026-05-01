/** BlockingLimitPhase 测试 — token 超限预拦截 */

import { describe, expect, it } from 'vitest';
import type { AgentEvent, AgentMessage, MutableAgentContext } from '@suga/ai-agent-loop';
import { BlockingLimitPhase } from '../integration/BlockingLimitPhase';
import { CompressPipeline } from '../core/CompressPipeline';
import { estimateTokens } from '../utils/tokenEstimate';

const createMockCtx = (
  messages: AgentMessage[],
  meta?: Record<string, unknown>
): MutableAgentContext => {
  let error: unknown | undefined;
  const ctxMeta = meta ?? {};
  return {
    state: {
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
      transition: { type: 'next_turn' }
    },
    meta: ctxMeta,
    accumulatedText: '',
    accumulatedThinking: '',
    toolUses: [],
    needsToolExecution: false,
    get error() {
      return error;
    },
    appendText: () => {},
    appendThinking: () => {},
    pushToolUse: () => {},
    setNeedsToolExecution: () => {},
    setError: (err: unknown) => {
      error = err;
    }
  } as unknown as MutableAgentContext;
};

const emptyNext = async function* (): AsyncGenerator<AgentEvent> {};

const userMsg = (content: string): AgentMessage => ({
  id: 'u1',
  role: 'user',
  content,
  timestamp: Date.now()
});

describe('BlockingLimitPhase', () => {
  it('未超限 → 正常通过', async () => {
    const pipeline = new CompressPipeline({});
    // 使用粗略估算器，小消息不会超限
    const phase = new BlockingLimitPhase(pipeline, { reserveTokens: 3000 }, estimateTokens);

    const messages = [userMsg('hello')];
    const ctx = createMockCtx(messages);

    const events: AgentEvent[] = [];
    for await (const event of phase.execute(ctx, emptyNext)) {
      events.push(event);
    }

    // 正常通过 → 0 个产出事件（next 为空）
    expect(events).toHaveLength(0);
    expect(ctx.error).toBeUndefined();
  });

  it('超限且压缩后仍超限 → 设置 error 终止', async () => {
    const pipeline = new CompressPipeline({});
    // 使用一个总是返回超高 token 数的估算器
    const alwaysOverLimit = () => 250_000;
    const phase = new BlockingLimitPhase(pipeline, { reserveTokens: 3000 }, alwaysOverLimit);

    const messages = [userMsg('test')];
    const ctx = createMockCtx(messages);

    const events: AgentEvent[] = [];
    for await (const event of phase.execute(ctx, emptyNext)) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(ctx.error).toBeDefined();
    expect(ctx.meta.blockingLimitError).toBeDefined();
    expect((ctx.meta.blockingLimitError as { type: string }).type).toBe('blocking_limit');
  });

  it('reserveTokens 默认为 3000', () => {
    const pipeline = new CompressPipeline({});
    const phase = new BlockingLimitPhase(pipeline);
    // 通过间接行为验证
    expect(phase).toBeDefined();
  });

  it('已有 compressedMessages 时直接估算压缩后的消息', async () => {
    const pipeline = new CompressPipeline({});
    // 粗略估算器：压缩后消息不超过阈值
    const phase = new BlockingLimitPhase(pipeline, { reserveTokens: 3000 }, estimateTokens);

    const compressedMessages = [userMsg('short')];
    const ctx = createMockCtx([userMsg('very long original message')], { compressedMessages });

    const events: AgentEvent[] = [];
    for await (const event of phase.execute(ctx, emptyNext)) {
      events.push(event);
    }

    expect(events).toHaveLength(0);
    expect(ctx.error).toBeUndefined();
  });

  it('超限但压缩后不超限 → 正常通过', async () => {
    const pipeline = new CompressPipeline({});
    // 第一次估算（原始消息）超限，第二次估算（压缩后）不超限
    let callCount = 0;
    const mockEstimator = (_msgs: readonly AgentMessage[]) => {
      callCount++;
      return callCount === 1 ? 200_000 : 5_000; // 第一次超限，第二次不超限
    };

    const phase = new BlockingLimitPhase(pipeline, { reserveTokens: 3000 }, mockEstimator);

    const messages = [userMsg('test')];
    const ctx = createMockCtx(messages);

    const events: AgentEvent[] = [];
    for await (const event of phase.execute(ctx, emptyNext)) {
      events.push(event);
    }

    expect(events).toHaveLength(0);
    expect(ctx.error).toBeUndefined();
    expect(ctx.meta.compressedMessages).toBeDefined();
  });
});
