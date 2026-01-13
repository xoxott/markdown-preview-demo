/**
 * 请求配置类型定义
 * 注意：业务响应类型（如 ApiResponse、ErrorResponse）应由应用层定义
 */

import type { AxiosRequestConfig, AxiosProgressEvent } from 'axios';
import type { CircuitBreakerOptions } from '@suga/request-circuit-breaker';
import type { QueueConfig } from '@suga/request-queue';

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
 * 请求配置选项
 */
export interface RequestOptions {
  /** API基础URL */
  baseURL?: string;
  /** 请求超时时间 */
  timeout?: number;
  /** 超时策略 */
  timeoutStrategy?: Partial<TimeoutStrategy>;
  /** 队列配置（用于并发控制） */
  queueConfig?: QueueConfig;
}

/**
 * 请求配置接口
 * 扩展了 AxiosRequestConfig，添加了自定义功能配置
 */
export interface RequestConfig extends Omit<AxiosRequestConfig, 'method' | 'responseType'> {
  /** 请求方法（支持字符串类型） */
  method?: RequestMethod | string;
  /** 响应类型（支持字符串类型） */
  responseType?: AxiosRequestConfig['responseType'] | string;


  /**
   * 是否启用自动重试
   * @default false - 默认不重试
   */
  retry?: boolean;

  /**
   * 重试次数
   * @default 3 - 仅在 retry 为 true 时有效
   */
  retryCount?: number;

  /**
   * 超时时是否重试
   * @default false - 默认超时不重试
   * @description 仅在 retry 为 true 时有效，如果设置为 true，超时错误也会触发重试
   */
  retryOnTimeout?: boolean;

  /**
   * 熔断器配置
   * @description 用于在服务异常时自动降级或阻止请求
   */
  circuitBreaker?: CircuitBreakerOptions<unknown>;

  /**
   * 是否可取消请求
   * @default true - 默认可取消
   */
  cancelable?: boolean;

  /**
   * 请求标识（用于取消请求）
   */
  requestId?: string;


  /**
   * 是否启用去重
   * @default false - 默认不去重
   */
  dedupe?: boolean;

  /**
   * 是否使用缓存（仅 GET 请求）
   * @default false - 默认不使用缓存
   */
  cache?: boolean;

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
   * 队列配置（用于并发控制）
   */
  queue?: import('@suga/request-queue').QueueConfig;

  /**
   * 日志配置
   */
  logger?: import('@suga/request-logger').LoggerOptions;
}

