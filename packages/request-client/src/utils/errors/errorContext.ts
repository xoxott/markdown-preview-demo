/**
 * 错误上下文工具
 * 注意：这些是通用工具，不依赖特定的业务错误响应格式
 */

import type { AxiosError } from 'axios';

/**
 * 错误上下文
 */
export interface ErrorContext {
  code: string | number;
  message: string;
  timestamp: number;
  url?: string;
  method?: string;
  status?: number;
  details?: unknown;
}

/**
 * 通用错误响应接口（由应用层定义具体格式）
 */
export interface GenericErrorResponse {
  code: string | number;
  message: string;
  timestamp?: number;
  details?: unknown;
  [key: string]: unknown;
}

/**
 * 创建错误上下文
 */
export function createErrorContext(
  errorResponse: GenericErrorResponse,
  url?: string,
  method?: string,
): ErrorContext {
  return {
    code: errorResponse.code,
    message: errorResponse.message,
    timestamp: errorResponse.timestamp || Date.now(),
    url,
    method,
    status: typeof errorResponse.code === 'number' ? errorResponse.code : undefined,
    details: errorResponse.details,
  };
}

/**
 * 从错误创建错误上下文
 */
export function createErrorContextFromError<T = unknown>(
  error: AxiosError<T>,
  errorResponse: GenericErrorResponse,
): ErrorContext {
  return {
    code: errorResponse.code,
    message: errorResponse.message,
    timestamp: errorResponse.timestamp || Date.now(),
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    details: errorResponse.details,
  };
}

/**
 * 增强错误响应
 */
export function enhanceErrorResponse<T extends GenericErrorResponse>(
  errorResponse: T,
  url?: string,
): T {
  return {
    ...errorResponse,
    path: url,
    timestamp: errorResponse.timestamp || Date.now(),
  } as T;
}

/**
 * 将错误转换为 JSON
 */
export function errorToJSON(error: Error | AxiosError): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  if ('response' in error && error.response) {
    base.response = {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data,
    };
  }

  if ('config' in error && error.config) {
    base.config = {
      url: error.config.url,
      method: error.config.method,
      baseURL: error.config.baseURL,
    };
  }

  return base;
}

