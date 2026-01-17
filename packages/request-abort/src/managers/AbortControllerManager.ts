/**
 * AbortController 管理器
 * 使用原生 AbortController 替代废弃的 axios.CancelToken
 */

import type { CancelableRequestConfig, AbortControllerManagerOptions } from '../types';
import { DEFAULT_CANCEL_MESSAGE } from '../constants';

/**
 * 内部日志工具
 */
function internalWarn(message: string, ...args: unknown[]): void {
  console.warn(`[request-abort] ${message}`, ...args);
}

/**
 * AbortController 封装，包含取消消息
 */
interface AbortControllerWithMessage {
  controller: AbortController;
  message: string;
}

/**
 * AbortController 管理器
 */
export class AbortControllerManager {
  private controllerMap = new Map<string, AbortControllerWithMessage>();
  private requestConfigMap = new Map<string, CancelableRequestConfig>();
  private options: Required<AbortControllerManagerOptions>;

  constructor(options: AbortControllerManagerOptions = {}) {
    this.options = {
      autoCancelPrevious: options.autoCancelPrevious ?? true,
      defaultCancelMessage: options.defaultCancelMessage ?? DEFAULT_CANCEL_MESSAGE,
    };
  }

  /**
   * 创建 AbortController
   * @param requestId 请求标识
   * @param config 请求配置（可选，用于按条件取消）
   * @returns AbortController
   */
  createAbortController(
    requestId: string,
    config?: CancelableRequestConfig,
  ): AbortController {
    // 如果启用了自动取消，且已存在相同 requestId 的请求，先取消之前的请求
    if (this.options.autoCancelPrevious) {
      this.cancel(requestId);
    }

    const controller = new AbortController();
    this.controllerMap.set(requestId, {
      controller,
      message: this.options.defaultCancelMessage,
    });
    if (config) {
      this.requestConfigMap.set(requestId, config);
    }
    return controller;
  }

  /**
   * 取消请求
   * @param requestId 请求标识
   * @param message 取消原因（注意：AbortController 不支持自定义消息，消息仅用于日志）
   */
  cancel(requestId: string, message?: string): void {
    const entry = this.controllerMap.get(requestId);
    if (entry) {
      try {
        entry.controller.abort(message || entry.message);
        if (message) {
          // 更新取消消息（虽然 AbortController 不支持，但我们存储用于日志）
          entry.message = message;
        }
      } catch (error) {
        // AbortController.abort() 如果已取消会抛出错误，忽略即可
        internalWarn('取消请求时出错:', error);
      }
      this.controllerMap.delete(requestId);
      this.requestConfigMap.delete(requestId);
    }
  }

  /**
   * 取消所有请求
   * @param message 取消原因（注意：AbortController 不支持自定义消息，消息仅用于日志）
   */
  cancelAll(message?: string): void {
    const cancelMessage = message || this.options.defaultCancelMessage;
    this.controllerMap.forEach(entry => {
      try {
        entry.controller.abort(cancelMessage);
        if (message) {
          entry.message = cancelMessage;
        }
      } catch (error) {
        // AbortController.abort() 如果已取消会抛出错误，忽略即可
        internalWarn('取消请求时出错:', error);
      }
    });
    this.controllerMap.clear();
    this.requestConfigMap.clear();
  }

  /**
   * 移除 AbortController（请求完成后调用）
   * @param requestId 请求标识
   */
  remove(requestId: string): void {
    this.controllerMap.delete(requestId);
    this.requestConfigMap.delete(requestId);
  }

  /**
   * 按条件取消请求
   * @param predicate 取消条件函数
   * @param message 取消原因（注意：AbortController 不支持自定义消息，消息仅用于日志）
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
   * 获取 AbortController
   * @param requestId 请求标识
   * @returns AbortController | undefined
   */
  get(requestId: string): AbortController | undefined {
    return this.controllerMap.get(requestId)?.controller;
  }

  /**
   * 检查请求是否存在
   * @param requestId 请求标识
   * @returns 是否存在
   */
  has(requestId: string): boolean {
    return this.controllerMap.has(requestId);
  }

  /**
   * 获取当前待取消的请求数量
   * @returns 请求数量
   */
  getPendingCount(): number {
    return this.controllerMap.size;
  }

  /**
   * 清除所有请求记录（不取消请求）
   */
  clear(): void {
    this.controllerMap.clear();
    this.requestConfigMap.clear();
  }
}

