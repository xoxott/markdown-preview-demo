/**
 * API常量定义
 */

/** Token存储键名 */
export const TOKEN_KEY = 'app_token';

/** 刷新Token存储键名 */
export const REFRESH_TOKEN_KEY = 'app_refresh_token';

/** 默认请求超时时间（毫秒） */
export const DEFAULT_TIMEOUT = 10000;

/** 默认重试次数 */
export const DEFAULT_RETRY_COUNT = 3;

/** 默认重试延迟（毫秒） */
export const DEFAULT_RETRY_DELAY = 1000;

/** Token 刷新默认配置 */
export const DEFAULT_TOKEN_REFRESH_CONFIG = {
  /** 刷新 token 的默认接口地址 */
  REFRESH_TOKEN_URL: '/api/auth/refresh',
  /** 刷新 token 的默认请求方法 */
  REFRESH_TOKEN_METHOD: 'POST' as const,
  /** 刷新 token 请求参数中的默认键名 */
  REFRESH_TOKEN_PARAM_KEY: 'refreshToken',
  /** 响应数据中 token 的默认键名 */
  TOKEN_KEY_IN_RESPONSE: 'token',
  /** 响应数据中 refreshToken 的默认键名 */
  REFRESH_TOKEN_KEY_IN_RESPONSE: 'refreshToken',
} as const;

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

/** HTTP状态码 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/** 请求内容类型 */
export enum ContentType {
  JSON = 'application/json',
  FORM = 'application/x-www-form-urlencoded',
  FORM_DATA = 'multipart/form-data',
  TEXT = 'text/plain',
}

/** 业务错误码枚举 */
export enum BusinessErrorCode {
  /** 成功 */
  SUCCESS = 0,
  /** 未授权 */
  UNAUTHORIZED = 401,
  /** 禁止访问 */
  FORBIDDEN = 403,
  /** 资源不存在 */
  NOT_FOUND = 404,
  /** 服务器错误 */
  SERVER_ERROR = 500,
  /** Token过期 */
  TOKEN_EXPIRED = 1001,
  /** Token无效 */
  TOKEN_INVALID = 1002,
  /** 参数错误 */
  PARAM_ERROR = 1003,
  /** 业务逻辑错误 */
  BUSINESS_ERROR = 1004,
}

/** 错误消息映射 */
export const ERROR_MESSAGE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: '请求参数错误',
  [HttpStatus.UNAUTHORIZED]: '未授权，请重新登录',
  [HttpStatus.FORBIDDEN]: '禁止访问',
  [HttpStatus.NOT_FOUND]: '请求的资源不存在',
  [HttpStatus.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [HttpStatus.BAD_GATEWAY]: '网关错误',
  [HttpStatus.SERVICE_UNAVAILABLE]: '服务不可用',
  [HttpStatus.GATEWAY_TIMEOUT]: '网关超时',
};
