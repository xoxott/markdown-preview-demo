/** 压缩配置 — 各层参数 */

import type { SummarySections } from './messages';
import type { AttachmentRebuildConfig } from './attachment';

/** 压缩配置 — 各层参数 */
export interface CompressConfig {
  /** ToolResultBudget 层配置 */
  readonly budget?: BudgetConfig;
  /** SnipCompact 层配置 */
  readonly snipCompact?: SnipCompactConfig;
  /** TimeBasedMicroCompact 层配置 */
  readonly microCompact?: MicroCompactConfig;
  /** AutoCompact 层配置 */
  readonly autoCompact?: AutoCompactConfig;
  /** G19: ForkCompact 层配置（fork 子代理压缩） */
  readonly forkCompact?: ForkCompactConfig;
  /** ReactiveCompact 层配置 */
  readonly reactiveCompact?: ReactiveCompactConfig;
  /** PTL Retry 配置（AutoCompact 摘要请求自身 PTL 时重试） */
  readonly ptlRetry?: PTLRetryConfig;
  /** BlockingLimit 预拦截配置 */
  readonly blockingLimit?: BlockingLimitConfig;
  /** Post-compact 附件重建配置 */
  readonly attachmentRebuild?: AttachmentRebuildConfig;
  /** PartialCompact 保底配置（AutoCompact 熔断时的 fallback） */
  readonly partialCompact?: PartialCompactConfig;
}

/** PTL Retry 配置 */
export interface PTLRetryConfig {
  /** 最大 PTL 重试次数（默认 3） */
  readonly maxPTLRetries?: number;
}

/** BlockingLimit 预拦截配置 */
export interface BlockingLimitConfig {
  /** 阻塞阈值预留 token 数（默认 3000） */
  readonly reserveTokens?: number;
}

/** ToolResultBudget 层配置 */
export interface BudgetConfig {
  /** 结果大小阈值（字节，超过则替换为文件引用） */
  readonly maxResultSize: number;
  /** 预览保留大小（字节） */
  readonly previewSize: number;
}

/** SnipCompact 层配置 */
export interface SnipCompactConfig {
  /** 保留最近 N 个 tool_result 不裁剪 */
  readonly keepRecent?: number;
  /** 是否移除孤立的 tool_result（没有对应 tool_use） */
  readonly removeOrphanedResults?: boolean;
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

/** PartialCompact 保底配置 */
export interface PartialCompactConfig {
  /** 是否启用 PartialCompact 保底（默认 true） */
  readonly enabled?: boolean;
  /** 裁剪比例（裁剪最老多少比例的 API rounds，默认 0.2） */
  readonly truncateRatio?: number;
  /** 保底最大裁剪 groups 数（默认 3） */
  readonly maxTruncatedGroups?: number;
}

/** G19: ForkCompact 层配置 — fork 子代理压缩 */
export interface ForkCompactConfig {
  /** 是否启用 ForkCompact（默认 false — 需注入 forkSpawner 才激活） */
  readonly enabled?: boolean;
  /** 触发阈值比例（estimatedTokens >= contextWindow * thresholdRatio 时触发，默认 0.8） */
  readonly thresholdRatio?: number;
  /** 保留最近多少条消息不被摘要覆盖（默认 4） */
  readonly messagesToKeep?: number;
  /** 最大 fork 深度（默认 2，防止递归 fork） */
  readonly maxForkDepth?: number;
  /** 熔断器最大连续失败次数（默认 3） */
  readonly maxFailures?: number;
  /** fork 失败时回退到 AutoCompact（默认 false） */
  readonly fallbackToAutoCompact?: boolean;
}
