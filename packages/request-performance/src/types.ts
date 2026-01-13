/**
 * 性能监控类型定义
 */

import type { NormalizedRequestConfig } from '@suga/request-core';

/**
 * URL 统计信息
 */
export interface UrlStats {
  /** 请求总数 */
  count: number;
  /** 成功请求数 */
  successCount: number;
  /** 平均响应时间（毫秒） */
  averageTime: number;
}

/**
 * 性能监控指标
 */
export interface PerformanceMetrics {
  /** 请求总数 */
  totalRequests: number;
  /** 成功请求数 */
  successRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 平均响应时间（毫秒） */
  averageResponseTime: number;
  /** 最小响应时间（毫秒） */
  minResponseTime: number;
  /** 最大响应时间（毫秒） */
  maxResponseTime: number;
  /** 成功率（百分比） */
  successRate: number;
  /** 按 URL 分组的统计 */
  urlStats: Record<string, UrlStats>;
}

/**
 * 性能监控器接口
 */
export interface PerformanceMonitor {
  /** 请求开始 */
  onRequestStart(config: NormalizedRequestConfig): void;
  /** 请求成功 */
  onRequestSuccess(config: NormalizedRequestConfig, duration: number): void;
  /** 请求失败 */
  onRequestError(config: NormalizedRequestConfig, error: unknown, duration: number): void;
  /** 获取性能指标 */
  getMetrics(): PerformanceMetrics;
  /** 重置统计 */
  reset(): void;
}

