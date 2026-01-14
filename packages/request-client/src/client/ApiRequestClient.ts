/**
 * API 请求客户端包装
 * 将业务层的 RequestConfig 转换为 request-core 的 NormalizedRequestConfig
 */

import { RequestClient } from '@suga/request-core';
import type { RequestConfig } from '../types';
import { adaptRequestConfigToCore } from '../utils/configAdapter';
import { cancelTokenManager, generateRequestId } from '../utils/request/cancel';

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
   * 合并全局默认配置和请求配置
   */
  private mergeConfig(config?: RequestConfig): RequestConfig {
    if (!config) {
      return this.defaultConfig as RequestConfig;
    }

    const merged: RequestConfig = {
      ...this.defaultConfig,
      ...config,
    };

    // 深度合并 headers
    if (this.defaultConfig.headers || config.headers) {
      merged.headers = {
        ...(this.defaultConfig.headers as Record<string, string> | undefined),
        ...(config.headers as Record<string, string> | undefined),
      } as RequestConfig['headers'];
    }

    // 深度合并 logger
    if (this.defaultConfig.logger || config.logger) {
      merged.logger = {
        ...(this.defaultConfig.logger as RequestConfig['logger']),
        ...(config.logger as RequestConfig['logger']),
      } as RequestConfig['logger'];
    }

    // 深度合并 queue
    if (this.defaultConfig.queue || config.queue) {
      merged.queue = {
        ...(this.defaultConfig.queue as RequestConfig['queue']),
        ...(config.queue as RequestConfig['queue']),
      } as RequestConfig['queue'];
    }

    // 深度合并 circuitBreaker
    if (this.defaultConfig.circuitBreaker || config.circuitBreaker) {
      merged.circuitBreaker = {
        ...(this.defaultConfig.circuitBreaker as RequestConfig['circuitBreaker']),
        ...(config.circuitBreaker as RequestConfig['circuitBreaker']),
      } as RequestConfig['circuitBreaker'];
    }

    return merged;
  }

  /**
   * 执行请求
   */
  async request<T = unknown>(config: RequestConfig): Promise<T> {
    const mergedConfig = this.mergeConfig(config);

    // 集成 cancel token 管理
    let requestId: string | undefined = mergedConfig.requestId;

    // 如果启用了取消功能（默认启用）
    const cancelable = mergedConfig.cancelable !== false;

    if (cancelable) {
      // 如果没有提供 requestId，自动生成
      if (!requestId) {
        requestId = generateRequestId(
          mergedConfig.url || '',
          mergedConfig.method || 'GET',
          mergedConfig.params || mergedConfig.data
        );
      }

      // 创建 cancel token
      const cancelTokenSource = cancelTokenManager.createCancelToken(requestId, mergedConfig);

      // 将 cancel token 添加到配置中（Axios 使用 cancelToken）
      mergedConfig.cancelToken = cancelTokenSource.token;
    }

    try {
      const { normalized, meta } = adaptRequestConfigToCore(mergedConfig);
      const result = await this.client.request<T>(normalized, meta);

      // 请求成功，清理 cancel token
      if (requestId) {
        cancelTokenManager.remove(requestId);
      }

      return result;
    } catch (error) {
      // 请求失败，清理 cancel token（除非是取消错误，cancel 方法已清理）
      if (requestId) {
        // 检查 token 是否还存在（如果已被取消，cancel 方法已经清理了）
        const tokenExists = cancelTokenManager.get(requestId) !== undefined;
        if (tokenExists) {
          cancelTokenManager.remove(requestId);
        }
      }

      throw error;
    }
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

