/**
 * 请求去重管理器
 */

import type { DedupeOptions, PendingRequest } from '../types';
import { DEFAULT_DEDUPE_CONFIG } from '../constants';

/**
 * 请求去重管理器
 */
export class DedupeManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private dedupeWindow: number;

  constructor(options: DedupeOptions = {}) {
    this.dedupeWindow = options.dedupeWindow ?? DEFAULT_DEDUPE_CONFIG.DEFAULT_DEDUPE_WINDOW;
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
   * 通过键获取或创建请求（直接使用 ctx.id）
   */
  getOrCreateRequestByKey<T>(
    key: string,
    requestFn: () => Promise<T>,
  ): Promise<T> {
    // 清理过期请求
    this.cleanupExpiredRequests();

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
}

