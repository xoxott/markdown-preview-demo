/** 压缩配置类型 */

import type { SummarySections } from './messages';

/** 压缩配置 — 各层参数 */
export interface CompressConfig {
  /** ToolResultBudget 层配置 */
  readonly budget?: BudgetConfig;
  /** TimeBasedMicroCompact 层配置 */
  readonly microCompact?: MicroCompactConfig;
  /** AutoCompact 层配置 */
  readonly autoCompact?: AutoCompactConfig;
  /** ReactiveCompact 层配置 */
  readonly reactiveCompact?: ReactiveCompactConfig;
}

/** ToolResultBudget 层配置 */
export interface BudgetConfig {
  /** 结果大小阈值（字节，超过则替换为文件引用） */
  readonly maxResultSize: number;
  /** 预览保留大小（字节） */
  readonly previewSize: number;
}

/** TimeBasedMicroCompact 层配置 */
export interface MicroCompactConfig {
  /** 时间间隔阈值（分钟） */
  readonly gapThresholdMinutes: number;
  /** 可清除的工具名称列表 */
  readonly compactableTools: readonly string[];
  /** 保留最近 N 个 tool_result 不清除 */
  readonly keepRecent: number;
}

/** AutoCompact 层配置 */
export interface AutoCompactConfig {
  /** 触发阈值比例（estimatedTokens >= contextWindow * thresholdRatio 时触发） */
  readonly thresholdRatio: number;
  /** 熔断器最大连续失败次数 */
  readonly maxConsecutiveFailures: number;
  /** 保留最近多少条消息不被摘要覆盖 */
  readonly messagesToKeep: number;
  /** 摘要段结构提示 */
  readonly summarySections?: SummarySections;
}

/** ReactiveCompact 层配置 */
export interface ReactiveCompactConfig {
  /** 是否启用紧急压缩 */
  readonly enabled: boolean;
  /** 紧急压缩策略 */
  readonly strategy: 'micro_compact' | 'auto_compact' | 'both';
}