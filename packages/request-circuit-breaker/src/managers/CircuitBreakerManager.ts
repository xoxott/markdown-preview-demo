/**
 * 熔断器管理器
 */

import type { CircuitBreakerOptions, CircuitBreakerState } from '../types';
import { CircuitBreaker } from '../core/CircuitBreaker';
import { CircuitBreakerState as CBState } from '../types';
import { DEFAULT_CIRCUIT_BREAKER_MANAGER_CONFIG } from '../constants';

/**
 * 熔断器管理器选项
 */
export interface CircuitBreakerManagerOptions {
  /** 清理不活跃熔断器的间隔时间（毫秒），默认 5 分钟 */
  cleanupInterval?: number;
  /** 熔断器最大数量，超过后清理最旧的，默认无限制 */
  maxSize?: number;
  /** 熔断器空闲超时时间（毫秒），超过此时间未使用且处于 CLOSED 状态的熔断器会被清理，默认 30 分钟 */
  idleTimeout?: number;
}

/**
 * 熔断器条目（包含熔断器和元数据）
 */
interface BreakerEntry {
  breaker: CircuitBreaker<unknown>;
  lastAccessTime: number;
  createdAt: number;
}

/**
 * 熔断器管理器
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, BreakerEntry>();
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private readonly cleanupInterval: number;
  private readonly maxSize: number;
  private readonly idleTimeout: number;

  constructor(options: CircuitBreakerManagerOptions = {}) {
    this.cleanupInterval =
      options.cleanupInterval ?? DEFAULT_CIRCUIT_BREAKER_MANAGER_CONFIG.DEFAULT_CLEANUP_INTERVAL;
    this.maxSize = options.maxSize ?? DEFAULT_CIRCUIT_BREAKER_MANAGER_CONFIG.DEFAULT_MAX_SIZE;
    this.idleTimeout =
      options.idleTimeout ?? DEFAULT_CIRCUIT_BREAKER_MANAGER_CONFIG.DEFAULT_IDLE_TIMEOUT;

    // 启动定期清理
    if (this.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.cleanupInterval);
    }
  }

  /**
   * 获取或创建熔断器
   */
  getOrCreateBreaker<T = unknown>(
    key: string,
    options: CircuitBreakerOptions<T> = {},
  ): CircuitBreaker<T> {
    const now = Date.now();
    const existingEntry = this.breakers.get(key);

    if (existingEntry) {
      // 更新最后访问时间
      existingEntry.lastAccessTime = now;
      return existingEntry.breaker as CircuitBreaker<T>;
    }

    // 检查是否需要清理空间
    if (this.maxSize > 0 && this.breakers.size >= this.maxSize) {
      this.cleanupOldest();
    }

    // 创建新的熔断器
    const newBreaker = new CircuitBreaker(options);
    this.breakers.set(key, {
      breaker: newBreaker,
      lastAccessTime: now,
      createdAt: now,
    });

    return newBreaker as CircuitBreaker<T>;
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
    const result = new Map<string, CircuitBreaker<unknown>>();
    for (const [key, entry] of this.breakers.entries()) {
      result.set(key, entry.breaker);
    }
    return result;
  }

  /**
   * 清理不活跃的熔断器
   * 清理条件：处于 CLOSED 状态且超过空闲超时时间
   * @returns 清理的熔断器数量
   */
  cleanup(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.breakers.entries()) {
      const state = entry.breaker.getState();
      const idleTime = now - entry.lastAccessTime;

      // 清理条件：处于 CLOSED 状态且超过空闲超时时间
      if (state === CBState.CLOSED && idleTime > this.idleTimeout) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.breakers.delete(key);
    }

    return keysToDelete.length;
  }

  /**
   * 清理最旧的熔断器（用于达到最大数量限制时）
   */
  private cleanupOldest(): void {
    if (this.breakers.size === 0) {
      return;
    }

    // 找到最旧的条目（按创建时间）
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.breakers.entries()) {
      // 优先清理 CLOSED 状态的熔断器
      const state = entry.breaker.getState();
      if (state === CBState.CLOSED && entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    // 如果找不到 CLOSED 状态的，清理最旧的（任意状态）
    if (!oldestKey) {
      for (const [key, entry] of this.breakers.entries()) {
        if (entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt;
          oldestKey = key;
        }
      }
    }

    if (oldestKey) {
      this.breakers.delete(oldestKey);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    byState: Record<CircuitBreakerState, number>;
  } {
    const byState: Record<CircuitBreakerState, number> = {
      [CBState.CLOSED]: 0,
      [CBState.OPEN]: 0,
      [CBState.HALF_OPEN]: 0,
    };

    for (const entry of this.breakers.values()) {
      const state = entry.breaker.getState();
      byState[state] = (byState[state] || 0) + 1;
    }

    return {
      total: this.breakers.size,
      byState,
    };
  }

  /**
   * 停止定期清理（通常在应用关闭时调用）
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
}

