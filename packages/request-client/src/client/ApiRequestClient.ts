/**
 * API 请求客户端包装
 * 将业务层的 RequestConfig 转换为 request-core 的 NormalizedRequestConfig
 */

import { RequestClient } from '@suga/request-core';
import type { RequestConfig } from '../types';
import { adaptRequestConfigToCore } from '../utils/configAdapter';

/**
 * API 请求客户端
 * 包装 request-core 的 RequestClient，提供业务层接口
 */
export class ApiRequestClient {
  private defaultConfig: Partial<RequestConfig>;

  constructor(client: RequestClient, defaultConfig?: Partial<RequestConfig>) {
    this.client = client;
    this.defaultConfig = defaultConfig || {};
  }

  private readonly client: RequestClient;

  /**
   * 判断是否为普通对象（非 null、非数组）
   */
  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }

  /**
   * 深度合并对象字段
   */
  private deepMergeObject<T extends Record<string, unknown>>(
    target: T | undefined,
    source: T | undefined,
  ): T | undefined {
    if (!target) return source;
    if (!source) return target;
    if (!this.isPlainObject(target) || !this.isPlainObject(source)) {
      return source;
    }
    return { ...target, ...source } as T;
  }

  /**
   * 合并全局默认配置和请求配置
   */
  private mergeConfig(config?: RequestConfig): RequestConfig {
    if (!config) {
      return this.defaultConfig as RequestConfig;
    }

    // 需要深度合并的字段（对象类型）
    const deepMergeKeys: Array<keyof RequestConfig> = [
      'headers',
      'logger',
      'queue',
      'circuitBreaker',
      'retry',
    ];

    const merged: RequestConfig = {
      ...this.defaultConfig,
      ...config,
    };

    // 深度合并对象字段
    for (const key of deepMergeKeys) {
      const mergedValue = this.deepMergeObject(
        this.defaultConfig[key] as Record<string, unknown> | undefined,
        config[key] as Record<string, unknown> | undefined,
      );
      if (mergedValue !== undefined) {
        merged[key] = mergedValue as RequestConfig[typeof key];
      }
    }

    return merged;
  }

  /**
   * 执行请求
   */
  async request<T = unknown>(config: RequestConfig): Promise<T> {
    const mergedConfig = this.mergeConfig(config);
      const { normalized, meta } = adaptRequestConfigToCore(mergedConfig);
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

