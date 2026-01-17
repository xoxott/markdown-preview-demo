/**
 * 请求配置类型定义
 * 注意：业务响应类型（如 ApiResponse、ErrorResponse）应由应用层定义
 */

import type { AxiosRequestConfig, AxiosProgressEvent } from 'axios';
import type { CircuitBreakerOptions, CircuitBreakerManagerOptions } from '@suga/request-circuit-breaker';
import type { QueueConfig } from '@suga/request-queue';
import type { RetryConfig, RetryStrategy } from '@suga/request-retry';
import type { CacheConfig, CacheReadStepOptions, CacheWriteStepOptions } from '@suga/request-cache';
import type { DedupeOptions } from '@suga/request-dedupe';
import type { CancelOptions } from '@suga/request-abort';
import type { LoggerOptions, LoggerManager } from '@suga/request-logger';

/**
 * 请求方法类型
 */
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * 超时策略配置
 */
export interface TimeoutStrategy {
  /** 默认超时时间 */
  default: number;
  /** 按请求类型设置超时时间 */
  byMethod?: Record<string, number>;
  /** 按 URL 模式设置超时时间 */
  byUrlPattern?: Array<{ pattern: RegExp; timeout: number }>;
  /** 超时时是否自动重试 */
  retryOnTimeout?: boolean;
}

/**
 * 请求配置选项（业务层配置）
 */
export interface RequestOptions {
  /** API基础URL */
  baseURL?: string;

  /** 请求超时时间 */
  timeout?: number;

  /** 超时策略 */
  timeoutStrategy?: Partial<TimeoutStrategy>;

  /** 队列配置（传递给 QueueStep 作为默认配置） */
  queueConfig?: QueueConfig;

  /** 去重配置（传递给 DedupeStep 作为默认配置） */
  dedupeConfig?: DedupeOptions;

  /** 取消配置（传递给 CancelStep 作为默认配置） */
  cancelConfig?: CancelOptions;

  /** 重试策略（传递给 RetryStep 作为默认策略） */
  retryStrategy?: RetryStrategy;

  /** 熔断器管理器选项（传递给 CircuitBreakerStep） */
  circuitBreakerManagerOptions?: CircuitBreakerManagerOptions;

  /** 日志管理器实例（用于全局日志配置） */
  loggerManager?: LoggerManager;

  /** 日志配置（传递给 LoggerManager，如果未提供 loggerManager） */
  loggerConfig?: LoggerOptions;

  /** 缓存读取步骤配置（传递给 CacheReadStep） */
  cacheReadStepOptions?: CacheReadStepOptions;

  /** 缓存写入步骤配置（传递给 CacheWriteStep） */
  cacheWriteStepOptions?: CacheWriteStepOptions;

  /** 全局默认配置（会被单个请求配置覆盖） */
  defaultConfig?: Partial<RequestConfig>;
}

/**
 * 创建请求客户端的配置
 */
export interface CreateRequestClientConfig extends RequestOptions, AxiosRequestConfig {}
/**
 * 请求配置接口
 * 扩展了 AxiosRequestConfig，添加了自定义功能配置
 */
export interface RequestConfig extends Omit<AxiosRequestConfig, 'method' | 'responseType'> {

  /** 请求方法 */
  method?: RequestMethod;

  /** 响应类型 */
  responseType?: AxiosRequestConfig['responseType'];

  /**
   * 重试配置（完整类型，对应 RetryStep）
   */
  retry?: RetryConfig;

  /**
   * 熔断器配置（完整类型，对应 CircuitBreakerStep）
   */
  circuitBreaker?: CircuitBreakerOptions<unknown>;

  /**
   * 取消配置（完整类型，对应 CancelStep）
   */
  cancelable?: boolean | CancelOptions;

  /**
   * 请求标识（用于取消请求）
   */
  requestId?: string;

  /**
   * 去重配置（完整类型，对应 DedupeStep）
   */
  dedupe?: boolean | DedupeOptions;

  /**
   * 缓存配置（完整类型，对应 CacheReadStep/CacheWriteStep）
   */
  cache?: CacheConfig;

  /**
   * 缓存过期时间（毫秒）
   */
  cacheExpireTime?: number;

  /**
   * 是否启用日志
   * @default false - 默认不启用
   */
  logEnabled?: boolean;

  /**
   * 日志配置（完整类型，对应 Logger）
   */
  logger?: LoggerOptions;

  /**
   * 请求优先级（用于队列管理）
   */
  priority?: number;

  /**
   * 上传进度回调
   */
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;

  /**
   * 下载进度回调
   */
  onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;

  /**
   * 队列配置（完整类型，对应 QueueStep）
   */
  queue?: QueueConfig;
}

