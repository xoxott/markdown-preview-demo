/** @suga/ai-context — 上下文压缩管线 公共 API */

// 核心实现
export { createContentReplacementTracker } from './core/ContentReplacementState';
export { ToolResultBudgetLayer } from './core/ToolResultBudget';
export { SnipCompactLayer } from './core/SnipCompactLayer';
export { TimeBasedMicroCompactLayer } from './core/TimeBasedMicroCompact';
export { AutoCompactLayer } from './core/AutoCompact';
export { ReactiveCompactLayer } from './core/ReactiveCompact';
export { CompressPipeline } from './core/CompressPipeline';
export { CompressPhase } from './integration/CompressPhase';
export { BlockingLimitPhase } from './integration/BlockingLimitPhase';
export { PTLRetryHandler } from './core/PTLRetryHandler';
export { AttachmentRebuilder } from './core/AttachmentRebuilder';
export { PartialCompactLayer } from './core/PartialCompactLayer';

// 辅助工具
export {
  estimateTokens,
  estimateTokensPrecise,
  TOKEN_ESTIMATE_COEFFICIENTS,
  looksLikeJson
} from './utils/tokenEstimate';
export {
  findLastAssistantTimestamp,
  collectToolUseBlocks,
  findToolResultById,
  getMessageContentSize,
  replaceToolResultMessage,
  createSummaryMessage
} from './utils/messageHelpers';
export { groupByApiRound } from './utils/messageGrouping';
export type { ApiRoundGroup } from './utils/messageGrouping';

// 常量
export {
  DEFAULT_BUDGET_MAX_RESULT_SIZE,
  DEFAULT_BUDGET_PREVIEW_SIZE,
  DEFAULT_SNIP_KEEP_RECENT,
  DEFAULT_SNIP_REMOVE_ORPHANED_RESULTS,
  DEFAULT_MICRO_COMPACT_GAP_THRESHOLD_MINUTES,
  DEFAULT_MICRO_COMPACT_KEEP_RECENT,
  DEFAULT_COMPACTABLE_TOOLS,
  DEFAULT_AUTO_COMPACT_THRESHOLD_RATIO,
  DEFAULT_AUTO_COMPACT_MAX_FAILURES,
  DEFAULT_AUTO_COMPACT_MESSAGES_TO_KEEP,
  DEFAULT_REACTIVE_STRATEGY,
  DEFAULT_CONTEXT_WINDOW,
  TIME_CLEARED_MESSAGE,
  PERSISTED_OUTPUT_TEMPLATE,
  DEFAULT_PTL_RETRY_MAX,
  DEFAULT_BLOCKING_LIMIT_RESERVE_TOKENS
} from './constants';

// 类型导出
export type {
  CompressedToolResultContent,
  CompactSummary,
  SummarySections,
  BlockingLimitError
} from './types/messages';

export type {
  CompressLayer,
  CompressState,
  CompressResult,
  CompressStats,
  CompressPipelineResult,
  ContentReplacementTracker
} from './types/compressor';

export type {
  CompressConfig,
  BudgetConfig,
  SnipCompactConfig,
  MicroCompactConfig,
  AutoCompactConfig,
  ReactiveCompactConfig,
  PartialCompactConfig,
  PTLRetryConfig,
  BlockingLimitConfig
} from './types/config';

export type {
  CompressDependencies,
  PersistToolResult,
  CallModelForSummary,
  TokenEstimator,
  IsPTLError
} from './types/injection';

export type {
  AttachmentType,
  AttachmentFile,
  AttachmentSkill,
  AttachmentRebuildConfig,
  AttachmentRebuildResult
} from './types/attachment';
