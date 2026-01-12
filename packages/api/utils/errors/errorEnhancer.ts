/**
 * 错误增强工具
 * 统一处理错误对象的扩展，减少重复代码
 */

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { RequestConfig, ErrorResponse } from '../../types';

/**
 * 增强的错误对象接口
 * 扩展 AxiosError，添加自定义属性
 * 注意：config 属性已经在 AxiosError 中定义，我们只添加 errorResponse
 */
export type EnhancedAxiosError = AxiosError<ErrorResponse> & {
  errorResponse?: ErrorResponse;
};

/**
 * 增强错误对象，添加自定义属性
 */
export function enhanceError(
  error: AxiosError<ErrorResponse>,
  errorResponse?: ErrorResponse,
  _config?: RequestConfig | InternalAxiosRequestConfig,
): EnhancedAxiosError {
  const enhanced = error as EnhancedAxiosError;
  if (errorResponse) {
    enhanced.errorResponse = errorResponse;
  }
  return enhanced;
}

/**
 * 创建增强的错误对象（从错误响应）
 */
export function createEnhancedErrorFromResponse(
  error: AxiosError<ErrorResponse>,
  errorResponse: ErrorResponse,
  config?: RequestConfig & InternalAxiosRequestConfig,
): EnhancedAxiosError {
  return enhanceError(error, errorResponse, config);
}
