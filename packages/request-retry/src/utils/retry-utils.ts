/**
 * 重试工具函数
 */

import type { RetryableError, RetryStrategy } from '../types';
import { DEFAULT_RETRY_CONFIG } from '../constants';
import {
  isRetryableStatusCode,
  isRetryableClientError,
  isCanceledError,
  getErrorType,
  isApplicableErrorType,
} from './error-utils';

/**
 * 判断是否应该重试（默认策略）
 */
function shouldRetryByDefault(error: RetryableError): boolean {
  // 网络错误（无响应），重试
  if (!error.response && !error.status) return true;

  const status = error.response?.status ?? error.status ?? 0;

  // 客户端错误：只有特定状态码可重试
  if (status >= DEFAULT_RETRY_CONFIG.CLIENT_ERROR_MIN && status <= DEFAULT_RETRY_CONFIG.CLIENT_ERROR_MAX) {
    return isRetryableClientError(status);
  }

  // 服务器错误或其他可重试状态码
  return isRetryableStatusCode(status);
}

/**
 * 判断是否应该重试
 */
export function shouldRetry(
  error: RetryableError,
  strategy?: RetryStrategy,
  attempt: number = 0,
  retryOnTimeout?: boolean,
): boolean {
  // 请求被取消，不重试
  if (isCanceledError(error)) return false;

  // 检查是否为超时错误
  const isTimeoutError =
    error.code === 'ECONNABORTED' || error.message.includes('timeout');

  // 如果是超时错误且未启用超时重试，不重试
  if (isTimeoutError && retryOnTimeout === false) return false;

  // 如果提供了自定义策略，使用自定义策略
  if (strategy) return strategy.shouldRetry(error, attempt);

  return shouldRetryByDefault(error);
}

/**
 * 从错误类型策略获取延迟时间
 */
function getDelayFromErrorTypeStrategy(
  error: RetryableError,
  strategy: RetryStrategy,
): number | null {
  if (!strategy.errorTypeStrategy) return null;

  const errorType = getErrorType(error);
  if (!isApplicableErrorType(errorType)) return null;

  const typeStrategy = strategy.errorTypeStrategy[errorType];
  return typeStrategy?.delay ?? null;
}

/**
 * 计算指数退避延迟时间
 */
function calculateExponentialDelay(retryCount: number, baseDelay: number): number {
  const delay =
    baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.EXPONENTIAL_BASE, retryCount);
  return Math.min(delay, DEFAULT_RETRY_CONFIG.MAX_DELAY);
}

/**
 * 计算重试延迟时间（指数退避）
 */
export function calculateRetryDelay(
  retryCount: number,
  baseDelay: number = DEFAULT_RETRY_CONFIG.DEFAULT_RETRY_DELAY,
  error?: RetryableError,
  strategy?: RetryStrategy,
): number {
  if (strategy && error) {
    const typeDelay = getDelayFromErrorTypeStrategy(error, strategy);
    if (typeDelay !== null) return typeDelay;
    return strategy.retryDelay(retryCount, error);
  }
  // 默认：指数退避
  return calculateExponentialDelay(retryCount, baseDelay);
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 检查是否为最后一次重试
 */
export function isLastAttempt(currentAttempt: number, maxRetries: number): boolean {
  return currentAttempt >= maxRetries;
}

/**
 * 检查错误类型策略是否达到最大重试次数
 */
export function hasExceededErrorTypeMaxRetries(
  error: RetryableError,
  attempt: number,
  strategy: RetryStrategy,
): boolean {
  if (!strategy.errorTypeStrategy) {
    return false;
  }

  const errorType = getErrorType(error);
  if (!isApplicableErrorType(errorType)) {
    return false;
  }

  const typeStrategy = strategy.errorTypeStrategy[errorType];
  return typeStrategy !== undefined && attempt >= typeStrategy.maxRetries;
}

