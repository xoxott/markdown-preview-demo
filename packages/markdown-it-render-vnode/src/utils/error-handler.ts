/**
 * 错误处理工具模块
 *
 * @module utils/error-handler
 */

import type { FrameworkNode } from '../adapters/types';
import { getAdapter } from '../adapters/manager';
import type { ErrorHandlerConfig } from '../types';

/** 默认错误处理配置 */
const DEFAULT_ERROR_CONFIG: ErrorHandlerConfig = {
  mode: 'warn',
  errorPrefix: '[Markdown Renderer]'
};

/** 当前错误处理配置 */
let errorConfig: ErrorHandlerConfig = { ...DEFAULT_ERROR_CONFIG };

/**
 * 设置错误处理配置
 *
 * @param config - 错误处理配置
 */
export function setErrorHandlerConfig(config: ErrorHandlerConfig): void {
  errorConfig = { ...DEFAULT_ERROR_CONFIG, ...config };
}

/**
 * 处理错误并返回节点
 *
 * @param error - 错误对象
 * @param context - 错误上下文
 * @param fallback - 降级节点
 * @returns 节点
 */
export function handleError(error: unknown, context: string, fallback?: FrameworkNode): FrameworkNode {
  const adapter = getAdapter();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const fullMessage = `${errorConfig.errorPrefix} ${context}: ${errorMessage}`;

  switch (errorConfig.mode) {
    case 'silent':
      return fallback || adapter.createText('');
    case 'warn':
      console.warn(fullMessage, error);
      const errorText = adapter.createText(`[Error: ${context}]`);
      return fallback || (typeof errorText === 'string' ? adapter.createText(errorText) : errorText);
    case 'strict':
      throw new Error(fullMessage);
    default:
      console.warn(fullMessage, error);
      const defaultErrorText = adapter.createText(`[Error: ${context}]`);
      return fallback || (typeof defaultErrorText === 'string' ? adapter.createText(defaultErrorText) : defaultErrorText);
  }
}

/**
 * 安全执行函数并处理错误
 *
 * @param fn - 要执行的函数
 * @param context - 错误上下文
 * @param fallback - 降级返回值
 * @returns 函数返回值或降级值
 */
export function safeExecute<T>(
  fn: () => T,
  context: string,
  fallback: T
): T {
  try {
    return fn();
  } catch (error) {
    handleError(error, context);
    return fallback;
  }
}

