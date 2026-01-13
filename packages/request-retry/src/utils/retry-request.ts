/**
 * 重试请求函数
 */

import type { RetryableError, RetryStrategy, RetryConfig } from '../types';
import { DEFAULT_RETRY_CONFIG } from '../constants';
import {
  shouldRetry,
  calculateRetryDelay,
  delay,
  isLastAttempt,
  hasExceededErrorTypeMaxRetries,
} from './retry-utils';

/**
 * 类型守卫：检查错误是否为 RetryableError
 */
function isRetryableError(error: unknown): error is RetryableError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const err = error as Record<string, unknown>;
  return typeof err.message === 'string';
}

/**
 * 将错误转换为 RetryableError
 */
function normalizeError(error: unknown): RetryableError {
  if (isRetryableError(error)) {
    return error;
  }

  // 如果是 Error 对象，转换为 RetryableError
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as unknown as Record<string, unknown>).code as string | undefined,
    };
  }

  // 默认错误
  return {
    message: String(error),
  };
}

/**
 * 重试请求
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  config?: RetryConfig,
  strategy?: RetryStrategy,
): Promise<T> {
  // 如果提供了策略且未启用，直接执行请求
  if (strategy && !strategy.enabled) {
    return requestFn();
  }

  // 如果配置中禁用了重试，直接执行请求
  if (config?.retry === false) {
    return requestFn();
  }

  const maxRetries =
    strategy?.maxRetries ?? config?.retryCount ?? DEFAULT_RETRY_CONFIG.DEFAULT_RETRY_COUNT;
  let lastError: RetryableError | null = null;

  // 尝试次数 = 初始请求 + 重试次数
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      const normalizedError = normalizeError(error);
      lastError = normalizedError;

      // 最后一次尝试失败，直接抛出错误
      if (isLastAttempt(attempt, maxRetries)) {
        throw error;
      }

      // 判断是否应该重试，如果不应该重试，直接抛出错误
      if (!shouldRetry(normalizedError, strategy, attempt, config?.retryOnTimeout)) {
        throw error;
      }

      // 如果提供了错误类型策略，检查该错误类型的最大重试次数
      if (strategy && hasExceededErrorTypeMaxRetries(normalizedError, attempt, strategy)) {
        throw error;
      }

      // 计算延迟时间并等待后重试
      const delayTime = calculateRetryDelay(
        attempt,
        DEFAULT_RETRY_CONFIG.DEFAULT_RETRY_DELAY,
        normalizedError,
        strategy,
      );
      await delay(delayTime);
    }
  }

  // 理论上不会执行到这里，但为了类型安全保留
  throw lastError ?? new Error('重试失败：未知错误');
}

