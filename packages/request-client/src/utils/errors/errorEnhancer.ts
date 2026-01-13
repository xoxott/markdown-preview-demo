/**
 * 错误增强工具
 * 注意：这些是通用工具，不依赖特定的业务错误响应格式
 */

import type { AxiosError } from 'axios';
import type { RequestConfig } from '../../types';
import type { GenericErrorResponse } from './errorContext';

/**
 * 增强的 Axios 错误类型
 */
export interface EnhancedAxiosError<T = unknown> extends AxiosError<T> {
  errorResponse?: GenericErrorResponse;
  requestConfig?: RequestConfig;
}

/**
 * 增强错误对象
 */
export function enhanceError<T = unknown>(
  error: AxiosError<T>,
  errorResponse: GenericErrorResponse,
  config?: RequestConfig,
): EnhancedAxiosError<T> {
  const enhanced = error as EnhancedAxiosError<T>;
  enhanced.errorResponse = errorResponse;
  enhanced.requestConfig = config;
  return enhanced;
}


