/**
 * 请求核心类型定义
 */

import type { QueueConfig } from '@suga/request-queue';

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
