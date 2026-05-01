/** Prompt Cache 断裂检测测试 */

import { describe, expect, it } from 'vitest';
import type { LLMUsageInfo } from '../types/usage';
import { calculateCacheHitRate, detectCacheBreak } from '../retry/cache-break-detection';
import type { CacheBreakThreshold } from '../retry/cache-break-detection';

describe('calculateCacheHitRate', () => {
  it('有缓存读取 → 正常命中率', () => {
    const usage: LLMUsageInfo = {
      inputTokens: 300,
      outputTokens: 100,
      cacheCreationInputTokens: 100,
      cacheReadInputTokens: 600
    };
    // cacheHitRate = 600 / (600 + 100 + 300) = 600 / 1000 = 0.6
    expect(calculateCacheHitRate(usage)).toBeCloseTo(0.6);
  });

  it('无缓存 → 命中率 0', () => {
    const usage: LLMUsageInfo = { inputTokens: 1000, outputTokens: 100 };
    expect(calculateCacheHitRate(usage)).toBe(0);
  });

  it('全部缓存命中 → 命中率 ~1', () => {
    const usage: LLMUsageInfo = {
      inputTokens: 0,
      outputTokens: 100,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 1000
    };
    // 1000 / (1000 + 0 + 0) = 1.0
    expect(calculateCacheHitRate(usage)).toBeCloseTo(1.0);
  });

  it('全为 0 → 命中率 0', () => {
    const usage: LLMUsageInfo = { inputTokens: 0, outputTokens: 0 };
    expect(calculateCacheHitRate(usage)).toBe(0);
  });
});

describe('detectCacheBreak', () => {
  it('输入 token 过低 → 不检测', () => {
    const current: LLMUsageInfo = { inputTokens: 50, outputTokens: 10 };
    const previous: LLMUsageInfo = {
      inputTokens: 50,
      outputTokens: 10,
      cacheReadInputTokens: 1000
    };
    const result = detectCacheBreak(current, previous);
    expect(result.isCacheBreak).toBe(false);
  });

  it('无前一次用量 → 无法比较', () => {
    const current: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheReadInputTokens: 700
    };
    const result = detectCacheBreak(current);
    expect(result.isCacheBreak).toBe(false);
    expect(result.cacheHitRate).toBeDefined();
  });

  it('缓存创建突增 → cache_creation_spike', () => {
    const previous: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheCreationInputTokens: 100
    };
    const current: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheCreationInputTokens: 300
    };
    // 突增 200% > 50% 阈值
    const result = detectCacheBreak(current, previous);
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('cache_creation_spike');
    expect(result.recommendedAction).toBe('retry_with_same_prefix');
  });

  it('缓存读取突降 → cache_read_drop', () => {
    const previous: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheReadInputTokens: 800
    };
    const current: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheReadInputTokens: 200
    };
    // 读取从 800 降到 200，降幅 75% > 50%
    const result = detectCacheBreak(current, previous);
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('cache_read_drop');
    expect(result.recommendedAction).toBe('reduce_context');
  });

  it('从有缓存到完全无缓存 → input_prefix_changed', () => {
    const previous: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheReadInputTokens: 800
    };
    const current: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheCreationInputTokens: 1000
    };
    // cacheRead 从 800 → 0, cacheCreation 从 0 → 1000
    const result = detectCacheBreak(current, previous);
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('input_prefix_changed');
    expect(result.recommendedAction).toBe('accept_and_continue');
  });

  it('稳定缓存 → 无断裂', () => {
    const previous: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheReadInputTokens: 700,
      cacheCreationInputTokens: 100
    };
    const current: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 100,
      cacheReadInputTokens: 650,
      cacheCreationInputTokens: 120
    };
    // 小幅波动，未超过阈值
    const result = detectCacheBreak(current, previous);
    expect(result.isCacheBreak).toBe(false);
  });

  it('自定义阈值 → 更敏感', () => {
    const threshold: CacheBreakThreshold = { cacheCreationSpikeRatio: 0.1, minInputTokens: 10 };
    const previous: LLMUsageInfo = {
      inputTokens: 100,
      outputTokens: 10,
      cacheCreationInputTokens: 100
    };
    const current: LLMUsageInfo = {
      inputTokens: 100,
      outputTokens: 10,
      cacheCreationInputTokens: 120
    };
    // 20% 增加 > 10% 阈值
    const result = detectCacheBreak(current, previous, threshold);
    expect(result.isCacheBreak).toBe(true);
  });

  it('自定义阈值 → 更宽松', () => {
    const threshold: CacheBreakThreshold = { cacheCreationSpikeRatio: 1.0, minInputTokens: 10 };
    const previous: LLMUsageInfo = {
      inputTokens: 100,
      outputTokens: 10,
      cacheCreationInputTokens: 100
    };
    const current: LLMUsageInfo = {
      inputTokens: 100,
      outputTokens: 10,
      cacheCreationInputTokens: 180
    };
    // 80% 增加 < 100% 阈值
    const result = detectCacheBreak(current, previous, threshold);
    expect(result.isCacheBreak).toBe(false);
  });
});
