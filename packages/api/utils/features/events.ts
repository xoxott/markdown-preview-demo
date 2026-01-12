/**
 * 事件系统
 * 支持监听请求生命周期事件，提供更好的扩展性
 */

import type { RequestConfig } from '../../types';
import type { AxiosResponse, AxiosError } from 'axios';
import type { ErrorResponse } from '../../types';
import { performanceMonitor } from './performance';
import { internalError } from '../common/internalLogger';

/**
 * 请求事件类型
 */
export type RequestEventType =
  | 'request:start'
  | 'request:success'
  | 'request:error'
  | 'request:complete';

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
export interface RequestSuccessEventData<T = unknown> {
  config: RequestConfig;
  response: AxiosResponse<T>;
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
 * 请求完成事件数据（成功或失败）
 */
export interface RequestCompleteEventData {
  config: RequestConfig;
  timestamp: number;
  duration: number;
  success: boolean;
}

/**
 * 事件处理器类型
 */
export type RequestEventHandler<T extends RequestEventType> = T extends 'request:start'
  ? (data: RequestStartEventData) => void
  : T extends 'request:success'
    ? <T = unknown>(data: RequestSuccessEventData<T>) => void
    : T extends 'request:error'
      ? (data: RequestErrorEventData) => void
      : T extends 'request:complete'
        ? (data: RequestCompleteEventData) => void
        : never;

/**
 * 事件处理器类型（统一类型）
 */
type EventHandler = (data: unknown) => void;

/**
 * 事件管理器
 */
class EventManager {
  private eventListeners = new Map<RequestEventType, Set<EventHandler>>();

  /**
   * 监听事件
   */
  on<T extends RequestEventType>(event: T, handler: RequestEventHandler<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler as EventHandler);
  }

  /**
   * 取消监听事件
   */
  off<T extends RequestEventType>(event: T, handler: RequestEventHandler<T>): void {
    this.eventListeners.get(event)?.delete(handler as EventHandler);
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners(event?: RequestEventType): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  /**
   * 触发事件
   */
  emit<T extends RequestEventType>(
    event: T,
    data: T extends 'request:start'
      ? RequestStartEventData
      : T extends 'request:success'
        ? RequestSuccessEventData
        : T extends 'request:error'
          ? RequestErrorEventData
          : T extends 'request:complete'
            ? RequestCompleteEventData
            : never,
  ): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) {
      return;
    }

    listeners.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        internalError(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: RequestEventType): number {
    return this.eventListeners.get(event)?.size ?? 0;
  }

  /**
   * 获取所有事件类型
   */
  eventNames(): RequestEventType[] {
    return Array.from(this.eventListeners.keys());
  }
}

// 创建全局事件管理器实例
export const eventManager = new EventManager();

/**
 * 监听请求开始事件
 */
export function onRequestStart(handler: RequestEventHandler<'request:start'>): void {
  eventManager.on('request:start', handler);
}

// 自动集成性能监控
onRequestStart(data => {
  performanceMonitor.onRequestStart(data.config);
});

/**
 * 监听请求成功事件
 */
export function onRequestSuccess(handler: RequestEventHandler<'request:success'>): void {
  eventManager.on('request:success', handler);
}

// 自动集成性能监控
onRequestSuccess(data => {
  performanceMonitor.onRequestSuccess(data.config, data.duration);
});

/**
 * 监听请求错误事件
 */
export function onRequestError(handler: RequestEventHandler<'request:error'>): void {
  eventManager.on('request:error', handler);
}

// 自动集成性能监控
onRequestError(data => {
  performanceMonitor.onRequestError(data.config, data.error, data.duration);
});

/**
 * 监听请求完成事件
 */
export function onRequestComplete(handler: RequestEventHandler<'request:complete'>): void {
  eventManager.on('request:complete', handler);
}

/**
 * 取消监听请求开始事件
 */
export function offRequestStart(handler: RequestEventHandler<'request:start'>): void {
  eventManager.off('request:start', handler);
}

/**
 * 取消监听请求成功事件
 */
export function offRequestSuccess(handler: RequestEventHandler<'request:success'>): void {
  eventManager.off('request:success', handler);
}

/**
 * 取消监听请求错误事件
 */
export function offRequestError(handler: RequestEventHandler<'request:error'>): void {
  eventManager.off('request:error', handler);
}

/**
 * 取消监听请求完成事件
 */
export function offRequestComplete(handler: RequestEventHandler<'request:complete'>): void {
  eventManager.off('request:complete', handler);
}

/**
 * 移除所有事件监听器
 */
export function removeAllEventListeners(event?: RequestEventType): void {
  eventManager.removeAllListeners(event);
}
