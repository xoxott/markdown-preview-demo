/**
 * 请求事件类型定义
 */

import type { NormalizedRequestConfig } from '@suga/request-core';

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
  config: NormalizedRequestConfig;
  timestamp: number;
}

/**
 * 请求成功事件数据
 */
export interface RequestSuccessEventData<T = unknown> {
  config: NormalizedRequestConfig;
  result: T;
  timestamp: number;
  duration: number;
}

/**
 * 请求错误事件数据
 */
export interface RequestErrorEventData {
  config: NormalizedRequestConfig;
  error: unknown;
  timestamp: number;
  duration: number;
}

/**
 * 请求完成事件数据（成功或失败）
 */
export interface RequestCompleteEventData {
  config: NormalizedRequestConfig;
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

