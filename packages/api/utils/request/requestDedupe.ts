/**
 * 请求去重工具
 */

import { generateKey } from '../common/serialization';
import type { RequestConfig } from '../../types';

/**
 * 去重策略类型
 */
export type DedupeStrategy = 'exact' | 'ignore-params' | 'custom';

/**
 * 请求去重配置
 */
export interface RequestDedupeOptions {
  /** 去重时间窗口（毫秒），默认 1000ms */
  dedupeWindow?: number;
  /** 去重策略，默认 'exact' */
  strategy?: DedupeStrategy;
  /** 忽略的参数名列表（仅在 strategy 为 'ignore-params' 时有效） */
  ignoreParams?: string[];
  /** 自定义键生成函数（仅在 strategy 为 'custom' 时有效） */
  customKeyGenerator?: (config: RequestConfig) => string;
}

/**
 * 待处理的请求
 */
interface PendingRequest {
  promise: Promise<unknown>;
  timestamp: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * 请求去重管理器
 */
class RequestDedupeManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private dedupeWindow: number;
  private strategy: DedupeStrategy;
  private ignoreParams: string[];
  private customKeyGenerator?: (config: RequestConfig) => string;

  constructor(options: RequestDedupeOptions = {}) {
    this.dedupeWindow = options.dedupeWindow ?? 1000;
    this.strategy = options.strategy ?? 'exact';
    this.ignoreParams = options.ignoreParams ?? [];
    this.customKeyGenerator = options.customKeyGenerator;
  }

  /**
   * 生成请求唯一标识（精确匹配）
   */
  private generateExactKey(config: RequestConfig): string {
    const { url, method, params, data } = config;
    return generateKey(method || 'GET', url || '', params, data);
  }

  /**
   * 生成请求唯一标识（忽略参数）
   * 如果配置了 ignoreParams，则只忽略指定的参数；否则忽略所有参数
   */
  private generateIgnoreParamsKey(config: RequestConfig): string {
    const { url, method, params, data } = config;
    const methodUpper = (method || 'GET').toUpperCase();

    // 如果没有配置 ignoreParams，忽略所有参数
    if (this.ignoreParams.length === 0) {
      return `${methodUpper}_${url || ''}`;
    }

    // 过滤掉需要忽略的参数
    const filteredParams = this.filterIgnoredParams(params);
    const filteredData = this.filterIgnoredParams(data);

    // 使用过滤后的参数生成键
    return generateKey(methodUpper, url || '', filteredParams, filteredData);
  }

  /**
   * 过滤掉需要忽略的参数
   * @param obj 参数对象
   * @returns 过滤后的对象
   */
  private filterIgnoredParams(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }

    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // 如果参数名不在忽略列表中，保留该参数
      if (!this.ignoreParams.includes(key)) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * 生成请求唯一标识
   */
  private generateRequestKey(config: RequestConfig): string {
    if (this.customKeyGenerator) {
      return this.customKeyGenerator(config);
    }

    if (this.strategy === 'ignore-params') {
      return this.generateIgnoreParamsKey(config);
    }

    // 默认精确匹配
    return this.generateExactKey(config);
  }

  /**
   * 清理过期的请求
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.dedupeWindow) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * 检查请求是否在时间窗口内
   */
  private isWithinTimeWindow(timestamp: number): boolean {
    return Date.now() - timestamp < this.dedupeWindow;
  }

  /**
   * 处理请求成功
   * @param key 请求键
   * @param timestamp 请求时间戳
   * @param result 请求结果
   * @returns 请求结果
   */
  private handleRequestSuccess<T>(key: string, timestamp: number, result: T): T {
    // 请求完成后，延迟移除（避免立即重复请求）
    const timeoutId = setTimeout(() => {
      const currentRequest = this.pendingRequests.get(key);
      if (currentRequest && currentRequest.timestamp === timestamp) {
        this.pendingRequests.delete(key);
      }
    }, this.dedupeWindow);

    // 更新 Map 中的 timeoutId，确保可以清理
    const currentRequest = this.pendingRequests.get(key);
    if (currentRequest && currentRequest.timestamp === timestamp) {
      currentRequest.timeoutId = timeoutId;
    }

    return result;
  }

  /**
   * 处理请求失败
   * @param key 请求键
   * @param error 错误对象
   */
  private handleRequestFailure(key: string, error: unknown): never {
    // 请求失败，立即移除并清理定时器
    const currentRequest = this.pendingRequests.get(key);
    if (currentRequest?.timeoutId) {
      clearTimeout(currentRequest.timeoutId);
    }
    this.pendingRequests.delete(key);
    throw error;
  }

  /**
   * 获取或创建请求
   * @param config 请求配置
   * @param requestFn 请求函数
   * @returns Promise
   */
  getOrCreateRequest<T>(config: RequestConfig, requestFn: () => Promise<T>): Promise<T> {
    // 如果未启用去重，直接执行请求
    if (config.dedupe === false) {
      return requestFn();
    }

    // 清理过期请求
    this.cleanupExpiredRequests();

    // 生成请求唯一标识
    const key = this.generateRequestKey(config);

    // 检查是否有相同的请求正在进行
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest && this.isWithinTimeWindow(pendingRequest.timestamp)) {
      // 在时间窗口内，返回同一个 Promise
      return pendingRequest.promise as Promise<T>;
    }

    // 如果存在但已过期，先移除
    if (pendingRequest) {
      this.pendingRequests.delete(key);
    }

    // 创建新请求
    const timestamp = Date.now();
    const promise = requestFn()
      .then(result => this.handleRequestSuccess(key, timestamp, result))
      .catch(error => this.handleRequestFailure(key, error));

    // 保存请求（在创建后立即保存，确保第二次调用能找到）
    // timeoutId 初始为 undefined，成功后会在 .then() 中更新
    this.pendingRequests.set(key, {
      promise,
      timestamp,
      timeoutId: undefined,
    });

    return promise;
  }

  /**
   * 清除所有待处理的请求
   */
  clear(): void {
    // 清理所有定时器
    this.pendingRequests.forEach(request => {
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
    });
    this.pendingRequests.clear();
  }

  /**
   * 获取当前待处理的请求数量
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * 设置去重时间窗口
   */
  setDedupeWindow(window: number): void {
    this.dedupeWindow = window;
  }

  /**
   * 设置去重策略
   */
  setStrategy(strategy: DedupeStrategy): void {
    this.strategy = strategy;
  }

  /**
   * 设置忽略的参数列表
   */
  setIgnoreParams(params: string[]): void {
    this.ignoreParams = params;
  }

  /**
   * 设置自定义键生成函数
   */
  setCustomKeyGenerator(generator: (config: RequestConfig) => string): void {
    this.customKeyGenerator = generator;
  }
}

// 创建全局请求去重管理器实例
export const requestDedupeManager = new RequestDedupeManager();

/**
 * 配置请求去重选项
 */
export function configureRequestDedupe(options: RequestDedupeOptions): void {
  if (options.dedupeWindow !== undefined) {
    requestDedupeManager.setDedupeWindow(options.dedupeWindow);
  }
  if (options.strategy !== undefined) {
    requestDedupeManager.setStrategy(options.strategy);
  }
  if (options.ignoreParams !== undefined) {
    requestDedupeManager.setIgnoreParams(options.ignoreParams);
  }
  if (options.customKeyGenerator !== undefined) {
    requestDedupeManager.setCustomKeyGenerator(options.customKeyGenerator);
  }
}
