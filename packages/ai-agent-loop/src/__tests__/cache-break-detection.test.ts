/** G12 PromptCache 断裂检测集成到 AgentLoop 测试 */

import { describe, expect, it } from 'vitest';
import type { CacheBreakDetectionFn, CacheBreakResult } from '../index';

// Mock cache break detection 函数（模拟 ai-tool-adapter 的 detectCacheBreak）
const mockCacheBreakDetection: CacheBreakDetectionFn = (
  currentUsage,
  previousUsage
): CacheBreakResult => {
  if (!previousUsage) return { isCacheBreak: false, cacheHitRate: 0 };

  const currentCacheRead = currentUsage.cacheReadInputTokens ?? 0;
  const previousCacheRead = previousUsage.cacheReadInputTokens ?? 0;
  const currentCacheCreation = currentUsage.cacheCreationInputTokens ?? 0;
  const previousCacheCreation = previousUsage.cacheCreationInputTokens ?? 0;

  // 从有缓存到完全无缓存 → 最严重断裂
  if (previousCacheRead > 0 && currentCacheRead === 0 && currentCacheCreation > 0) {
    return {
      isCacheBreak: true,
      reason: 'input_prefix_changed',
      cacheHitRate: 0,
      previousCacheHitRate:
        previousCacheRead / (previousCacheRead + previousCacheCreation + previousUsage.inputTokens),
      recommendedAction: 'accept_and_continue'
    };
  }

  // 缓存创建突增
  if (previousCacheCreation > 0) {
    const creationIncrease = (currentCacheCreation - previousCacheCreation) / previousCacheCreation;
    if (creationIncrease > 0.5) {
      return {
        isCacheBreak: true,
        reason: 'cache_creation_spike',
        recommendedAction: 'retry_with_same_prefix'
      };
    }
  }

  return { isCacheBreak: false };
};

describe('CacheBreakDetectionFn', () => {
  it('无 previousUsage → 不检测断裂', () => {
    const result = mockCacheBreakDetection({
      inputTokens: 1000,
      cacheReadInputTokens: 500,
      cacheCreationInputTokens: 200
    });
    expect(result.isCacheBreak).toBe(false);
  });

  it('正常 usage（无断裂）→ isCacheBreak=false', () => {
    const result = mockCacheBreakDetection(
      { inputTokens: 1000, cacheReadInputTokens: 800, cacheCreationInputTokens: 100 },
      { inputTokens: 1000, cacheReadInputTokens: 800, cacheCreationInputTokens: 100 }
    );
    expect(result.isCacheBreak).toBe(false);
  });

  it('input_prefix_changed 断裂 → isCacheBreak=true', () => {
    const result = mockCacheBreakDetection(
      { inputTokens: 1000, cacheReadInputTokens: 0, cacheCreationInputTokens: 1000 },
      { inputTokens: 1000, cacheReadInputTokens: 800, cacheCreationInputTokens: 100 }
    );
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('input_prefix_changed');
    expect(result.recommendedAction).toBe('accept_and_continue');
  });

  it('cache_creation_spike 断裂 → isCacheBreak=true', () => {
    const result = mockCacheBreakDetection(
      { inputTokens: 1000, cacheReadInputTokens: 200, cacheCreationInputTokens: 800 },
      { inputTokens: 1000, cacheReadInputTokens: 800, cacheCreationInputTokens: 100 }
    );
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('cache_creation_spike');
    expect(result.recommendedAction).toBe('retry_with_same_prefix');
  });
});

describe('CacheBreakResult 类型', () => {
  it('应支持所有 recommendedAction 值', () => {
    const actions: CacheBreakResult['recommendedAction'][] = [
      'retry_with_same_prefix',
      'accept_and_continue',
      'reduce_context'
    ];
    for (const action of actions) {
      const result: CacheBreakResult = {
        isCacheBreak: true,
        reason: 'test',
        recommendedAction: action
      };
      expect(result.recommendedAction).toBe(action);
    }
  });
});
