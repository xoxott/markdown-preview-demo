/** 简单内存用量追踪器 — 宿主可替换为持久化实现 */

import type {
  LLMUsageInfo,
  LLMUsageSummary,
  OverageResult,
  TokenBudget,
  UsageTracker
} from '../types/usage';

const EMPTY_SUMMARY: LLMUsageSummary = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCacheCreationTokens: 0,
  totalCacheReadTokens: 0,
  apiCallCount: 0
};

/** 简单内存用量追踪器 — 宿主可替换为持久化实现 */
export class InMemoryUsageTracker implements UsageTracker {
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private totalCacheCreationTokens = 0;
  private totalCacheReadTokens = 0;
  private apiCallCount = 0;

  trackUsage(usage: LLMUsageInfo): void {
    this.totalInputTokens += usage.inputTokens;
    this.totalOutputTokens += usage.outputTokens;
    this.totalCacheCreationTokens += usage.cacheCreationInputTokens ?? 0;
    this.totalCacheReadTokens += usage.cacheReadInputTokens ?? 0;
    this.apiCallCount += 1;
  }

  getUsageSummary(): LLMUsageSummary {
    return {
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalCacheCreationTokens: this.totalCacheCreationTokens,
      totalCacheReadTokens: this.totalCacheReadTokens,
      apiCallCount: this.apiCallCount
    };
  }

  isOverBudget(budget: TokenBudget): boolean {
    return detectOverage(this.getUsageSummary(), budget).isOverage;
  }

  /** 重置追踪数据（用于测试） */
  reset(): void {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCacheCreationTokens = 0;
    this.totalCacheReadTokens = 0;
    this.apiCallCount = 0;
  }
}

/**
 * 检测用量溢出的纯函数
 *
 * 检查三种预算维度（输入/输出/总量）是否超限， 返回溢出类型和建议动作。
 *
 * @param usage 累计用量统计
 * @param budget 预算限制
 * @returns 溢出检测结果
 */
export function detectOverage(usage: LLMUsageSummary, budget: TokenBudget): OverageResult {
  // 输入 token 溢出 → 建议压缩上下文
  if (budget.maxInputTokens !== undefined && usage.totalInputTokens > budget.maxInputTokens) {
    return {
      isOverage: true,
      overageTokens: usage.totalInputTokens - budget.maxInputTokens,
      overageType: 'input',
      recommendedAction: 'compact'
    };
  }

  // 输出 token 溢出 → 建议减少输出
  if (budget.maxOutputTokens !== undefined && usage.totalOutputTokens > budget.maxOutputTokens) {
    return {
      isOverage: true,
      overageTokens: usage.totalOutputTokens - budget.maxOutputTokens,
      overageType: 'output',
      recommendedAction: 'reduce_output'
    };
  }

  // 总 token 溢出 → 建议停止
  if (budget.maxTotalTokens !== undefined) {
    const totalTokens = usage.totalInputTokens + usage.totalOutputTokens;
    if (totalTokens > budget.maxTotalTokens) {
      return {
        isOverage: true,
        overageTokens: totalTokens - budget.maxTotalTokens,
        overageType: 'total',
        recommendedAction: 'stop'
      };
    }
  }

  return { isOverage: false };
}

/** 创建空的用量统计 */
export function emptyUsageSummary(): LLMUsageSummary {
  return { ...EMPTY_SUMMARY };
}
