/**
 * 超时策略管理模块
 */

import type { RequestConfig } from '../types';
import type { TimeoutStrategy } from './types';
import { DEFAULT_TIMEOUT_STRATEGY } from '../constants';

/**
 * 超时策略管理器
 */
export class TimeoutManager {
  private strategy: TimeoutStrategy;

  constructor(strategy: TimeoutStrategy) {
    this.strategy = strategy;
  }

  /**
   * 设置超时策略
   * @param strategy 超时策略配置
   */
  setTimeoutStrategy(strategy: Partial<TimeoutStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
  }

  /**
   * 根据配置获取超时时间
   * @param config 请求配置
   * @returns 超时时间（毫秒）
   */
  getTimeout(config: RequestConfig): number {
    // 1. 优先使用请求配置中的 timeout
    if (config.timeout !== undefined) {
      return config.timeout;
    }

    // 2. 根据 URL 模式匹配
    if (config.url && this.strategy.byUrlPattern?.length) {
      const matchedPattern = this.strategy.byUrlPattern.find(({ pattern }) =>
        pattern.test(config.url!),
      );
      if (matchedPattern) {
        return matchedPattern.timeout;
      }
    }

    // 3. 根据请求方法匹配
    const method = (config.method || 'GET').toUpperCase();
    const methodTimeout = this.strategy.byMethod?.[method];
    if (methodTimeout !== undefined) {
      return methodTimeout;
    }

    // 4. 使用默认超时时间
    return this.strategy.default;
  }

  /**
   * 创建默认超时策略
   * @param timeout 默认超时时间
   * @param customStrategy 自定义策略
   * @returns 超时策略
   */
  static createDefaultStrategy(
    timeout: number,
    customStrategy?: Partial<TimeoutStrategy>,
  ): TimeoutStrategy {
    return {
      default: timeout,
      byMethod: customStrategy?.byMethod || {
        GET: DEFAULT_TIMEOUT_STRATEGY.GET_TIMEOUT,
        POST: DEFAULT_TIMEOUT_STRATEGY.POST_TIMEOUT,
        PUT: DEFAULT_TIMEOUT_STRATEGY.PUT_TIMEOUT,
        PATCH: DEFAULT_TIMEOUT_STRATEGY.PATCH_TIMEOUT,
        DELETE: DEFAULT_TIMEOUT_STRATEGY.DELETE_TIMEOUT,
      },
      byUrlPattern: customStrategy?.byUrlPattern || [],
      retryOnTimeout: customStrategy?.retryOnTimeout ?? false,
    };
  }
}
