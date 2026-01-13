/**
 * 熔断器常量定义
 */

/**
 * 默认熔断器配置
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG = {
  /** 默认失败阈值 */
  DEFAULT_FAILURE_THRESHOLD: 5,
  /** 默认超时时间（毫秒） */
  DEFAULT_TIMEOUT: 60000,
  /** 默认成功阈值 */
  DEFAULT_SUCCESS_THRESHOLD: 2,
  /** 默认启用状态 */
  DEFAULT_ENABLED: true,
} as const;

/**
 * 网络错误代码
 */
export const NETWORK_ERROR_CODES: readonly string[] = [
  'ECONNABORTED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENETUNREACH',
] as const;

/**
 * 网络错误关键词
 */
export const NETWORK_ERROR_KEYWORDS: readonly string[] = [
  'timeout',
  'network',
  'connection',
  'econnrefused',
  'enotfound',
] as const;

/**
 * 服务器错误状态码范围
 */
export const SERVER_ERROR_STATUS_MIN = 500;
export const SERVER_ERROR_STATUS_MAX = 599;

