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
import { CancelStep } from '@suga/request-cancel';
import { LoggerManager, configureLogger } from '@suga/request-logger';
import { AxiosTransport } from '../transport/AxiosTransport';
import type { RequestOptions, CreateRequestClientConfig } from '../types';
import { DEFAULT_TIMEOUT } from '../constants';
import { TransportStep } from '../steps/TransportStep';
import { AbortStep } from '../steps/AbortStep';
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
 * 从 CreateRequestClientConfig 中提取 Axios 配置
 * 确保不丢失任何 AxiosRequestConfig 的字段
 *
 * RequestOptions 包含的字段：
 * - baseURL: 在 AxiosRequestConfig 中也存在，需要保留（传递给 axios.create）
 * - timeout: 在 AxiosRequestConfig 中也存在，需要保留（传递给 axios.create）
 * - timeoutStrategy: 业务层独有，需要排除
 * - queueConfig: 业务层独有，需要排除
 * - dedupeConfig: 业务层独有，需要排除
 * - cancelConfig: 业务层独有，需要排除
 * - retryStrategy: 业务层独有，需要排除
 * - circuitBreakerManagerOptions: 业务层独有，需要排除
 * - loggerManager: 业务层独有，需要排除
 * - loggerConfig: 业务层独有，需要排除
 * - defaultConfig: 业务层独有，需要排除
 */
function extractAxiosConfig(config: CreateRequestClientConfig): AxiosRequestConfig {
  // 提取所有字段
  const {
    // RequestOptions 中的业务层独有字段（需要排除，不传递给 axios.create）
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
    // baseURL 和 timeout 在 RequestOptions 和 AxiosRequestConfig 中都存在
    // 它们会被包含在 rest 中，后续会保留
    // 其他所有字段都是 AxiosRequestConfig 的字段
    ...rest
  } = config;

  // rest 现在包含：
  // - baseURL, timeout（来自 RequestOptions，但也是 AxiosRequestConfig 的字段）
  // - 所有其他 AxiosRequestConfig 字段（headers, params, data, responseType, signal, cancelToken 等）

  // 直接返回 rest，因为它已经包含了所有 AxiosRequestConfig 需要的字段
  return rest as AxiosRequestConfig;
}

/**
 * 从 CreateRequestClientConfig 中提取业务层配置
 *
 * 提取的字段说明：
 * - baseURL: 用于创建 Axios 实例
 * - timeout: 用于创建 Axios 实例
 * - timeoutStrategy: 超时策略配置（预留，目前未实现对应的 Step）
 * - queueConfig: 队列配置，传递给 QueueStep 作为默认配置
 * - dedupeConfig: 去重配置，传递给 DedupeStep 作为默认配置
 * - cancelConfig: 取消配置，传递给 CancelStep 作为默认配置
 * - retryStrategy: 重试策略，传递给 RetryStep 作为默认策略
 * - circuitBreakerManagerOptions: 熔断器管理器选项，传递给 CircuitBreakerStep
 * - loggerManager: 日志管理器实例，用于全局日志配置
 * - loggerConfig: 日志配置，如果未提供 loggerManager 则创建新的 LoggerManager
 * - cacheReadStepOptions: 缓存读取步骤配置，传递给 CacheReadStep
 * - cacheWriteStepOptions: 缓存写入步骤配置，传递给 CacheWriteStep
 * - defaultConfig: 全局默认配置，传递给 ApiRequestClient
 */
function extractRequestOptions(config: CreateRequestClientConfig): RequestOptions {
  const {
    baseURL,
    timeout,
    timeoutStrategy,  // 预留配置，目前未使用（未来可能实现 TimeoutStep）
    queueConfig,       // 传递给 QueueStep 使用
    dedupeConfig,      // 传递给 DedupeStep 使用
    cancelConfig,      // 传递给 CancelStep 使用
    retryStrategy,     // 传递给 RetryStep 使用
    circuitBreakerManagerOptions, // 传递给 CircuitBreakerStep 使用
    loggerManager,     // 日志管理器实例
    loggerConfig,      // 日志配置
    cacheReadStepOptions,  // 缓存读取步骤配置
    cacheWriteStepOptions, // 缓存写入步骤配置
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
 * 创建请求客户端
 * @param config 配置（完整包含 AxiosRequestConfig 和业务层配置，所有配置都可以放在一个对象中）
 * @returns ApiRequestClient（业务层包装）
 */
export function createRequestClient(
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

