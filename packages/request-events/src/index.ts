/**
 * @suga/request-events
 * Request event system for @suga/request-core
 */

import { EventManager } from './managers/EventManager';
import type {
  RequestEventHandler,
  RequestEventType
} from './types';

// 导出事件步骤
export { EventStep } from './steps/EventStep';
export type { EventStepOptions } from './steps/EventStep';

// 导出事件管理器
export { EventManager } from './managers/EventManager';

// 导出类型
export type * from './types';

// 创建全局事件管理器实例
export const eventManager = new EventManager();

/**
 * 监听请求开始事件
 */
export function onRequestStart(handler: RequestEventHandler<'request:start'>): void {
  eventManager.on('request:start', handler);
}

/**
 * 监听请求成功事件
 */
export function onRequestSuccess(handler: RequestEventHandler<'request:success'>): void {
  eventManager.on('request:success', handler);
}

/**
 * 监听请求错误事件
 */
export function onRequestError(handler: RequestEventHandler<'request:error'>): void {
  eventManager.on('request:error', handler);
}

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

