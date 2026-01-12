/**
 * 请求熔断器
 * 实现熔断器模式，在服务异常时自动降级或熔断
 */

import type { AxiosError } from 'axios';

/**
 * 熔断器状态
 */
export enum CircuitBreakerState {
  /** 关闭状态：正常处理请求 */
  CLOSED = 'closed',
  /** 开启状态：拒绝请求，直接返回降级数据 */
  OPEN = 'open',
  /** 半开状态：尝试恢复，允许少量请求通过 */
  HALF_OPEN = 'half-open',
}

/**
 * 熔断器配置
 */
export interface CircuitBreakerOptions {
  /** 失败阈值：连续失败多少次后开启熔断 */
  failureThreshold?: number;
  /** 超时时间：熔断开启后多久进入半开状态（毫秒） */
  timeout?: number;
  /** 降级函数：熔断时返回的数据 */
  fallback?: () => unknown | Promise<unknown>;
  /** 成功阈值：半开状态下成功多少次后关闭熔断 */
  successThreshold?: number;
  /** 是否启用熔断器 */
  enabled?: boolean;
}

/**
 * 熔断器统计信息
 */
interface CircuitBreakerStats {
  /** 失败次数 */
  failures: number;
  /** 成功次数（半开状态下） */
  successes: number;
  /** 最后失败时间 */
  lastFailureTime: number | null;
  /** 当前状态 */
  state: CircuitBreakerState;
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<Omit<CircuitBreakerOptions, 'fallback'>> & {
  fallback?: () => unknown;
} = {
  failureThreshold: 5,
  timeout: 60000, // 60 秒
  successThreshold: 2,
  enabled: true,
};

/**
 * 熔断器类
 */
export class CircuitBreaker {
  private options: Required<Omit<CircuitBreakerOptions, 'fallback'>> & { fallback?: () => unknown };
  private stats: CircuitBreakerStats;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    this.stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      state: CircuitBreakerState.CLOSED,
    };
  }

  /**
   * 更新配置
   */
  updateOptions(options: Partial<CircuitBreakerOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  /**
   * 执行请求（带熔断保护）
   * @param requestFn 请求执行函数
   * @returns Promise
   */
  async execute<T>(requestFn: () => Promise<T>): Promise<T> {
    // 如果未启用，直接执行
    if (!this.options.enabled) {
      return requestFn();
    }

    // 检查当前状态
    this.checkState();

    // 如果处于开启状态，返回降级数据
    if (this.stats.state === CircuitBreakerState.OPEN) {
      if (this.options.fallback) {
        return this.options.fallback() as Promise<T>;
      }
      throw new Error('熔断器已开启，请求被拒绝');
    }

    try {
      // 执行请求
      const result = await requestFn();

      // 请求成功，记录成功
      this.onSuccess();

      return result;
    } catch (error) {
      // 请求失败，记录失败
      this.onFailure(error as AxiosError);

      // 重新抛出错误
      throw error;
    }
  }

  /**
   * 检查并更新状态
   */
  private checkState(): void {
    const now = Date.now();

    // 如果处于开启状态，检查是否应该进入半开状态
    if (this.stats.state === CircuitBreakerState.OPEN) {
      if (this.stats.lastFailureTime && now - this.stats.lastFailureTime >= this.options.timeout) {
        // 超时后进入半开状态
        this.stats.state = CircuitBreakerState.HALF_OPEN;
        this.stats.successes = 0;
      }
      return;
    }

    // 如果处于半开状态，检查是否应该关闭
    if (this.stats.state === CircuitBreakerState.HALF_OPEN) {
      if (this.stats.successes >= this.options.successThreshold) {
        // 成功次数达到阈值，关闭熔断器
        this.stats.state = CircuitBreakerState.CLOSED;
        this.stats.failures = 0;
        this.stats.successes = 0;
      }
      return;
    }

    // 如果处于关闭状态，检查是否应该开启
    if (this.stats.state === CircuitBreakerState.CLOSED) {
      if (this.stats.failures >= this.options.failureThreshold) {
        // 失败次数达到阈值，开启熔断器
        this.stats.state = CircuitBreakerState.OPEN;
        this.stats.lastFailureTime = now;
      }
    }
  }

  /**
   * 处理成功
   */
  private onSuccess(): void {
    if (this.stats.state === CircuitBreakerState.HALF_OPEN) {
      // 半开状态下，增加成功次数
      this.stats.successes++;
    } else if (this.stats.state === CircuitBreakerState.CLOSED) {
      // 关闭状态下，重置失败次数
      this.stats.failures = 0;
    }
  }

  /**
   * 处理失败
   */
  private onFailure(error: AxiosError): void {
    // 只统计服务器错误和网络错误
    const isServerError = error.response?.status && error.response.status >= 500;
    const isNetworkError = !error.response;

    if (isServerError || isNetworkError) {
      this.stats.failures++;
      this.stats.lastFailureTime = Date.now();

      // 如果处于半开状态，失败后重新开启
      if (this.stats.state === CircuitBreakerState.HALF_OPEN) {
        this.stats.state = CircuitBreakerState.OPEN;
        this.stats.successes = 0;
      }
    }
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitBreakerState {
    this.checkState();
    return this.stats.state;
  }

  /**
   * 获取统计信息
   */
  getStats(): Readonly<CircuitBreakerStats> {
    return { ...this.stats };
  }

  /**
   * 重置熔断器
   */
  reset(): void {
    this.stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      state: CircuitBreakerState.CLOSED,
    };
  }
}

/**
 * 创建熔断器
 */
export function createCircuitBreaker(options: CircuitBreakerOptions = {}): CircuitBreaker {
  return new CircuitBreaker(options);
}

/**
 * 全局熔断器管理器（按 URL 模式管理）
 */
class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * 获取或创建熔断器
   */
  getOrCreateBreaker(key: string, options: CircuitBreakerOptions = {}): CircuitBreaker {
    if (!this.breakers.has(key)) {
      this.breakers.set(key, createCircuitBreaker(options));
    }
    return this.breakers.get(key)!;
  }

  /**
   * 移除熔断器
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
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }
}

/**
 * 全局熔断器管理器实例
 */
export const circuitBreakerManager = new CircuitBreakerManager();
