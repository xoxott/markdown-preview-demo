/**
 * 创建默认请求客户端示例
 * 
 * 注意：这只是一个示例函数，展示如何使用各个功能包组装请求客户端
 * 业务层应该根据实际需求自行组装，而不是依赖固定的组合
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
import { CancelStep } from '@suga/request-abort';
import { LoggerManager, configureLogger } from '@suga/request-logger';
import { AxiosTransport, TransportStep, AbortStep } from '@suga/request-axios';
import type { RequestOptions, CreateRequestClientConfig } from '../types';
import { DEFAULT_TIMEOUT } from '../constants';
import { ApiRequestClient } from '../client/ApiRequestClient';

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
 * 从 CreateRequestClientConfig 中提取 Axios 配置
 */
function extractAxiosConfig(config: CreateRequestClientConfig): AxiosRequestConfig {
  const {
    timeoutStrategy,
    queueConfig,
    dedupeConfig,
    cancelConfig,
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
 * 从 CreateRequestClientConfig 中提取业务层配置
 */
function extractRequestOptions(config: CreateRequestClientConfig): RequestOptions {
  const {
    baseURL,
    timeout,
    timeoutStrategy,
    queueConfig,
    dedupeConfig,
    cancelConfig,
    retryStrategy,
    circuitBreakerManagerOptions,
    loggerManager,
    loggerConfig,
    cacheReadStepOptions,
    cacheWriteStepOptions,
    defaultConfig,
  } = config;

  return {
    baseURL,
    timeout,
    timeoutStrategy,
    queueConfig,
    dedupeConfig,
    cancelConfig,
    retryStrategy,
    circuitBreakerManagerOptions,
    loggerManager,
    loggerConfig,
    cacheReadStepOptions,
    cacheWriteStepOptions,
    defaultConfig,
  };
}

/**
 * 创建请求客户端示例（包含所有功能）
 * 
 * ⚠️ 注意：这只是一个示例，展示如何组装所有功能包
 * 业务层应该根据实际需求选择需要的功能包，而不是使用这个固定的组合
 * 
 * @param config 配置（完整包含 AxiosRequestConfig 和业务层配置）
 * @returns ApiRequestClient（业务层包装）
 */
export function createDefaultClient(
  config?: CreateRequestClientConfig,
): ApiRequestClient {
  const cfg = config || {};

  // 提取业务层配置
  const requestOptions = extractRequestOptions(cfg);
  const baseURL = requestOptions.baseURL || '/api';
  const timeout = requestOptions.timeout || DEFAULT_TIMEOUT;

  // 提取 Axios 配置（包含所有 AxiosRequestConfig 字段）
  const axiosConfig = extractAxiosConfig(cfg);

  // 创建 Axios 实例（所有 AxiosRequestConfig 字段都会被传递）
  const instance: AxiosInstance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
    // 合并所有 Axios 配置，确保不丢失任何字段
    ...axiosConfig,
  });

  // 创建传输层（使用新的 AxiosTransport）
  const transport = new AxiosTransport({ instance });

  // 创建日志管理器（如果提供了配置）
  const loggerManager = requestOptions.loggerManager
    || (requestOptions.loggerConfig ? new LoggerManager(requestOptions.loggerConfig) : undefined);

  // 如果配置了日志管理器，设置全局日志配置（供事件监听器使用）
  if (loggerManager && requestOptions.loggerConfig) {
    // 配置全局日志管理器
    configureLogger(requestOptions.loggerConfig);
  }

  // 手动构建步骤链（按执行顺序）
  // 这是一个示例组合，业务层应该根据需求调整
  const steps: RequestStep[] = [
    new PrepareContextStep(),
    new CacheReadStep({
      // 使用全局缓存读取步骤配置
      requestCacheManager: requestOptions.cacheReadStepOptions?.requestCacheManager,
      policyFactory: requestOptions.cacheReadStepOptions?.policyFactory,
    }),
    new DedupeStep({
      // 使用全局去重配置作为默认配置
      defaultOptions: requestOptions.dedupeConfig,
    }),
    new AbortStep(), // 检查标准的 AbortSignal（在 CancelStep 之前）
    new CancelStep({
      // 使用全局取消配置作为默认配置
      defaultOptions: requestOptions.cancelConfig,
    }),
    new QueueStep({
      // 使用全局队列配置作为默认配置
      defaultConfig: requestOptions.queueConfig,
    }),
    new RetryStep({
      // 使用全局重试策略作为默认策略
      defaultStrategy: requestOptions.retryStrategy,
    }),
    new CircuitBreakerStep({
      // 使用全局熔断器管理器选项
      managerOptions: requestOptions.circuitBreakerManagerOptions,
    }),
    new EventStep(), // 日志功能通过监听事件实现，loggerManager 可通过事件监听器使用
    new TransportStep(transport), // 使用业务层的 TransportStep（包装了业务逻辑）
    new CacheWriteStep({
      // 使用全局缓存写入步骤配置
      requestCacheManager: requestOptions.cacheWriteStepOptions?.requestCacheManager,
      policyFactory: requestOptions.cacheWriteStepOptions?.policyFactory,
    }),
  ];

  // 创建自定义客户端
  const coreClient = new CustomRequestClient(transport, steps);

  // 返回业务层包装的客户端（传递全局默认配置）
  return new ApiRequestClient(coreClient, requestOptions.defaultConfig);
}

