/** 默认配置常量 */

/** ToolResultBudget 默认配置 */
export const DEFAULT_BUDGET_MAX_RESULT_SIZE = 150_000; // 150KB
export const DEFAULT_BUDGET_PREVIEW_SIZE = 2_000; // 2KB

/** TimeBasedMicroCompact 默认配置 */
export const DEFAULT_MICRO_COMPACT_GAP_THRESHOLD_MINUTES = 60;
export const DEFAULT_MICRO_COMPACT_KEEP_RECENT = 5;
export const DEFAULT_COMPACTABLE_TOOLS: readonly string[] = [
  'Read', 'Shell', 'Grep', 'Glob', 'WebSearch', 'WebFetch', 'Edit', 'Write'
];

/** AutoCompact 默认配置 */
export const DEFAULT_AUTO_COMPACT_THRESHOLD_RATIO = 0.93;
export const DEFAULT_AUTO_COMPACT_MAX_FAILURES = 3;
export const DEFAULT_AUTO_COMPACT_MESSAGES_TO_KEEP = 4;

/** ReactiveCompact 默认配置 */
export const DEFAULT_REACTIVE_STRATEGY = 'both' as const;

/** 默认上下文窗口大小（token 上限） */
export const DEFAULT_CONTEXT_WINDOW = 200_000;

/** 时间清除标记文本 */
export const TIME_CLEARED_MESSAGE = '[Old tool result content cleared]';

/** 持久化输出模板 */
export const PERSISTED_OUTPUT_TEMPLATE = {
  header: 'Output too large',
  savedPrefix: 'Full output saved to:',
  previewPrefix: 'Preview (first 2KB):'
} as const;