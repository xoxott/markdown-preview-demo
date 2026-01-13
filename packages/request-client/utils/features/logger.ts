/**
 * 日志工具
 */

import type { AxiosResponse, AxiosError } from 'axios';
import type { RequestConfig } from '../../types';

/**
 * 记录请求日志
 */
export function logRequest(config: RequestConfig, enabled?: boolean): void {
  if (enabled === false) {
    return;
  }

  console.log('[Request]', {
    method: config.method,
    url: config.url,
    baseURL: config.baseURL,
    params: config.params,
    data: config.data,
  });
}

/**
 * 记录响应日志
 */
export function logResponse(response: AxiosResponse, enabled?: boolean): void {
  if (enabled === false) {
    return;
  }

  console.log('[Response]', {
    status: response.status,
    statusText: response.statusText,
    data: response.data,
    config: {
      method: response.config.method,
      url: response.config.url,
    },
  });
}

/**
 * 记录错误日志
 */
export function logError(error: AxiosError, enabled?: boolean): void {
  if (enabled === false) {
    return;
  }

  console.error('[Error]', {
    message: error.message,
    code: error.code,
    response: error.response
      ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        }
      : undefined,
    config: {
      method: error.config?.method,
      url: error.config?.url,
    },
  });
}

