/**
 * 创建请求客户端（业务层封装）
 *
 * 注意：这是业务层封装，可以根据实际需求修改
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import {
  RequestClient,
  PrepareContextStep,
  RequestExecutor,
  type RequestStep,
  type Transport,
} from '@suga/request-core';
import { CacheReadStep, CacheReadStepOptions, CacheWriteStep, CacheWriteStepOptions } from '@suga/request-cache';
import { RetryStep, RetryStrategy } from '@suga/request-retry';
import { CircuitBreakerManagerOptions, CircuitBreakerStep } from '@suga/request-circuit-breaker';
import { DedupeOptions, DedupeStep } from '@suga/request-dedupe';
import { QueueConfig, QueueStep } from '@suga/request-queue';
import { EventStep } from '@suga/request-events';
import { AbortOptions, AbortStep } from '@suga/request-abort';
import { LoggerManager, LoggerOptions, configureLogger } from '@suga/request-logger';
import { AxiosTransport, TransportStep } from './index';

/**
 * 创建请求客户端配置
 */
export interface CreateRequestClientConfig extends AxiosRequestConfig {
  // 业务层配置
  queueConfig?: QueueConfig;
  dedupeConfig?: DedupeOptions;
  abortConfig?: AbortOptions;
  retryStrategy?: RetryStrategy;
  circuitBreakerManagerOptions?: CircuitBreakerManagerOptions;
  loggerManager?: LoggerManager;
  loggerConfig?: LoggerOptions;
  cacheReadStepOptions?: CacheReadStepOptions;
  cacheWriteStepOptions?: CacheWriteStepOptions;
  defaultConfig?: Partial<Record<string, unknown>>;
}

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

/**
 * 提取 Axios 配置
 */
function extractAxiosConfig(config: CreateRequestClientConfig): AxiosRequestConfig {
  const {
    queueConfig,
    dedupeConfig,
    abortConfig,
    retryStrategy,
    circuitBreakerManagerOptions,
    loggerManager,
    loggerConfig,
    cacheReadStepOptions,
    cacheWriteStepOptions,
    defaultConfig,
    ...rest
  } = config;
  return rest as AxiosRequestConfig;
}

/**
 * 创建请求客户端
 *
 * 注意：这是一个示例实现，业务层可以根据需求修改
 */
export function createRequestClient(config?: CreateRequestClientConfig) {
  const cfg = config || {};
  const baseURL = cfg.baseURL || '/api';
  const timeout = cfg.timeout || 10000;

  // 提取 Axios 配置
  const axiosConfig = extractAxiosConfig(cfg);

  // 创建 Axios 实例
  const instance: AxiosInstance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
    ...axiosConfig,
  });

  // 创建传输层
  const transport = new AxiosTransport({ instance });

  // 创建日志管理器
  const loggerManager = cfg.loggerManager
    || (cfg.loggerConfig ? new LoggerManager(cfg.loggerConfig) : undefined);

  if (loggerManager && cfg.loggerConfig) {
    configureLogger(cfg.loggerConfig);
  }

  // 构建步骤链
  const steps: RequestStep[] = [
    new PrepareContextStep(),
    new CacheReadStep({
      requestCacheManager: cfg.cacheReadStepOptions?.requestCacheManager,
      policyFactory: cfg.cacheReadStepOptions?.policyFactory,
    }),
    new DedupeStep({
      defaultOptions: cfg.dedupeConfig,
    }),
    new AbortStep(),
    new AbortStep({
      defaultOptions: cfg.abortConfig,
    }),
    new QueueStep({
      defaultConfig: cfg.queueConfig,
    }),
    new RetryStep({
      defaultStrategy: cfg.retryStrategy,
    }),
    new CircuitBreakerStep({
      managerOptions: cfg.circuitBreakerManagerOptions,
    }),
    new EventStep(),
    new TransportStep(transport),
    new CacheWriteStep({
      requestCacheManager: cfg.cacheWriteStepOptions?.requestCacheManager,
      policyFactory: cfg.cacheWriteStepOptions?.policyFactory,
    }),
  ];

  // 创建自定义客户端
  const coreClient = new CustomRequestClient(transport, steps);

  // 返回客户端（简化版本，直接返回 RequestClient）
  // 如果需要 ApiRequestClient 的功能，可以在业务层包装
  return coreClient;
}

