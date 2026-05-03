/** 成本计算类型定义 — CostInfo + TokenUsageInfo */

/** Token 使用信息（简化版 — 供 /status 命令等展示） */
export interface TokenUsageInfo {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

/** 成本信息 — 以美元为单位的成本计算结果 */
export interface CostInfo {
  readonly totalCost: number;
  readonly inputCost: number;
  readonly outputCost: number;
}
