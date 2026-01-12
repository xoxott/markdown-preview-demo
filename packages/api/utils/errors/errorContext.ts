/**
 * 错误上下文工具
 * 增强错误信息，提供更好的调试体验
 */

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { RequestConfig, ErrorResponse } from '../../types';

/**
 * 错误上下文接口
 */
export interface ErrorContext {
  /** 请求 URL */
  url: string;
  /** HTTP 方法 */
  method: string;
  /** 请求参数 */
  params?: unknown;
  /** 请求数据 */
  data?: unknown;
  /** 时间戳 */
  timestamp: number;
  /** 请求 ID */
  requestId?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 响应状态码 */
  status?: number;
  /** 响应数据 */
  responseData?: unknown;
}

/**
 * 从请求配置创建错误上下文
 */
export function createErrorContext(
  config: RequestConfig | InternalAxiosRequestConfig | undefined,
): ErrorContext {
  if (!config) {
    return {
      url: 'UNKNOWN',
      method: 'UNKNOWN',
      timestamp: Date.now(),
    };
  }

  const method = config.method?.toUpperCase() || 'GET';
  const url = config.url || 'UNKNOWN';

  return {
    url,
    method,
    params: 'params' in config ? config.params : undefined,
    data: 'data' in config ? config.data : undefined,
    timestamp: Date.now(),
    requestId: 'requestId' in config ? (config as RequestConfig).requestId : undefined,
    headers: config.headers as Record<string, string> | undefined,
  };
}

/**
 * 从 AxiosError 创建错误上下文
 */
export function createErrorContextFromError(error: AxiosError<ErrorResponse>): ErrorContext {
  const context = createErrorContext(error.config);

  if (error.response) {
    context.status = error.response.status;
    context.responseData = error.response.data;
  }

  return context;
}

/**
 * 增强错误响应，添加上下文信息
 */
export function enhanceErrorResponse(
  errorResponse: ErrorResponse,
  context: ErrorContext,
): ErrorResponse {
  return {
    ...errorResponse,
    path: context.url,
    timestamp: context.timestamp,
  };
}

/**
 * 创建错误对象的 JSON 表示（用于日志记录）
 */
export function errorToJSON(error: unknown, context?: ErrorContext): Record<string, unknown> {
  const result: Record<string, unknown> = {
    timestamp: Date.now(),
  };

  if (context) {
    result.context = context;
  }

  if (error instanceof Error) {
    result.name = error.name;
    result.message = error.message;
    result.stack = error.stack;
  } else {
    result.error = String(error);
  }

  return result;
}
