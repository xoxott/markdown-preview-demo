/**
 * 性能监控器
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import type { PerformanceMetrics, PerformanceMonitor, UrlStats } from './types';

/**
 * URL 统计信息（内部）
 */
interface InternalUrlStats {
  count: number;
  successCount: number;
  totalTime: number;
}

/**
 * 性能监控管理器
 */
export class PerformanceMonitorManager implements PerformanceMonitor {
  private metrics: {
    totalRequests: number;
    successRequests: number;
    failedRequests: number;
    responseTimes: number[];
    urlStats: Map<string, InternalUrlStats>;
  } = {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    urlStats: new Map(),
  };

  onRequestStart(_config: NormalizedRequestConfig): void {
    this.metrics.totalRequests++;
  }

  onRequestSuccess(config: NormalizedRequestConfig, duration: number): void {
    this.metrics.successRequests++;
    this.metrics.responseTimes.push(duration);
    this.updateUrlStats(config.url || '', duration, true);
  }

  onRequestError(config: NormalizedRequestConfig, _error: unknown, duration: number): void {
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

    const urlStats: Record<string, UrlStats> = {};
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

