/**
 * 请求重试机制
 */

import axios, { type AxiosError } from 'axios';
import { DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY, DEFAULT_RETRY_CONFIG } from '../../constants';
import type { RequestConfig } from '../../types';

/**
 * 错误类型
 */
type ErrorType = 'timeout' | 'network' | 'server' | 'client' | 'unknown';

/**
 * 可重试的客户端错误状态码
 */
const RETRYABLE_CLIENT_ERROR_CODES = [408, 429] as const;

/**
 * 客户端错误状态码范围
 */
const CLIENT_ERROR_MIN = 400;
const CLIENT_ERROR_MAX = 499;

/**
 * 重试策略配置
 */
export interface RetryStrategy {
  /** 是否启用重试 */
  enabled: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟函数 */
  retryDelay: (attempt: number, error: AxiosError) => number;
  /** 判断是否应该重试 */
  shouldRetry: (error: AxiosError, attempt: number) => boolean;
  /** 针对不同错误类型的重试策略 */
  errorTypeStrategy?: {
    timeout?: { maxRetries: number; delay: number };
    network?: { maxRetries: number; delay: number };
    server?: { maxRetries: number; delay: number };
    client?: { maxRetries: number; delay: number };
  };
}

/**
 * 检查是否为服务器错误（5xx）
 */
function isServerError(status: number): boolean {
  return (
    status >= DEFAULT_RETRY_CONFIG.SERVER_ERROR_MIN &&
    status <= DEFAULT_RETRY_CONFIG.SERVER_ERROR_MAX
  );
}

/**
 * 检查是否为可重试的状态码
 */
function isRetryableStatusCode(status: number): boolean {
  if (isServerError(status)) {
    return true;
  }

  return (DEFAULT_RETRY_CONFIG.RETRYABLE_STATUS_CODES as readonly number[]).includes(status);
}

/**
 * 检查是否为可重试的客户端错误
 */
function isRetryableClientError(status: number): boolean {
  return (
    status >= CLIENT_ERROR_MIN &&
    status <= CLIENT_ERROR_MAX &&
    RETRYABLE_CLIENT_ERROR_CODES.includes(status as (typeof RETRYABLE_CLIENT_ERROR_CODES)[number])
  );
}

/**
 * 检查请求是否被取消
 */
function isCanceledError(error: AxiosError): boolean {
  return axios.isCancel(error) || (error as AxiosError).code === 'ERR_CANCELED';
}

/**
 * 判断是否应该重试（默认策略）
 */
function shouldRetryByDefault(error: AxiosError): boolean {
  // 网络错误（无响应），重试
  if (!error.response) {
    return true;
  }

  const status = error.response.status;

  // 客户端错误：只有特定状态码可重试
  if (status >= CLIENT_ERROR_MIN && status <= CLIENT_ERROR_MAX) {
    return isRetryableClientError(status);
  }

  // 服务器错误或其他可重试状态码
  return isRetryableStatusCode(status);
}

/**
 * 判断是否应该重试
 * @param error 错误对象
 * @param strategy 重试策略（可选）
 * @param attempt 当前尝试次数（可选，用于自定义策略）
 * @param retryOnTimeout 超时时是否重试（可选，来自请求配置）
 * @returns 是否应该重试
 */
export function shouldRetry(
  error: AxiosError,
  strategy?: RetryStrategy,
  attempt: number = 0,
  retryOnTimeout?: boolean,
): boolean {
  // 请求被取消，不重试
  if (isCanceledError(error)) {
    return false;
  }

  // 检查是否为超时错误
  const isTimeoutError = error.code === 'ECONNABORTED' || error.message.includes('timeout');

  // 如果是超时错误且未启用超时重试，不重试
  if (isTimeoutError && retryOnTimeout === false) {
    return false;
  }

  // 如果提供了自定义策略，使用自定义策略
  if (strategy) {
    return strategy.shouldRetry(error, attempt);
  }

  return shouldRetryByDefault(error);
}

/**
 * 获取错误类型
 * @param error 错误对象
 * @returns 错误类型
 */
function getErrorType(error: AxiosError): ErrorType {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return 'timeout';
  }

  if (!error.response) {
    return 'network';
  }

  const status = error.response.status;
  if (status >= DEFAULT_RETRY_CONFIG.SERVER_ERROR_MIN) {
    return 'server';
  }

  if (status >= CLIENT_ERROR_MIN) {
    return 'client';
  }

  return 'unknown';
}

