/**
 * Axios 请求适配器
 * 将 Axios 实例适配为统一的请求适配器接口
 */

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { RequestConfig } from '../types';
import type { RequestAdapter, AdapterResponse } from './types';

/**
 * Axios 适配器实现
 */
export class AxiosAdapter implements RequestAdapter {
  private instance: AxiosInstance;

  constructor(instance: AxiosInstance) {
    this.instance = instance;
  }

  /**
   * 将 Axios 响应头转换为标准格式
   */
  private normalizeHeaders(headers: AxiosResponse['headers']): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (headers && typeof headers === 'object') {
      for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined && value !== null) {
          // AxiosHeaderValue 可能是 string | string[] | number
          // 统一转换为 string
          normalized[key] = Array.isArray(value) ? value.join(', ') : String(value);
        }
      }
    }

    return normalized;
  }

  /**
   * 将 Axios 响应转换为适配器响应
   */
  private transformResponse<T>(
    axiosResponse: AxiosResponse<T>,
    config: RequestConfig,
  ): AdapterResponse<T> {
    return {
      data: axiosResponse.data,
      status: axiosResponse.status,
      headers: this.normalizeHeaders(axiosResponse.headers),
      config,
    };
  }

  /**
   * 执行请求
   */
  async request<T = unknown>(config: RequestConfig): Promise<AdapterResponse<T>> {
    const response = await this.instance.request<T>(config as AxiosRequestConfig);
    return this.transformResponse(response, config);
  }

  /**
   * GET 请求
   */
  async get<T = unknown>(url: string, config?: RequestConfig): Promise<AdapterResponse<T>> {
    const response = await this.instance.get<T>(url, config as AxiosRequestConfig);
    return this.transformResponse(response, { ...config, url, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<AdapterResponse<T>> {
    const response = await this.instance.post<T>(url, data, config as AxiosRequestConfig);
    return this.transformResponse(response, { ...config, url, method: 'POST', data });
  }

  /**
   * PUT 请求
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<AdapterResponse<T>> {
    const response = await this.instance.put<T>(url, data, config as AxiosRequestConfig);
    return this.transformResponse(response, { ...config, url, method: 'PUT', data });
  }

  /**
   * DELETE 请求
   */
  async delete<T = unknown>(url: string, config?: RequestConfig): Promise<AdapterResponse<T>> {
    const response = await this.instance.delete<T>(url, config as AxiosRequestConfig);
    return this.transformResponse(response, { ...config, url, method: 'DELETE' });
  }

  /**
   * PATCH 请求
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<AdapterResponse<T>> {
    const response = await this.instance.patch<T>(url, data, config as AxiosRequestConfig);
    return this.transformResponse(response, { ...config, url, method: 'PATCH', data });
  }
}
