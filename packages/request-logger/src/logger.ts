/**
 * 日志函数
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import type { LoggerManager } from './managers/LoggerManager';

/**
 * 记录请求日志
 */
export function logRequest(
  config: NormalizedRequestConfig,
  loggerManager: LoggerManager,
  enabled?: boolean,
): void {
  if (!loggerManager.shouldLogRequest(enabled)) {
    return;
  }

  const method = (config.method || 'GET').toUpperCase();
  const { url, params, data } = config;
  const output = loggerManager.getOutput();

  output(`🚀 [${method}] ${url || ''}`);
  if (params) {
    output('📤 Params:', params);
  }
  if (data) {
    output('📤 Data:', data);
  }
  if (config.headers) {
    output('📋 Headers:', config.headers);
  }
  if (config.timeout) {
    output('⏱️  Timeout:', config.timeout, 'ms');
  }
}

/**
 * 记录响应日志
 */
export function logResponse<T>(
  config: NormalizedRequestConfig,
  result: T,
  duration: number,
  loggerManager: LoggerManager,
  enabled?: boolean,
): void {
  if (!loggerManager.shouldLogResponse(enabled)) {
    return;
  }

  const method = (config.method || 'GET').toUpperCase();
  const { url } = config;
  const output = loggerManager.getOutput();

  output(`✅ [${method}] ${url || ''} - Success`);
  output('📥 Response:', result);
  output('⏱️  Duration:', `${duration}ms`);
}

/**
 * 记录错误日志
 */
export function logError(
  config: NormalizedRequestConfig,
  error: unknown,
  duration: number,
  loggerManager: LoggerManager,
  enabled?: boolean,
): void {
  if (!loggerManager.shouldLogError(enabled)) {
    return;
  }

  const method = (config.method || 'GET').toUpperCase();
  const { url } = config;
  const output = loggerManager.getOutput();

  output(`❌ [${method}] ${url || ''} - Error`);
  output('📥 Error:', error);
  output('⏱️  Duration:', `${duration}ms`);
}