/**
 * 检查是否为可应用错误类型策略的错误
 */
function isApplicableErrorType(
  errorType: ErrorType,
): errorType is 'timeout' | 'network' | 'server' {
  return errorType !== 'unknown' && errorType !== 'client';
}

/**
 * 从错误类型策略获取延迟时间
 */
function getDelayFromErrorTypeStrategy(error: AxiosError, strategy: RetryStrategy): number | null {
  if (!strategy.errorTypeStrategy) {
    return null;
  }

  const errorType = getErrorType(error);
  if (!isApplicableErrorType(errorType)) {
    return null;
  }

  const typeStrategy = strategy.errorTypeStrategy[errorType];
  return typeStrategy?.delay ?? null;
}

/**
 * 计算指数退避延迟时间
 */
function calculateExponentialDelay(retryCount: number, baseDelay: number): number {
  const delay = baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.EXPONENTIAL_BASE, retryCount);
  return Math.min(delay, DEFAULT_RETRY_CONFIG.MAX_DELAY);
}

/**
 * 计算重试延迟时间（指数退避）
 * @param retryCount 当前重试次数
 * @param baseDelay 基础延迟时间
 * @param error 错误对象（可选，用于根据错误类型调整延迟）
 * @param strategy 重试策略（可选）
 * @returns 延迟时间（毫秒）
 */
export function calculateRetryDelay(
  retryCount: number,
  baseDelay: number = DEFAULT_RETRY_DELAY,
  error?: AxiosError,
  strategy?: RetryStrategy,
): number {
  // 如果提供了自定义策略和错误对象
  if (strategy && error) {
    // 优先使用自定义延迟函数
    return strategy.retryDelay(retryCount, error);
  }

  // 如果提供了错误类型策略，使用对应的延迟
  if (strategy && error) {
    const typeDelay = getDelayFromErrorTypeStrategy(error, strategy);
    if (typeDelay !== null) {
      return typeDelay;
    }
  }

  // 默认：指数退避
  return calculateExponentialDelay(retryCount, baseDelay);
}

/**
 * 延迟函数
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查是否为最后一次重试
 */
function isLastAttempt(currentAttempt: number, maxRetries: number): boolean {
  return currentAttempt >= maxRetries;
}

/**
 * 检查错误类型策略是否达到最大重试次数
 */
function hasExceededErrorTypeMaxRetries(
  error: AxiosError,
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

/**
 * 类型守卫：检查错误是否为 AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * 重试请求
 * @param requestFn 请求函数
 * @param config 请求配置
 * @param strategy 重试策略（可选）
 * @returns Promise
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  config: RequestConfig,
  strategy?: RetryStrategy,
): Promise<T> {
  // 如果提供了策略且未启用，直接执行请求
  if (strategy && !strategy.enabled) {
    return requestFn();
  }

  const maxRetries = strategy?.maxRetries ?? config.retryCount ?? DEFAULT_RETRY_COUNT;
  let lastError: AxiosError | null = null;

  // 尝试次数 = 初始请求 + 重试次数
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      // 类型守卫：确保错误是 AxiosError
      if (!isAxiosError(error)) {
        throw error;
      }

      lastError = error;

      // 最后一次尝试失败，直接抛出错误
      if (isLastAttempt(attempt, maxRetries)) {
        throw error;
      }

      // 判断是否应该重试，如果不应该重试，直接抛出错误
      // 传递 retryOnTimeout 配置，支持超时重试控制
      if (!shouldRetry(lastError, strategy, attempt, config.retryOnTimeout)) {
        throw error;
      }

      // 如果提供了错误类型策略，检查该错误类型的最大重试次数
      if (strategy && hasExceededErrorTypeMaxRetries(lastError, attempt, strategy)) {
        throw error;
      }

      // 计算延迟时间并等待后重试
      const delayTime = calculateRetryDelay(attempt, DEFAULT_RETRY_DELAY, lastError, strategy);
      await delay(delayTime);
    }
  }

  // 理论上不会执行到这里，但为了类型安全保留
  throw lastError ?? new Error('重试失败：未知错误');
}
