/**
 * 请求客户端常量定义
 * 注意：业务相关常量（如 Token 键名、错误消息等）应由应用层定义
 */

/** 默认请求超时时间（毫秒） */
export const DEFAULT_TIMEOUT = 10000;

/** 默认重试次数 */
export const DEFAULT_RETRY_COUNT = 3;

/** 默认重试延迟（毫秒） */
export const DEFAULT_RETRY_DELAY = 1000;

// Token 刷新配置已移除，应由应用层实现

/** 请求重试默认配置 */
export const DEFAULT_RETRY_CONFIG = {
  /** 最大延迟时间（毫秒） */
  MAX_DELAY: 10000,
  /** 指数退避基数 */
  EXPONENTIAL_BASE: 2,
  /** 可重试的 HTTP 状态码 */
  RETRYABLE_STATUS_CODES: [
    408, // Request Timeout
    429, // Too Many Requests
  ] as const,
  /** 服务器错误状态码范围 */
  SERVER_ERROR_MIN: 500,
  SERVER_ERROR_MAX: 599,
} as const;

/** 请求缓存默认配置 */
export const DEFAULT_CACHE_CONFIG = {
  /** 默认缓存过期时间：5 分钟 */
  DEFAULT_EXPIRE_TIME: 5 * 60 * 1000,
  /** localStorage 缓存键前缀 */
  LOCAL_STORAGE_PREFIX: 'api_cache_',
  /** 每次清理的最大项数（避免阻塞） */
  MAX_CLEANUP_PER_CALL: 100,
} as const;

/** 超时策略默认配置 */
export const DEFAULT_TIMEOUT_STRATEGY = {
  /** GET 请求默认超时时间（毫秒） */
  GET_TIMEOUT: 10000,
  /** POST 请求默认超时时间（毫秒） */
  POST_TIMEOUT: 30000,
  /** PUT 请求默认超时时间（毫秒） */
  PUT_TIMEOUT: 30000,
  /** PATCH 请求默认超时时间（毫秒） */
  PATCH_TIMEOUT: 30000,
  /** DELETE 请求默认超时时间（毫秒） */
  DELETE_TIMEOUT: 10000,
} as const;

// HTTP 状态码、ContentType、业务错误码、错误消息映射等业务常量已移除，应由应用层定义

