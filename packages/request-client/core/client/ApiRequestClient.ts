/**
 * API 请求客户端包装
 * 将业务层的 RequestConfig 转换为 request-core 的 NormalizedRequestConfig
 */

import { RequestClient } from '@suga/request-core';
import type { RequestConfig } from '../../types';
import { adaptRequestConfigToCore } from '../utils/configAdapter';

/**
 * API 请求客户端
 * 包装 request-core 的 RequestClient，提供业务层接口
 */
export class ApiRequestClient {
  constructor(private readonly client: RequestClient) {}

  /**
   * 执行请求
   */
  request<T = unknown>(config: RequestConfig): Promise<T> {
    const { normalized, meta } = adaptRequestConfigToCore(config);
    return this.client.request<T>(normalized, meta);
  }

  /**
   * GET 请求
   */
  get<T = unknown>(url: string, params?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'GET',
      url,
      params,
    });
  }

  /**
   * POST 请求
   */
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'POST',
      url,
      data,
    });
  }

  /**
   * PUT 请求
   */
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'PUT',
      url,
      data,
    });
  }

  /**
   * DELETE 请求
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'DELETE',
      url,
    });
  }

  /**
   * PATCH 请求
   */
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'PATCH',
      url,
      data,
    });
  }
}

