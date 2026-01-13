/**
 * 错误增强工具
 */

import type { AxiosError } from 'axios';
import type { ErrorResponse, RequestConfig } from '../../types';

/**
 * 增强的 Axios 错误类型
 */
export interface EnhancedAxiosError extends AxiosError<ErrorResponse> {
  errorResponse?: ErrorResponse;
  requestConfig?: RequestConfig;
}

/**
 * 增强错误对象
 */
export function enhanceError(
  error: AxiosError<ErrorResponse>,
  errorResponse: ErrorResponse,
  config?: RequestConfig,
): EnhancedAxiosError {
  const enhanced = error as EnhancedAxiosError;
  enhanced.errorResponse = errorResponse;
  enhanced.requestConfig = config;
  return enhanced;
}

/**
 * 从响应创建增强错误
 */
export function createEnhancedErrorFromResponse(
  error: AxiosError<ErrorResponse>,
  errorResponse: ErrorResponse,
  config?: RequestConfig,
): EnhancedAxiosError {
  return enhanceError(error, errorResponse, config);
}

