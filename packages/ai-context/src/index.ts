/** @suga/ai-context — 上下文压缩管线 公共 API */

// 核心实现
export { createContentReplacementTracker } from './core/ContentReplacementState';
export { ToolResultBudgetLayer } from './core/ToolResultBudget';
export { TimeBasedMicroCompactLayer } from './core/TimeBasedMicroCompact';
export { AutoCompactLayer } from './core/AutoCompact';
export { ReactiveCompactLayer } from './core/ReactiveCompact';
export { CompressPipeline } from './core/CompressPipeline';
export { CompressPhase } from './integration/CompressPhase';

// 辅助工具
export { estimateTokens } from './utils/tokenEstimate';
export {
  findLastAssistantTimestamp,
  collectToolUseBlocks,
  findToolResultById,
  getMessageContentSize,
  replaceToolResultMessage,
  createSummaryMessage
} from './utils/messageHelpers';

// 常量
export {
  DEFAULT_BUDGET_MAX_RESULT_SIZE,
  DEFAULT_BUDGET_PREVIEW_SIZE,
  DEFAULT_MICRO_COMPACT_GAP_THRESHOLD_MINUTES,
  DEFAULT_MICRO_COMPACT_KEEP_RECENT,
  DEFAULT_COMPACTABLE_TOOLS,
  DEFAULT_AUTO_COMPACT_THRESHOLD_RATIO,
  DEFAULT_AUTO_COMPACT_MAX_FAILURES,
  DEFAULT_AUTO_COMPACT_MESSAGES_TO_KEEP,
  DEFAULT_REACTIVE_STRATEGY,
  DEFAULT_CONTEXT_WINDOW,
  TIME_CLEARED_MESSAGE
} from './constants';

// 类型导出
export type {
  CompressedToolResultContent,
  CompactSummary,
  SummarySections
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
  MicroCompactConfig,
  AutoCompactConfig,
  ReactiveCompactConfig
} from './types/config';

export type {
  CompressDependencies,
  PersistToolResult,
  CallModelForSummary,
  TokenEstimator
} from './types/injection';