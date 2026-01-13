/**
 * 事件管理工具
 */

import type { RequestConfig } from '../../types';
import type { AxiosError, AxiosResponse } from 'axios';
import type { ErrorResponse } from '../../types';

/**
 * 请求开始事件数据
 */
export interface RequestStartEventData {
  config: RequestConfig;
  timestamp: number;
}

/**
 * 请求成功事件数据
 */
export interface RequestSuccessEventData {
  config: RequestConfig;
  response: AxiosResponse;
  timestamp: number;
  duration: number;
}

/**
 * 请求错误事件数据
 */
export interface RequestErrorEventData {
  config: RequestConfig;
  error: AxiosError<ErrorResponse>;
  errorResponse?: ErrorResponse;
  timestamp: number;
  duration: number;
}

/**
 * 请求完成事件数据
 */
export interface RequestCompleteEventData {
  config: RequestConfig;
  timestamp: number;
  duration: number;
  success: boolean;
}

/**
 * 事件管理器
 */
class EventManager {
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * 监听事件
   */
  on(event: 'request:start', handler: (data: RequestStartEventData) => void): void;
  on(event: 'request:success', handler: (data: RequestSuccessEventData) => void): void;
  on(event: 'request:error', handler: (data: RequestErrorEventData) => void): void;
  on(event: 'request:complete', handler: (data: RequestCompleteEventData) => void): void;
  on(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * 取消监听事件
   */
  off(event: string, handler: Function): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * 触发事件
   */
  emit(event: 'request:start', data: RequestStartEventData): void;
  emit(event: 'request:success', data: RequestSuccessEventData): void;
  emit(event: 'request:error', data: RequestErrorEventData): void;
  emit(event: 'request:complete', data: RequestCompleteEventData): void;
  emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[EventManager] Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear();
  }
}

export const eventManager = new EventManager();

