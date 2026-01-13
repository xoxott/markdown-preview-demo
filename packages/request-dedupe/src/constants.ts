/**
 * 请求去重常量配置
 */

/**
 * 默认去重配置
 */
export const DEFAULT_DEDUPE_CONFIG = {
  /** 默认去重时间窗口（毫秒） */
  DEFAULT_DEDUPE_WINDOW: 1000,
  /** 默认去重策略 */
  DEFAULT_STRATEGY: 'exact' as const,
} as const;

