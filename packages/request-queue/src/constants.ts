/**
 * 请求队列常量配置
 */

/**
 * 默认队列配置
 */
export const DEFAULT_QUEUE_CONFIG = {
  /** 默认最大并发数 */
  DEFAULT_MAX_CONCURRENT: 10,
  /** 默认队列策略 */
  DEFAULT_STRATEGY: 'fifo' as const,
  /** 默认优先级 */
  DEFAULT_PRIORITY: 'normal' as const,
} as const;

