/**
 * 事件管理器
 */

import type {
  RequestEventType,
  RequestEventHandler,
  RequestStartEventData,
  RequestSuccessEventData,
  RequestErrorEventData,
  RequestCompleteEventData
} from '../types';

/**
 * 事件处理器类型（统一类型）
 */
type EventHandler = (data: unknown) => void;

/**
 * 事件管理器
 */
export class EventManager {
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
        // 静默处理错误，避免影响请求流程
        console.error(`Error in event handler for ${event}:`, error);
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

