/**
 * Axios 传输层适配器
 * 将 Axios 实例适配为 request-core 的 Transport 接口
 */

import type { Transport, TransportResponse, NormalizedRequestConfig } from '@suga/request-core';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

/**
 * Axios 传输层选项
 */
export interface AxiosTransportOptions {
  /** Axios 实例 */
  instance?: AxiosInstance;
  /** 默认配置（如果没有提供 instance） */
  defaultConfig?: AxiosRequestConfig;
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
 * 将 NormalizedRequestConfig 转换为 AxiosRequestConfig
 */
function toAxiosConfig(config: NormalizedRequestConfig): AxiosRequestConfig {
  return config as unknown as AxiosRequestConfig;
}

/**
 * Axios 传输层适配器
 */
export class AxiosTransport implements Transport {
  private instance: AxiosInstance;

  constructor(options: AxiosTransportOptions = {}) {
    if (options.instance) {
      this.instance = options.instance;
    } else if (options.defaultConfig) {
      this.instance = axios.create(options.defaultConfig);
    } else {
      this.instance = axios.create();
    }
  }

  async request<T = unknown>(config: NormalizedRequestConfig): Promise<TransportResponse<T>> {
    try {
      // 转换为 Axios 配置
      const axiosConfig = toAxiosConfig(config);

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
      // 如果是 Axios 错误，提取响应信息
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

      // 其他错误直接抛出
      throw error;
    }
  }
}
