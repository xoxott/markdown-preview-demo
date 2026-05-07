/** G19: ForkCompactLayer 测试 */

import { describe, expect, it } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import { ForkCompactLayer } from '../core/ForkCompactLayer';
import type { CompressState } from '../types/compressor';
import { createContentReplacementTracker } from '../core/ContentReplacementState';

function createState(
  contextWindow: number = 100000,
  autoCompactFailures: number = 0
): CompressState {
  return {
    contentReplacement: createContentReplacementTracker(),
    autoCompactFailures,
    forkCompactFailures: 0,
    lastAssistantTimestamp: null,
    currentTime: Date.now(),
    estimatedTokens: 90000,
    contextWindow,
    config: { autoCompact: { thresholdRatio: 0.8, maxConsecutiveFailures: 3, messagesToKeep: 4 } }
  };
}

function makeMessages(count: number): AgentMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user_${i}_${Date.now()}`,
    role: 'user' as const,
    content: `Message ${i}: ${'x'.repeat(100)}`,
    timestamp: Date.now() - (count - i) * 60000
  }));
}

describe('ForkCompactLayer', () => {
  it('无 forkSpawner → 不压缩', async () => {
    const layer = new ForkCompactLayer(undefined, undefined);
    const messages = makeMessages(10);
    const state = createState();
    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(false);
    expect(result.messages.length).toBe(10);
  });

  it('未达阈值 → 不压缩', async () => {
    const spawner = async () => 'Summary text';
    const layer = new ForkCompactLayer({ thresholdRatio: 0.95 }, spawner);
    const messages = makeMessages(10);
    const state = createState(100000); // estimatedTokens=90000, threshold=95000 → 未达阈值
    // 但 estimatedTokens=90000 >= 95000? 不，90000 < 95000 → 不触发
    const lowTokenState: CompressState = { ...state, estimatedTokens: 80000 };
    const result = await layer.compress(messages, lowTokenState);
    expect(result.didCompress).toBe(false);
  });

  it('有 forkSpawner + 达阈值 → 压缩成功', async () => {
    const spawner = async () => 'Fork summary: key decisions preserved';
    const layer = new ForkCompactLayer({ thresholdRatio: 0.8, messagesToKeep: 3 }, spawner);
    const messages = makeMessages(10);
    const state = createState(); // estimatedTokens=90000, threshold=80000 → 达阈值
    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(true);
    // 结果: 3 toKeep + 1 summary = 4
    expect(result.messages.length).toBe(4);
    expect(result.stats?.forkCompactSummary).toBe(true);
    expect(result.stats?.forkCompactDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('fork 返回空 → 不压缩 + 递增熔断器', async () => {
    const spawner = async () => '';
    const layer = new ForkCompactLayer({ thresholdRatio: 0.8 }, spawner);
    const messages = makeMessages(10);
    const state = createState();
    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(false);
    expect(state.forkCompactFailures).toBe(1);
  });

  it('fork 抛错 → 不压缩 + 递增熔断器', async () => {
    const spawner = async () => {
      throw new Error('Fork failed');
    };
    const layer = new ForkCompactLayer({ thresholdRatio: 0.8 }, spawner);
    const messages = makeMessages(10);
    const state = createState();
    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(false);
    expect(state.forkCompactFailures).toBe(1);
  });

  it('熔断器达上限 → 不压缩', async () => {
    const spawner = async () => 'Summary';
    const layer = new ForkCompactLayer({ thresholdRatio: 0.8, maxFailures: 2 }, spawner);
    const messages = makeMessages(10);
    const state: CompressState = { ...createState(), forkCompactFailures: 2 };
    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(false);
  });

  it('fallbackToAutoCompact=true + fork失败 → 返回不压缩（让AutoCompact处理）', async () => {
    const spawner = async () => {
      throw new Error('Fork failed');
    };
    const layer = new ForkCompactLayer(
      { thresholdRatio: 0.8, fallbackToAutoCompact: true },
      spawner
    );
    const messages = makeMessages(10);
    const state = createState();
    const result = await layer.compress(messages, state);
    expect(result.didCompress).toBe(false);
    // 熔断器仍然递增
    expect(state.forkCompactFailures).toBe(1);
  });

  it('消息数 <= messagesToKeep → 不压缩', async () => {
    const spawner = async () => 'Summary';
    const layer = new ForkCompactLayer({ thresholdRatio: 0.8, messagesToKeep: 10 }, spawner);
    const messages = makeMessages(10);
    const state = createState();
    const result = await layer.compress(messages, state);
    // messages.length = 10, keepCount = min(10, 10) = 10
    // toCompact = messages.slice(0, 0) → 空 → 不压缩
    expect(result.didCompress).toBe(false);
  });
});
