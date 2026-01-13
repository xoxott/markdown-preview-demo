/**
 * 创建请求客户端工厂函数
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import {
  RequestClient,
  PrepareContextStep,
  RequestExecutor,
  type RequestStep,
  type Transport,
} from '@suga/request-core';
import { CacheReadStep, CacheWriteStep } from '@suga/request-cache';
import { RetryStep } from '@suga/request-retry';
import { CircuitBreakerStep } from '@suga/request-circuit-breaker';
import { DedupeStep } from '@suga/request-dedupe';
import { QueueStep } from '@suga/request-queue';
import { EventStep } from '@suga/request-events';
import { AxiosTransport } from '../transport/AxiosTransport';
import type { RequestOptions } from '../types';
import { DEFAULT_TIMEOUT } from '../../constants';
import { TransportStep } from '../steps/TransportStep';
import { ApiRequestClient } from './ApiRequestClient';

/**
 * 自定义 RequestClient，支持手动指定步骤链
 */
class CustomRequestClient extends RequestClient {
  constructor(transport: Transport, steps: RequestStep[]) {
    // 调用父类构造函数，但我们会覆盖步骤
    super(transport);
    // 覆盖步骤链
    (this as unknown as { steps: RequestStep[] }).steps = steps;
    // 重新创建执行器
    (this as unknown as { executor: RequestExecutor }).executor = new RequestExecutor(steps);
  }
}

/**
 * 创建请求客户端
 * @param config Axios 配置
 * @param options 请求选项
 * @returns ApiRequestClient（业务层包装）
 */
export function createRequestClient(
  config?: AxiosRequestConfig,
  options?: RequestOptions,
): ApiRequestClient {
  const baseURL = options?.baseURL || '/api';
  const timeout = options?.timeout || DEFAULT_TIMEOUT;

  // 创建 Axios 实例
  const instance: AxiosInstance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
    ...config,
  });

  // 创建传输层（使用新的 AxiosTransport）
  const transport = new AxiosTransport({ instance });

  // 手动构建步骤链（按执行顺序）
  const steps: RequestStep[] = [
    new PrepareContextStep(),
    new CacheReadStep(),
    new DedupeStep(),
    new QueueStep(),
    new RetryStep(),
    new CircuitBreakerStep(),
    new EventStep(),
    new TransportStep(transport), // 使用业务层的 TransportStep（包装了业务逻辑）
    new CacheWriteStep(),
  ];

  // 创建自定义客户端
  const coreClient = new CustomRequestClient(transport, steps);

  // 返回业务层包装的客户端
  return new ApiRequestClient(coreClient);
}

