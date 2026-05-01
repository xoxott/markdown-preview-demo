/** Prompt Cache 断裂检测 — 检测缓存命中率突变并建议策略 */

import type { LLMUsageInfo } from '../types/usage';

/** Prompt Cache 断裂检测结果 */
export interface CacheBreakResult {
  /** 是否检测到缓存断裂 */
  readonly isCacheBreak: boolean;
  /** 断裂原因 */
  readonly reason?: CacheBreakReason;
  /** 缓存命中率（当前请求） */
  readonly cacheHitRate?: number;
  /** 前一次请求的缓存命中率 */
  readonly previousCacheHitRate?: number;
  /** 建议动作 */
  readonly recommendedAction?: 'retry_with_same_prefix' | 'accept_and_continue' | 'reduce_context';
}

/** 缓存断裂原因 */
export type CacheBreakReason =
  | 'cache_creation_spike' // cacheCreationInputTokens 突然增加
  | 'cache_read_drop' // cacheReadInputTokens 突然减少
  | 'input_prefix_changed'; // 输入前缀变化导致缓存失效

/** 缓存断裂检测阈值配置 */
export interface CacheBreakThreshold {
  /** 缓存创建 token 突增判定比例（默认 0.5 — 50%增加视为断裂） */
  readonly cacheCreationSpikeRatio?: number;
  /** 缓存读取 token 突降判定比例（默认 0.5 — 50%减少视为断裂） */
  readonly cacheReadDropRatio?: number;
  /** 最小输入 token 数（低于此值不做检测，默认 100） */
  readonly minInputTokens?: number;
}

/** 默认检测阈值 */
export const DEFAULT_CACHE_BREAK_THRESHOLD: CacheBreakThreshold = {
  cacheCreationSpikeRatio: 0.5,
  cacheReadDropRatio: 0.5,
  minInputTokens: 100
};

/**
 * 计算单次请求的缓存命中率
 *
 * cacheHitRate = cacheReadInputTokens / (cacheReadInputTokens + cacheCreationInputTokens +
 * inputTokens)
 *
 * @param usage 当前请求的用量信息
 * @returns 缓存命中率（0.0-1.0），无缓存信息时返回 0
 */
export function calculateCacheHitRate(usage: LLMUsageInfo): number {
  const cacheRead = usage.cacheReadInputTokens ?? 0;
  const cacheCreation = usage.cacheCreationInputTokens ?? 0;
  const total = cacheRead + cacheCreation + usage.inputTokens;
  if (total === 0) return 0;
  return cacheRead / total;
}

/**
 * 检测 prompt cache 断裂的纯函数
 *
 * 比较当前请求与前一次请求的缓存命中率，检测突增/突降。
 *
 * @param currentUsage 当前请求的用量信息
 * @param previousUsage 前一次请求的用量信息（可选）
 * @param threshold 检测阈值（可选，默认 DEFAULT_CACHE_BREAK_THRESHOLD）
 * @returns 缓存断裂检测结果
 */
export function detectCacheBreak(
  currentUsage: LLMUsageInfo,
  previousUsage?: LLMUsageInfo,
  threshold?: CacheBreakThreshold
): CacheBreakResult {
  const effectiveThreshold = threshold ?? DEFAULT_CACHE_BREAK_THRESHOLD;
  const minInputTokens =
    effectiveThreshold.minInputTokens ?? DEFAULT_CACHE_BREAK_THRESHOLD.minInputTokens!;

  // 输入 token 数过低，不做检测
  if (currentUsage.inputTokens < minInputTokens) {
    return { isCacheBreak: false };
  }

  // 无前一次用量信息，无法比较
  if (!previousUsage) {
    return {
      isCacheBreak: false,
      cacheHitRate: calculateCacheHitRate(currentUsage)
    };
  }

  const currentHitRate = calculateCacheHitRate(currentUsage);
  const previousHitRate = calculateCacheHitRate(previousUsage);
  const spikeRatio =
    effectiveThreshold.cacheCreationSpikeRatio ??
    DEFAULT_CACHE_BREAK_THRESHOLD.cacheCreationSpikeRatio!;
  const dropRatio =
    effectiveThreshold.cacheReadDropRatio ?? DEFAULT_CACHE_BREAK_THRESHOLD.cacheReadDropRatio!;

  const currentCacheCreation = currentUsage.cacheCreationInputTokens ?? 0;
  const previousCacheCreation = previousUsage.cacheCreationInputTokens ?? 0;
  const currentCacheRead = currentUsage.cacheReadInputTokens ?? 0;
  const previousCacheRead = previousUsage.cacheReadInputTokens ?? 0;

  // 优先检测：从有缓存到完全无缓存 → 输入前缀变化（最严重的断裂）
  if (previousCacheRead > 0 && currentCacheRead === 0 && currentCacheCreation > 0) {
    return {
      isCacheBreak: true,
      reason: 'input_prefix_changed',
      cacheHitRate: currentHitRate,
      previousCacheHitRate: previousHitRate,
      recommendedAction: 'accept_and_continue'
    };
  }

  // 检测缓存创建突增
  if (previousCacheCreation > 0) {
    const creationIncrease = (currentCacheCreation - previousCacheCreation) / previousCacheCreation;
    if (creationIncrease > spikeRatio) {
      return {
        isCacheBreak: true,
        reason: 'cache_creation_spike',
        cacheHitRate: currentHitRate,
        previousCacheHitRate: previousHitRate,
        recommendedAction: 'retry_with_same_prefix'
      };
    }
  }

  // 检测缓存读取突降
  if (previousCacheRead > 0) {
    const readDecrease = (previousCacheRead - currentCacheRead) / previousCacheRead;
    if (readDecrease > dropRatio) {
      return {
        isCacheBreak: true,
        reason: 'cache_read_drop',
        cacheHitRate: currentHitRate,
        previousCacheHitRate: previousHitRate,
        recommendedAction: 'reduce_context'
      };
    }
  }

  return {
    isCacheBreak: false,
    cacheHitRate: currentHitRate,
    previousCacheHitRate: previousHitRate
  };
}
