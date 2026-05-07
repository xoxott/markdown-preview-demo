/** 压缩器接口与管线类型 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressedToolResultContent } from './messages';
import type { CompressConfig } from './config';
export type { CompressedToolResultContent } from './messages';

/** 压缩层接口 — 每个压缩层实现此接口 */
export interface CompressLayer {
  /** 层名称（用于日志和调试） */
  readonly name: string;
  /** 执行压缩，返回压缩后的消息列表 */
  compress(messages: readonly AgentMessage[], state: CompressState): Promise<CompressResult>;
}

/** 压缩状态 — 各层之间共享的状态 */
export interface CompressState {
  /** ContentReplacementState — ToolResultBudget 层需要的跟踪状态 */
  contentReplacement: ContentReplacementTracker;
  /** AutoCompact 熔断器连续失败计数 */
  autoCompactFailures: number;
  /** G19: ForkCompact 熔断器连续失败计数（可选） */
  forkCompactFailures?: number;
  /** 上一条 assistant 消息的时间戳 */
  lastAssistantTimestamp: number | null;
  /** 当前时间（用于 TimeBasedMicroCompact 计算 gap） */
  currentTime: number;
  /** 估算的 token 数量 */
  estimatedTokens: number;
  /** 上下文窗口大小（token 上限） */
  contextWindow: number;
  /** 压缩配置 */
  config: CompressConfig;
}

/** 压缩结果 */
export interface CompressResult {
  /** 压缩后的消息列表 */
  readonly messages: readonly AgentMessage[];
  /** 本层是否执行了压缩操作 */
  readonly didCompress: boolean;
  /** 压缩统计信息 */
  readonly stats?: CompressStats;
}

/** 压缩统计 */
export interface CompressStats {
  /** 被替换的 tool_result 数量 */
  readonly replacedToolResults?: number;
  /** 被时间清除的 tool_result 数量 */
  readonly timeClearedToolResults?: number;
  /** 被 SnipCompact 裁剪的 tool_result 数量 */
  readonly snippedToolResults?: number;
  /** 是否生成了摘要 */
  readonly generatedSummary?: boolean;
  /** 摘要覆盖的消息数量 */
  readonly summaryMessageCount?: number;
  /** PartialCompact 裁剪的 API round 数 */
  readonly partialCompactTrimmedRounds?: number;
  /** PartialCompact 裁剪的消息数 */
  readonly partialCompactTrimmedMessages?: number;
  /** G19: ForkCompact 是否生成了摘要 */
  readonly forkCompactSummary?: boolean;
  /** G19: ForkCompact 执行耗时(ms) */
  readonly forkCompactDurationMs?: number;
}

/** 管线整体结果 */
export interface CompressPipelineResult {
  readonly messages: readonly AgentMessage[];
  readonly didCompress: boolean;
  readonly stats: readonly CompressStats[];
}

/** ContentReplacementTracker — ToolResultBudget 层的冻结状态接口 */
export interface ContentReplacementTracker {
  /** 已见过的 tool_use_id 集合 */
  readonly seenIds: ReadonlySet<string>;
  /** 已替换的映射 */
  readonly replacements: ReadonlyMap<string, CompressedToolResultContent>;
  /** 是否已冻结 */
  readonly frozen: boolean;
  /** 标记一个 tool_use_id 已见过 */
  markSeen(id: string): void;
  /** 记录一次替换 */
  recordReplacement(id: string, content: CompressedToolResultContent): void;
  /** 判断分流类型 */
  classify(id: string): 'mustReapply' | 'frozen' | 'fresh';
  /** 冻结状态 */
  freeze(): void;
}
