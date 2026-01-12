/**
 * 性能监控工具
 * 提供请求性能统计和监控功能
 */

import type { RequestConfig } from '../../types';

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
  urlStats: Record<
    string,
    {
      count: number;
      successCount: number;
      averageTime: number;
    }
  >;
}

/**
 * 性能监控器接口
 */
export interface PerformanceMonitor {
  /** 请求开始 */
  onRequestStart(config: RequestConfig): void;
  /** 请求成功 */
  onRequestSuccess(config: RequestConfig, duration: number): void;
  /** 请求失败 */
  onRequestError(config: RequestConfig, error: Error, duration: number): void;
  /** 获取性能指标 */
  getMetrics(): PerformanceMetrics;
  /** 重置统计 */
  reset(): void;
}

/**
 * URL 统计信息
 */
interface UrlStats {
  count: number;
  successCount: number;
  totalTime: number;
}

/**
 * 性能监控管理器
 */
class PerformanceMonitorManager implements PerformanceMonitor {
  private metrics: {
    totalRequests: number;
    successRequests: number;
    failedRequests: number;
    responseTimes: number[];
    urlStats: Map<string, UrlStats>;
  } = {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    urlStats: new Map(),
  };

  onRequestStart(_config: RequestConfig): void {
    this.metrics.totalRequests++;
  }

  onRequestSuccess(config: RequestConfig, duration: number): void {
    this.metrics.successRequests++;
    this.metrics.responseTimes.push(duration);
    this.updateUrlStats(config.url || '', duration, true);
  }

  onRequestError(config: RequestConfig, _error: Error, duration: number): void {
    this.metrics.failedRequests++;
    this.metrics.responseTimes.push(duration);
    this.updateUrlStats(config.url || '', duration, false);
  }

  private updateUrlStats(url: string, duration: number, success: boolean): void {
    const stats = this.metrics.urlStats.get(url) || { count: 0, successCount: 0, totalTime: 0 };
    stats.count++;
    stats.totalTime += duration;
    if (success) {
      stats.successCount++;
    }
    this.metrics.urlStats.set(url, stats);
  }

  getMetrics(): PerformanceMetrics {
    const responseTimes = this.metrics.responseTimes;
    const averageTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
    const minTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const successRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.successRequests / this.metrics.totalRequests) * 100
        : 0;

    const urlStats: Record<string, { count: number; successCount: number; averageTime: number }> =
      {};
    this.metrics.urlStats.forEach((stats, url) => {
      urlStats[url] = {
        count: stats.count,
        successCount: stats.successCount,
        averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
      };
    });

    return {
      totalRequests: this.metrics.totalRequests,
      successRequests: this.metrics.successRequests,
      failedRequests: this.metrics.failedRequests,
      averageResponseTime: averageTime,
      minResponseTime: minTime,
      maxResponseTime: maxTime,
      successRate,
      urlStats,
    };
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      urlStats: new Map(),
    };
  }
}

// 全局性能监控器实例
export const performanceMonitor = new PerformanceMonitorManager();
