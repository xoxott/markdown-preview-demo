/**
 * 传输层抽象（Transport）
 * 只关心「如何发请求」，不感知缓存、熔断、重试、取消等概念
 */

import type { NormalizedRequestConfig } from '../context/RequestContext';

/**
 * 传输层响应
 */
export interface TransportResponse<T = unknown> {
  /** 响应数据 */
  data: T;
  /** HTTP 状态码 */
  status: number;
  /** 响应头 */
  headers: Record<string, string>;
  /** 请求配置 */
  config: NormalizedRequestConfig;
}

/**
 * 传输层接口
 * 可被 mock、替换、测试
 */
export interface Transport {
  /**
   * 执行请求
   * @param config 标准化请求配置
   * @returns Promise<TransportResponse<T>>
   */
  request<T = unknown>(config: NormalizedRequestConfig): Promise<TransportResponse<T>>;
}

