/**
 * CostCalculator — Token 成本计算器
 *
 * 将 LLMUsageSummary × 价格表 → CostInfo（美元成本）。 价格表按模型名定义每种 token 的单价（$/MTok）。
 *
 * 默认价格表对齐 Anthropic Claude 模型定价（2025年8月）。 宿主可通过 costConfig.priceTable 注入自定义价格。
 */

import type { LLMUsageSummary } from '../types/usage';
import type { CostInfo, TokenUsageInfo } from '../types/cost';

// ============================================================
// 价格表类型
// ============================================================

/** 单个模型的价格条目（$/1M tokens） */
export interface ModelPriceEntry {
  /** 输入 token 单价（$/1M tokens） */
  readonly inputPricePerMTok: number;
  /** 输出 token 单价（$/1M tokens） */
  readonly outputPricePerMTok: number;
  /** 缓存写入 token 单价（$/1M tokens，可选） */
  readonly cacheWritePricePerMTok?: number;
  /** 缓存读取 token 单价（$/1M tokens，可选） */
  readonly cacheReadPricePerMTok?: number;
}

/** 价格表 — 模型名到价格条目的映射 */
export type PriceTable = Record<string, ModelPriceEntry>;

/** 成本计算配置 */
export interface CostConfig {
  /** 价格表（可选，默认 DEFAULT_PRICE_TABLE） */
  readonly priceTable?: PriceTable;
  /** 默认模型名（用于未知模型 fallback） */
  readonly defaultModel?: string;
  /** Token 预算（可选，超限时 AgentLoop 自动停止） */
  readonly tokenBudget?: import('../types/usage').TokenBudget;
  /** UsageTracker 实例（可选，runtime 注入后自动追踪每轮用量） */
  readonly usageTracker?: import('../types/usage').UsageTracker;
}

// ============================================================
// 默认价格表 — Anthropic Claude 模型 (2025年8月)
// ============================================================

/** 默认价格表 — 对齐 Anthropic 公开定价 */
export const DEFAULT_PRICE_TABLE: PriceTable = {
  'claude-opus-4-6': {
    inputPricePerMTok: 15,
    outputPricePerMTok: 75,
    cacheWritePricePerMTok: 18.75,
    cacheReadPricePerMTok: 1.875
  },
  'claude-sonnet-4-6': {
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    cacheWritePricePerMTok: 3.75,
    cacheReadPricePerMTok: 0.3
  },
  'claude-haiku-4-5': {
    inputPricePerMTok: 0.8,
    outputPricePerMTok: 4,
    cacheWritePricePerMTok: 1,
    cacheReadPricePerMTok: 0.08
  }
};

// ============================================================
// CostCalculator
// ============================================================

/**
 * CostCalculator — 成本计算器
 *
 * 从 UsageSummary + 价格表 计算 CostInfo。 提供静态方法（纯函数）和实例方法（带配置）。
 */
export class CostCalculator {
  private readonly priceTable: PriceTable;
  private readonly defaultModel: string;

  constructor(config?: CostConfig) {
    this.priceTable = config?.priceTable ?? DEFAULT_PRICE_TABLE;
    this.defaultModel = config?.defaultModel ?? 'claude-sonnet-4-6';
  }

  /** 计算成本 — 从 UsageSummary + 模型名 */
  calculate(usage: LLMUsageSummary, model?: string): CostInfo {
    const entry = this.priceTable[model ?? this.defaultModel] ?? this.priceTable[this.defaultModel];

    const inputCost = (usage.totalInputTokens / 1_000_000) * entry.inputPricePerMTok;
    const outputCost = (usage.totalOutputTokens / 1_000_000) * entry.outputPricePerMTok;

    // 缓存成本（可选）
    const cacheWriteCost = entry.cacheWritePricePerMTok
      ? (usage.totalCacheCreationTokens / 1_000_000) * entry.cacheWritePricePerMTok
      : 0;
    const cacheReadCost = entry.cacheReadPricePerMTok
      ? (usage.totalCacheReadTokens / 1_000_000) * entry.cacheReadPricePerMTok
      : 0;

    // 输入成本包含缓存部分
    const totalInputCost = inputCost + cacheWriteCost + cacheReadCost;

    return {
      totalCost: totalInputCost + outputCost,
      inputCost: totalInputCost,
      outputCost
    };
  }

  /** 从 UsageSummary 提取 TokenUsageInfo */
  extractTokenUsage(usage: LLMUsageSummary): TokenUsageInfo {
    return {
      inputTokens: usage.totalInputTokens,
      outputTokens: usage.totalOutputTokens,
      totalTokens: usage.totalInputTokens + usage.totalOutputTokens
    };
  }
}
