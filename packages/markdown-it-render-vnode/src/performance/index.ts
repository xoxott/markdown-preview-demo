/**
 * 性能监控模块
 *
 * @module performance
 */

import type { MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import type { FrameworkNode } from '../adapters/types';
import { PERFORMANCE_MONITOR_CONFIG } from '../constants';

/** 性能指标 */
export interface PerformanceMetrics {
  /** 渲染时间（毫秒） */
  renderTime: number;
  /** Token 数量 */
  tokenCount: number;
  /** 生成的 VNode 数量 */
  vnodeCount: number;
  /** 是否超过阈值 */
  isSlow: boolean;
}

/** 性能监控回调 */
export type PerformanceCallback = (metrics: PerformanceMetrics) => void;

/** 当前性能监控回调 */
let performanceCallback: PerformanceCallback | null = null;

/**
 * 设置性能监控回调
 *
 * @param callback - 回调函数
 */
export function setPerformanceCallback(callback: PerformanceCallback | null): void {
  performanceCallback = callback;
}

/**
 * 创建性能监控包装器（开发模式）
 *
 * @param originalRender - 原始渲染函数
 * @returns 包装后的渲染函数
 */
export function createPerformanceMonitor(
  originalRender: (this: MarkdownRenderer, tokens: Token[], options: RenderOptions, env: RenderEnv) => FrameworkNode[]
): (this: MarkdownRenderer, tokens: Token[], options: RenderOptions, env: RenderEnv) => FrameworkNode[] {
  return function (this: MarkdownRenderer, tokens: Token[], options: RenderOptions, env: RenderEnv): FrameworkNode[] {
    const start = performance.now();
    const result = originalRender.call(this, tokens, options, env);
    const duration = performance.now() - start;

    const metrics: PerformanceMetrics = {
      renderTime: duration,
      tokenCount: tokens.length,
      vnodeCount: result.length,
      isSlow: duration > PERFORMANCE_MONITOR_CONFIG.THRESHOLD
    };

    // 如果超过阈值，输出警告
    if (metrics.isSlow) {
      console.warn(
        `[Markdown Renderer] Slow render detected: ${duration.toFixed(2)}ms (${tokens.length} tokens → ${result.length} vnodes)`
      );
    }

    // 调用性能监控回调
    if (performanceCallback) {
      try {
        performanceCallback(metrics);
      } catch (error) {
        console.error('[Markdown Renderer] Performance callback error:', error);
      }
    }

    return result;
  };
}

