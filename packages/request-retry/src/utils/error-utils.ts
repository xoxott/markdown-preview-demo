/**
 * 错误工具函数
 */

import type { RetryableError, ErrorType } from '../types';
import { DEFAULT_RETRY_CONFIG } from '../constants';

/**
 * 检查是否为服务器错误（5xx）
 */
export function isServerError(status: number): boolean {
  return (
    status >= DEFAULT_RETRY_CONFIG.SERVER_ERROR_MIN &&
    status <= DEFAULT_RETRY_CONFIG.SERVER_ERROR_MAX
  );
}

/**
 * 检查是否为客户端错误（4xx）
 */
export function isClientError(status: number): boolean {
  return (
    status >= DEFAULT_RETRY_CONFIG.CLIENT_ERROR_MIN &&
    status <= DEFAULT_RETRY_CONFIG.CLIENT_ERROR_MAX
  );
}

/**
 * 检查是否为可重试的状态码
 */
export function isRetryableStatusCode(status: number): boolean {
  if (isServerError(status)) {
    return true;
  }

  return DEFAULT_RETRY_CONFIG.RETRYABLE_STATUS_CODES.includes(status);
}

/**
 * 检查是否为可重试的客户端错误
 */
export function isRetryableClientError(status: number): boolean {
  return (
    status >= DEFAULT_RETRY_CONFIG.CLIENT_ERROR_MIN &&
    status <= DEFAULT_RETRY_CONFIG.CLIENT_ERROR_MAX &&
    DEFAULT_RETRY_CONFIG.RETRYABLE_STATUS_CODES.includes(status)
  );
}

/**
 * 检查请求是否被取消
 */
export function isCanceledError(error: RetryableError): boolean {
  return (
    error.code === 'ERR_CANCELED' ||
    error.code === 'ECONNABORTED' ||
    error.message.includes('canceled') ||
    error.message.includes('aborted')
  );
}

/**
 * 获取错误类型
 */
export function getErrorType(error: RetryableError): ErrorType {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return 'timeout';
  }

  const status = error.response?.status ?? error.status;
  if (!status) {
    return 'network';
  }

  if (isServerError(status)) {
    return 'server';
  }

  if (isClientError(status)) {
    return 'client';
  }

  return 'unknown';
}

/**
 * 检查是否为可应用错误类型策略的错误
 */
export function isApplicableErrorType(
  errorType: ErrorType,
): errorType is 'timeout' | 'network' | 'server' {
  return errorType !== 'unknown' && errorType !== 'client';
}

