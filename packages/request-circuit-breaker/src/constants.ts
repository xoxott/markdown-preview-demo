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

/**
 * 熔断器管理器默认配置
 */
export const DEFAULT_CIRCUIT_BREAKER_MANAGER_CONFIG = {
  /** 默认清理间隔（5 分钟，毫秒） */
  DEFAULT_CLEANUP_INTERVAL: 5 * 60 * 1000,
  /** 默认最大数量（0 表示无限制） */
  DEFAULT_MAX_SIZE: 0,
  /** 默认空闲超时时间（30 分钟，毫秒） */
  DEFAULT_IDLE_TIMEOUT: 30 * 60 * 1000,
} as const;

