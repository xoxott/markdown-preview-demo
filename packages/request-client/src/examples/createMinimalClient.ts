/**
 * 创建最小化请求客户端示例
 * 
 * 只包含最基本的请求功能，不包含缓存、重试、熔断等高级功能
 * 适合简单的应用场景
 */

import axios, { type AxiosInstance } from 'axios';
import { RequestClient } from '@suga/request-core';
import { PrepareContextStep } from '@suga/request-core';
import { AxiosTransport, TransportStep } from '@suga/request-axios';

/**
 * 创建最小化请求客户端
 * 
 * @param baseURL API 基础 URL
 * @param timeout 超时时间（毫秒）
 * @returns RequestClient 实例
 */
export function createMinimalClient(
  baseURL: string = '/api',
  timeout: number = 10000,
): RequestClient {
  // 创建 Axios 实例
  const instance: AxiosInstance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 创建传输层
  const transport = new AxiosTransport({ instance });

  // 创建客户端（只包含必要的步骤）
  return new RequestClient(transport)
    .with(new PrepareContextStep())
    .with(new TransportStep(transport));
}

