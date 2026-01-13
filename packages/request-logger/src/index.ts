/**
 * @suga/request-logger
 * Request logging for @suga/request-core
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import { LoggerManager } from './managers/LoggerManager';
import { logRequest, logResponse, logError } from './logger';
import type { LoggerOptions } from './types';

// 导出日志管理器
export { LoggerManager } from './managers/LoggerManager';

// 导出日志函数
export { logRequest, logResponse, logError } from './logger';

// 导出类型
export type * from './types';

// 创建全局日志管理器实例
export const loggerManager = new LoggerManager();

/**
 * 记录请求日志（便捷函数）
 */
export function logRequestWithManager(
  config: NormalizedRequestConfig,
  enabled?: boolean,
): void {
  logRequest(config, loggerManager, enabled);
}

/**
 * 记录响应日志（便捷函数）
 */
export function logResponseWithManager<T>(
  config: NormalizedRequestConfig,
  result: T,
  duration: number,
  enabled?: boolean,
): void {
  logResponse(config, result, duration, loggerManager, enabled);
}

/**
 * 记录错误日志（便捷函数）
 */
export function logErrorWithManager(
  config: NormalizedRequestConfig,
  error: unknown,
  duration: number,
  enabled?: boolean,
): void {
  logError(config, error, duration, loggerManager, enabled);
}

/**
 * 配置日志选项
 */
export function configureLogger(options: Partial<LoggerOptions>): void {
  loggerManager.setOptions(options);
}

