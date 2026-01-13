/**
 * @suga/request-performance
 * Request performance monitoring for @suga/request-core
 */

import { PerformanceMonitorManager } from './PerformanceMonitor';

// 导出性能监控器
export { PerformanceMonitorManager } from './PerformanceMonitor';

// 导出类型
export type * from './types';

// 创建全局性能监控器实例
export const performanceMonitor = new PerformanceMonitorManager();

