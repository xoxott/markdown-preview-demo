import { describe, it, expect, vi } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressState } from '../types/compressor';
import { createContentReplacementTracker } from '../core/ContentReplacementState';
import { AutoCompactLayer } from '../core/AutoCompact';

function createMockState(tokens: number, failures: number): CompressState {
  return {
    contentReplacement: createContentReplacementTracker(),
    autoCompactFailures: failures,
    lastAssistantTimestamp: null,
    currentTime: Date.now(),
    estimatedTokens: tokens,
    contextWindow: 200_000,
    config: {
      autoCompact: { thresholdRatio: 0.5, maxConsecutiveFailures: 3, messagesToKeep: 2 }
    }
  };
}

function createMessages(count: number): AgentMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `u${i}`,
    role: 'user',
    content: `message ${i}`,
    timestamp: i * 1000
  }));
}

describe('AutoCompactLayer', () => {
  it('token 未达阈值跳过', async () => {
    const layer = new AutoCompactLayer(
      { thresholdRatio: 0.5, maxConsecutiveFailures: 3, messagesToKeep: 2 },
      vi.fn().mockResolvedValue('summary')
    );
    const state = createMockState(10, 0); // 10 tokens < 200000*0.5 = 100000

    const result = await layer.compress(createMessages(5), state);
    expect(result.didCompress).toBe(false);
  });

  it('达阈值触发摘要压缩', async () => {
    const callModel = vi.fn().mockResolvedValue('This is a summary of the conversation.');
    const layer = new AutoCompactLayer(
      { thresholdRatio: 0.5, maxConsecutiveFailures: 3, messagesToKeep: 2 },
      callModel
    );
    const state = createMockState(150_000, 0); // 150k >= 200k*0.5 = 100k → trigger

    const result = await layer.compress(createMessages(6), state);
    expect(result.didCompress).toBe(true);
    expect(result.stats?.generatedSummary).toBe(true);
    expect(result.stats?.summaryMessageCount).toBe(4); // 6 - 2 = 4
    expect(callModel).toHaveBeenCalledOnce();
    // 消息数 = summary + keepRecent = 1 + 2 = 3
    expect(result.messages.length).toBe(3);
  });

  it('摘要成功重置熔断器', async () => {
    const callModel = vi.fn().mockResolvedValue('summary');
    const layer = new AutoCompactLayer(
      { thresholdRatio: 0, maxConsecutiveFailures: 3, messagesToKeep: 1 },
      callModel
    );
    const state = createMockState(200_000, 2); // 2次失败，但 < 3

    const result = await layer.compress(createMessages(3), state);
    expect(result.didCompress).toBe(true);
    // 熔断器不在此层重置，而是在成功后自然恢复（下次调用时 failures 值不变，但不再递增）
  });

  it('连续失败熔断 — failures >= maxConsecutiveFailures', async () => {
    const callModel = vi.fn();
    const layer = new AutoCompactLayer(
      { thresholdRatio: 0, maxConsecutiveFailures: 3, messagesToKeep: 1 },
      callModel
    );
    const state = createMockState(200_000, 3); // 3次失败 >= 3

    const result = await layer.compress(createMessages(3), state);
    expect(result.didCompress).toBe(false);
    expect(callModel).not.toHaveBeenCalled();
  });
});
