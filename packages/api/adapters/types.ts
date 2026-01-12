/**
 * 请求适配器类型定义
 * 抽象请求接口，支持切换不同的 HTTP 客户端
 */

import type { RequestConfig } from '../types';

/**
 * 适配器响应接口
 */
export interface AdapterResponse<T = unknown> {
  /** 响应数据 */
  data: T;
  /** HTTP 状态码 */
  status: number;
  /** 响应头 */
  headers: Record<string, string>;
  /** 请求配置 */
  config: RequestConfig;
}

/**
 * 请求适配器接口
 * 定义统一的请求接口，支持不同的 HTTP 客户端实现
 */
export interface RequestAdapter {
  /**
   * 执行请求
   * @param config 请求配置
   * @returns Promise<AdapterResponse<T>>
   */
  request<T = unknown>(config: RequestConfig): Promise<AdapterResponse<T>>;

  /**
   * GET 请求
   * @param url 请求 URL
   * @param config 请求配置
   * @returns Promise<AdapterResponse<T>>
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<AdapterResponse<T>>;

  /**
   * POST 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise<AdapterResponse<T>>
   */
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<AdapterResponse<T>>;

  /**
   * PUT 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise<AdapterResponse<T>>
   */
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<AdapterResponse<T>>;

  /**
   * DELETE 请求
   * @param url 请求 URL
   * @param config 请求配置
   * @returns Promise<AdapterResponse<T>>
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<AdapterResponse<T>>;

  /**
   * PATCH 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise<AdapterResponse<T>>
   */
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<AdapterResponse<T>>;
}
