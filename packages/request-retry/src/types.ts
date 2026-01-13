/**
 * 重试类型定义
 */

/**
 * 错误类型
 */
export type ErrorType = 'timeout' | 'network' | 'server' | 'client' | 'unknown';

/**
 * 通用错误接口
 */
export interface RetryableError {
  /** 错误代码 */
  code?: string;
  /** 错误消息 */
  message: string;
  /** HTTP 响应状态码（如果有） */
  status?: number;
  /** HTTP 响应状态文本（如果有） */
  statusText?: string;
  /** 响应数据（如果有） */
  response?: {
    status: number;
    statusText?: string;
    data?: unknown;
  };
}

/**
 * 重试策略配置
 */
export interface RetryStrategy {
  /** 是否启用重试 */
  enabled: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟函数 */
  retryDelay: (attempt: number, error: RetryableError) => number;
  /** 判断是否应该重试 */
  shouldRetry: (error: RetryableError, attempt: number) => boolean;
  /** 针对不同错误类型的重试策略 */
  errorTypeStrategy?: {
    timeout?: { maxRetries: number; delay: number };
    network?: { maxRetries: number; delay: number };
    server?: { maxRetries: number; delay: number };
    client?: { maxRetries: number; delay: number };
  };
}

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 是否启用重试 */
  retry?: boolean;
  /** 重试次数 */
  retryCount?: number;
  /** 超时时是否重试 */
  retryOnTimeout?: boolean;
}

/**
 * 重试元数据接口
 * 定义重试相关的元数据字段
 */
export interface RetryMeta {
  /**
   * 重试配置
   * - `true`: 启用重试（使用默认策略）
   * - `false`: 禁用重试
   * - `RetryStrategy`: 使用自定义策略
   * - `RetryConfig`: 使用配置对象
   * - `undefined`: 不指定，由策略决定
   */
  retry?: boolean | RetryStrategy | RetryConfig;

  /**
   * 其他扩展字段
   * 允许策略实现添加自定义字段
   */
  [key: string]: unknown;
}

