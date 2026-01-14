/**
 * 请求取消Token管理器
 */

import axios from 'axios';
import type { CancelTokenSource } from 'axios';
import type { CancelableRequestConfig, CancelTokenManagerOptions } from '../types';
import { DEFAULT_CANCEL_MESSAGE } from '../constants';

/**
 * 内部日志工具
 */
function internalWarn(message: string, ...args: unknown[]): void {
  console.warn(`[request-cancel] ${message}`, ...args);
}

/**
 * 请求取消Token管理器
 */
export class CancelTokenManager {
  private cancelTokenMap = new Map<string, CancelTokenSource>();
  private requestConfigMap = new Map<string, CancelableRequestConfig>();
  private options: Required<CancelTokenManagerOptions>;

  constructor(options: CancelTokenManagerOptions = {}) {
    this.options = {
      autoCancelPrevious: options.autoCancelPrevious ?? true,
      defaultCancelMessage: options.defaultCancelMessage ?? DEFAULT_CANCEL_MESSAGE,
    };
  }

  /**
   * 创建取消Token
   * @param requestId 请求标识
   * @param config 请求配置（可选，用于按条件取消）
   * @returns CancelTokenSource
   */
  createCancelToken(
    requestId: string,
    config?: CancelableRequestConfig,
  ): CancelTokenSource {
    // 如果启用了自动取消，且已存在相同 requestId 的请求，先取消之前的请求
    if (this.options.autoCancelPrevious) {
      this.cancel(requestId);
    }

    const source = axios.CancelToken.source();
    this.cancelTokenMap.set(requestId, source);
    if (config) {
      this.requestConfigMap.set(requestId, config);
    }
    return source;
  }

  /**
   * 取消请求
   * @param requestId 请求标识
   * @param message 取消原因
   */
  cancel(requestId: string, message?: string): void {
    const source = this.cancelTokenMap.get(requestId);
    if (source) {
      source.cancel(message || this.options.defaultCancelMessage);
      this.cancelTokenMap.delete(requestId);
      this.requestConfigMap.delete(requestId);
    }
  }

  /**
   * 取消所有请求
   * @param message 取消原因
   */
  cancelAll(message?: string): void {
    const cancelMessage = message || this.options.defaultCancelMessage;
    this.cancelTokenMap.forEach(source => {
      try {
        source.cancel(cancelMessage);
      } catch (error) {
        if (!axios.isCancel(error)) {
          internalWarn('取消请求时出错:', error);
        }
      }
    });
    this.cancelTokenMap.clear();
    this.requestConfigMap.clear();
  }

  /**
   * 移除取消Token（请求完成后调用）
   * @param requestId 请求标识
   */
  remove(requestId: string): void {
    this.cancelTokenMap.delete(requestId);
    this.requestConfigMap.delete(requestId);
  }

  /**
   * 按条件取消请求
   * @param predicate 取消条件函数
   * @param message 取消原因
   * @returns 取消的请求数量
   */
  cancelBy(
    predicate: (config: CancelableRequestConfig) => boolean,
    message?: string,
  ): number {
    const cancelMessage = message || this.options.defaultCancelMessage;
    let cancelledCount = 0;

    const requestIdsToCancel: string[] = [];

    // 遍历所有请求配置，找出匹配的请求
    this.requestConfigMap.forEach((config, requestId) => {
      if (predicate(config)) {
        requestIdsToCancel.push(requestId);
      }
    });

    // 取消匹配的请求
    requestIdsToCancel.forEach(requestId => {
      this.cancel(requestId, cancelMessage);
      cancelledCount++;
    });

    return cancelledCount;
  }

  /**
   * 获取取消Token
   * @param requestId 请求标识
   * @returns CancelTokenSource | undefined
   */
  get(requestId: string): CancelTokenSource | undefined {
    return this.cancelTokenMap.get(requestId);
  }

  /**
   * 检查请求是否存在
   * @param requestId 请求标识
   * @returns 是否存在
   */
  has(requestId: string): boolean {
    return this.cancelTokenMap.has(requestId);
  }

  /**
   * 获取当前待取消的请求数量
   * @returns 请求数量
   */
  getPendingCount(): number {
    return this.cancelTokenMap.size;
  }

  /**
   * 清除所有请求记录（不取消请求）
   */
  clear(): void {
    this.cancelTokenMap.clear();
    this.requestConfigMap.clear();
  }
}

