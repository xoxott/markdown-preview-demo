/**
 * 创建请求客户端
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
import { RetryStep, RetryStrategy } from '@suga/request-retry';
import { CircuitBreakerStep } from '@suga/request-circuit-breaker';
import { DedupeStep } from '@suga/request-dedupe';
import { QueueStep } from '@suga/request-queue';
import { AbortStep } from '@suga/request-abort';
import {
  EventStep,
  eventManager,
  onRequestError,
  onRequestStart,
  onRequestSuccess
} from '@suga/request-events';
import {
  configureLogger,
  logRequestWithManager,
  logResponseWithManager,
  logErrorWithManager
} from '@suga/request-logger';
import { AxiosTransport, TransportStep } from './index';

/**
 * 自定义 RequestClient，支持手动指定步骤链
 */
class CustomRequestClient extends RequestClient {
  constructor(transport: Transport, steps: RequestStep[]) {
    super(transport);
    (this as unknown as { steps: RequestStep[] }).steps = steps;
    (this as unknown as { executor: RequestExecutor }).executor = new RequestExecutor(steps);
  }
}

// 1. 日志配置
configureLogger({
  enabled: true,
  // logRequest: true,
  // logResponse: true,
  // logError: true,
});

onRequestStart((data) => {
  logRequestWithManager(data.config);
});

onRequestSuccess((data) => {
  logResponseWithManager(data.config, data.result, data.duration);
});

onRequestError((data) => {
  logErrorWithManager(data.config, data.error, data.duration);
});

/**
 * 创建请求客户端
 */
export function createRequestClient(config?: AxiosRequestConfig) {
  const cfg = config || {};
  const baseURL = cfg.baseURL || '/api';
  const timeout = cfg.timeout || 10000;

  // 创建 Axios 实例
  const instance: AxiosInstance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
    ...cfg,
  });

  // 创建传输层
  const transport = new AxiosTransport({ instance });

  // ==================== 步骤配置====================

  // 3. 去重配置
  const dedupeConfig = {
    dedupeWindow: 1000, // 1秒内的相同请求会被去重
    strategy: 'exact' as const, // 精确匹配
  };

  // 4. 中止配置
  const abortConfig = {
    enabled: true,
    autoAbortPrevious: true, // 自动中止相同 requestId 的旧请求
  };

  // 5. 队列配置
  const queueConfig = {
    maxConcurrent: 5, // 最大并发数
    queueStrategy: 'fifo' as const, // 先进先出
  };

  // 6. 重试配置
  const retryStrategy: RetryStrategy = {
    enabled: true,
    maxRetries: 3, // 最大重试次数
    retryDelay: (attempt: number) => attempt * 1000, // 延迟时间：第1次重试延迟1秒，第2次2秒，以此类推
    shouldRetry: (error: unknown) => {
      // 网络错误或 5xx 错误时重试
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        return (
          !axiosError.response ||
          (axiosError.response.status !== undefined &&
            axiosError.response.status >= 500 &&
            axiosError.response.status < 600)
        );
      }
      return false;
    },
  };

  // 7. 熔断器配置
  const circuitBreakerConfig = {
    cleanupInterval: 300000, // 5分钟清理一次
    maxSize: 100, // 最大缓存断路器数量
    idleTimeout: 1800000, // 30分钟空闲超时
  };

  // ==================== 构建步骤链 ====================

  const steps: RequestStep[] = [
    new PrepareContextStep(),
    new CacheReadStep(),
    new DedupeStep({
      defaultOptions: dedupeConfig,
    }),
    new AbortStep({
      defaultOptions: abortConfig,
    }),
    new QueueStep({
      defaultConfig: queueConfig,
    }),
    new EventStep({ eventManager }),
    new RetryStep({
      defaultStrategy: retryStrategy,
    }),
    new CircuitBreakerStep({
      managerOptions: circuitBreakerConfig,
    }),
    new TransportStep(transport),
    new CacheWriteStep(),
  ];

  // 创建自定义客户端
  const coreClient = new CustomRequestClient(transport, steps);

  return coreClient;
}
