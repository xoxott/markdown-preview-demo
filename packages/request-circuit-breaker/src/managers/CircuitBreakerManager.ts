/**
 * 熔断器管理器
 */

import type { CircuitBreakerOptions } from '../types';
import { CircuitBreaker } from '../core/CircuitBreaker';

/**
 * 熔断器管理器
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker<unknown>>();

  /**
   * 获取或创建熔断器
   */
  getOrCreateBreaker<T = unknown>(
    key: string,
    options: CircuitBreakerOptions<T> = {},
  ): CircuitBreaker<T> {
    const existingBreaker = this.breakers.get(key);
    if (existingBreaker) {
      return existingBreaker as CircuitBreaker<T>;
    }

    const newBreaker = new CircuitBreaker(options);
    this.breakers.set(key, newBreaker);
    return newBreaker;
  }

  /**
   * 移除指定的熔断器
   */
  removeBreaker(key: string): void {
    this.breakers.delete(key);
  }

  /**
   * 清除所有熔断器
   */
  clear(): void {
    this.breakers.clear();
  }

  /**
   * 获取所有熔断器
   */
  getAllBreakers(): ReadonlyMap<string, CircuitBreaker<unknown>> {
    return new Map(this.breakers);
  }
}

