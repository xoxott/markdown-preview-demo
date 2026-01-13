/**
 * 请求队列类型定义
 */

import type { NormalizedRequestConfig } from '@suga/request-core';

/**
 * 队列策略类型
 */
export type QueueStrategy = 'fifo' | 'priority';

/**
 * 请求优先级
 */
export type RequestPriority = 'high' | 'normal' | 'low';

/**
 * 队列配置
 */
export interface QueueConfig {
  /** 最大并发数 */
  maxConcurrent: number;
  /** 队列策略 */
  queueStrategy?: QueueStrategy;
}

/**
 * 队列元数据接口
 * 定义队列相关的元数据字段
 */
export interface QueueMeta {
  /**
   * 队列配置
   * - `true`: 启用队列（使用默认配置）
   * - `false`: 禁用队列
   * - `QueueConfig`: 使用自定义配置
   * - `undefined`: 不指定，不使用队列
   */
  queue?: boolean | QueueConfig;

  /**
   * 请求优先级（仅在启用队列时有效）
   */
  priority?: RequestPriority;

  /**
   * 其他扩展字段
   */
  [key: string]: unknown;
}

/**
 * 队列中的请求项
 */
export interface QueuedRequest<T = unknown> {
  /** 请求配置 */
  config: NormalizedRequestConfig;
  /** 请求函数 */
  requestFn: () => Promise<T>;
  /** 优先级 */
  priority: RequestPriority;
  /** 解析 Promise */
  resolve: (value: T) => void;
  /** 拒绝 Promise */
  reject: (error: unknown) => void;
  /** 创建时间 */
  createdAt: number;
}

