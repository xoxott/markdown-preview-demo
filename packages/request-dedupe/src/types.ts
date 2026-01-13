/**
 * 请求去重类型定义
 */

import type { NormalizedRequestConfig } from '@suga/request-core';

/**
 * 去重策略类型
 */
export type DedupeStrategy = 'exact' | 'ignore-params' | 'custom';

/**
 * 请求去重配置选项
 */
export interface DedupeOptions {
  /** 去重时间窗口（毫秒），默认 1000ms */
  dedupeWindow?: number;
  /** 去重策略，默认 'exact' */
  strategy?: DedupeStrategy;
  /** 忽略的参数名列表（仅在 strategy 为 'ignore-params' 时有效） */
  ignoreParams?: string[];
  /** 自定义键生成函数（仅在 strategy 为 'custom' 时有效） */
  customKeyGenerator?: (config: NormalizedRequestConfig) => string;
}

/**
 * 去重元数据接口
 * 定义去重相关的元数据字段
 */
export interface DedupeMeta {
  /**
   * 去重配置
   * - `true`: 启用去重（使用默认配置）
   * - `false`: 禁用去重
   * - `DedupeOptions`: 使用自定义配置
   * - `undefined`: 不指定，不使用去重
   */
  dedupe?: boolean | DedupeOptions;

  /**
   * 其他扩展字段
   */
  [key: string]: unknown;
}

/**
 * 待处理的请求
 */
export interface PendingRequest {
  promise: Promise<unknown>;
  timestamp: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

