/**
 * 请求取消工具
 */

import type { CancelTokenSource } from 'axios';
import axios from 'axios';
import { generateKey } from '../common/serialization';
import { internalWarn } from '../common/internalLogger';
import type { RequestConfig } from '../../types';

/**
 * 请求取消Token管理器
 */
class CancelTokenManager {
  private cancelTokenMap = new Map<string, CancelTokenSource>();
  private requestConfigMap = new Map<string, RequestConfig>();

  /**
   * 创建取消Token
   * @param requestId 请求标识
   * @param config 请求配置（可选，用于按条件取消）
   * @returns CancelTokenSource
   */
  createCancelToken(requestId: string, config?: RequestConfig): CancelTokenSource {
    // 如果已存在，先取消之前的请求
    this.cancel(requestId);

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
      source.cancel(message || '请求已取消');
      this.cancelTokenMap.delete(requestId);
      this.requestConfigMap.delete(requestId);
    }
  }

  /**
   * 取消所有请求
   * @param message 取消原因
   */
  cancelAll(message?: string): void {
    const cancelMessage = message || '请求已取消';
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
  cancelBy(predicate: (config: RequestConfig) => boolean, message?: string): number {
    const cancelMessage = message || '请求已取消';
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
}

export const cancelTokenManager = new CancelTokenManager();

/**
 * 生成请求ID
 * @param url 请求URL
 * @param method 请求方法
 * @param params 请求参数
 * @returns 请求ID
 */
export function generateRequestId(url: string, method: string, params?: unknown): string {
  return generateKey(method, url, params);
}

