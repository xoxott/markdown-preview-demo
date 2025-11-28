/**
 * 性能监控工具
 */

/** 性能指标 */
export interface PerformanceMetrics {
  chunkUploadTimes: number[];
  networkRequestCount: number;
  totalUploadTime: number;
  averageChunkTime: number;
  memoryUsage?: {
    used: number;
    total: number;
  };
}

/** 性能分析报告 */
export interface PerformanceReport {
  metrics: PerformanceMetrics;
  bottlenecks: string[];
  recommendations: string[];
  timestamp: number;
}

/**
 * 性能监控器
 */
class PerformanceMonitor {
  private chunkUploadTimes: number[] = [];
  private networkRequestCount = 0;
  private startTime: number | null = null;
  private maxHistorySize = 1000;

  /**
   * 开始监控
   */
  start(): void {
    this.startTime = performance.now();
    this.chunkUploadTimes = [];
    this.networkRequestCount = 0;
  }

  /**
   * 记录分片上传时间
   */
  recordChunkUploadTime(time: number): void {
    this.chunkUploadTimes.push(time);
    
    // 限制历史记录大小
    if (this.chunkUploadTimes.length > this.maxHistorySize) {
      this.chunkUploadTimes.shift();
    }
  }

  /**
   * 记录网络请求
   */
  recordNetworkRequest(): void {
    this.networkRequestCount++;
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    const totalUploadTime = this.startTime
      ? performance.now() - this.startTime
      : 0;

    const averageChunkTime =
      this.chunkUploadTimes.length > 0
        ? this.chunkUploadTimes.reduce((sum, time) => sum + time, 0) / this.chunkUploadTimes.length
        : 0;

    // 尝试获取内存使用情况（如果支持）
    let memoryUsage: PerformanceMetrics['memoryUsage'] | undefined;
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      memoryUsage = {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize
      };
    }

    return {
      chunkUploadTimes: [...this.chunkUploadTimes],
      networkRequestCount: this.networkRequestCount,
      totalUploadTime,
      averageChunkTime,
      memoryUsage
    };
  }

  /**
   * 生成性能分析报告
   */
  generateReport(): PerformanceReport {
    const metrics = this.getMetrics();
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    // 分析瓶颈
    if (metrics.averageChunkTime > 5000) {
      bottlenecks.push('分片上传时间过长');
      recommendations.push('考虑减小分片大小或检查网络连接');
    }

    if (metrics.chunkUploadTimes.length > 0) {
      const maxTime = Math.max(...metrics.chunkUploadTimes);
      const minTime = Math.min(...metrics.chunkUploadTimes);
      const variance = maxTime - minTime;

      if (variance > 3000) {
        bottlenecks.push('上传时间波动较大');
        recommendations.push('网络可能不稳定，建议启用网络自适应');
      }
    }

    if (metrics.networkRequestCount > 100) {
      bottlenecks.push('网络请求次数过多');
      recommendations.push('考虑增加分片大小以减少请求次数');
    }

    if (metrics.memoryUsage) {
      const memoryUsagePercent = (metrics.memoryUsage.used / metrics.memoryUsage.total) * 100;
      if (memoryUsagePercent > 80) {
        bottlenecks.push('内存使用率过高');
        recommendations.push('考虑减少并发上传数量或启用内存优化');
      }
    }

    return {
      metrics,
      bottlenecks,
      recommendations,
      timestamp: Date.now()
    };
  }

  /**
   * 重置监控
   */
  reset(): void {
    this.startTime = null;
    this.chunkUploadTimes = [];
    this.networkRequestCount = 0;
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();

