/**
 * 重试常量定义
 */

/**
 * 可重试的 HTTP 状态码
 */
const RETRYABLE_STATUS_CODES: readonly number[] = [408, 429] as const;

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG = {
  /** 默认重试次数 */
  DEFAULT_RETRY_COUNT: 3,
  /** 默认重试延迟（毫秒） */
  DEFAULT_RETRY_DELAY: 1000,
  /** 最大延迟时间（毫秒） */
  MAX_DELAY: 10000,
  /** 指数退避基数 */
  EXPONENTIAL_BASE: 2,
  /** 可重试的 HTTP 状态码 */
  RETRYABLE_STATUS_CODES,
  /** 服务器错误状态码范围 */
  SERVER_ERROR_MIN: 500,
  SERVER_ERROR_MAX: 599,
  /** 客户端错误状态码范围 */
  CLIENT_ERROR_MIN: 400,
  CLIENT_ERROR_MAX: 499,
} as const;

