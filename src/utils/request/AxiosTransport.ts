/**
 * Axios 传输层适配器
 * 将 Axios 实例适配为 request-core 的 Transport 接口
 */

import type { Transport, TransportResponse, NormalizedRequestConfig } from '@suga/request-core';
import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';

/**
 * Axios 传输层选项
 */
export interface AxiosTransportOptions {
  /** HTTP 请求实例（必需，通常是通过 axios.create() 创建的实例） */
  instance: unknown;
}

/**
 * 将 Axios 响应头转换为标准格式
 */
function normalizeHeaders(headers: AxiosResponse['headers']): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        // AxiosHeaderValue 可能是 string | string[] | number  统一转换为 string
        normalized[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }
  }

  return normalized;
}

/**
 * 类型守卫：检查是否为 Axios 实例
 * 注意：AxiosInstance 实际上是一个函数对象，所以 typeof 是 'function' 而不是 'object'
 */
function isAxiosInstance(instance: unknown): instance is AxiosInstance {
  if (!instance) {
    return false;
  }

  // AxiosInstance 是一个函数对象，typeof 是 'function'
  // 但它也有 request、get、post 等方法属性
  return (
    (typeof instance === 'object' || typeof instance === 'function') &&
    typeof (instance as { request?: unknown }).request === 'function' &&
    typeof (instance as { get?: unknown }).get === 'function'
  );
}

/**
 * Axios 传输层适配器
 */
export class AxiosTransport implements Transport {
  private readonly instance: AxiosInstance;

  constructor(options: AxiosTransportOptions) {
    if (!isAxiosInstance(options.instance)) {
      throw new TypeError('AxiosTransport: instance must be an AxiosInstance (created by axios.create())');
    }
    this.instance = options.instance;
  }

  async request<T = unknown>(config: NormalizedRequestConfig): Promise<TransportResponse<T>> {
    try {

      const axiosConfig = config as unknown as Parameters<AxiosInstance['request']>[0];

      // 执行请求
      const response = await this.instance.request<T>(axiosConfig);

      // 转换为 TransportResponse
      return {
        data: response.data,
        status: response.status,
        headers: normalizeHeaders(response.headers),
        config,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw {
          message: error.message,
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: normalizeHeaders(error.response.headers),
          config: error.config,
        };
      }
      throw error;
    }
  }
}

