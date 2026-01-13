/**
 * 执行守卫
 */

import { CircuitBreakerState } from '../types';
import { Metrics } from './Metrics';

/**
 * 执行守卫类
 */
export class ExecutionGuard<T> {
  constructor(
    private metrics: Metrics,
    private fallback?: (error?: unknown) => T | Promise<T>,
  ) {}

  async checkExecution(): Promise<T | null> {
    const snapshot = this.metrics.getSnapshot();

    if (snapshot.state === CircuitBreakerState.OPEN) {
      if (this.fallback) {
        return await this.fallback();
      }
      throw new Error('熔断器已开启，请求被拒绝');
    }

    return null;
  }
}

