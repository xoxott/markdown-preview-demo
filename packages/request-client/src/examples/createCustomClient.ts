/**
 * 自定义请求客户端组装示例
 * 
 * 展示如何根据业务需求自由组合功能包
 */

import axios, { type AxiosInstance } from 'axios';
import { RequestClient } from '@suga/request-core';
import { PrepareContextStep } from '@suga/request-core';
import type { RequestStep } from '@suga/request-core';
import { AxiosTransport, TransportStep, AbortStep } from '@suga/request-axios';
import { RetryStep } from '@suga/request-retry';
import type { RetryStrategy } from '@suga/request-retry';
import { DedupeStep } from '@suga/request-dedupe';
import type { DedupeOptions } from '@suga/request-dedupe';
import { EventStep } from '@suga/request-events';

/**
 * 自定义客户端配置选项
 */
export interface CustomClientOptions {
  baseURL?: string;
  timeout?: number;
  enableRetry?: boolean;
  enableDedupe?: boolean;
  enableEvents?: boolean;
  retryConfig?: RetryStrategy;
  dedupeConfig?: DedupeOptions;
}

/**
 * 创建自定义请求客户端
 * 
 * 根据配置选项选择性地添加功能步骤
 * 
 * @param options 配置选项
 * @returns RequestClient 实例
 */
export function createCustomClient(
  options: CustomClientOptions = {},
): RequestClient {
  const {
    baseURL = '/api',
    timeout = 10000,
    enableRetry = false,
    enableDedupe = false,
    enableEvents = false,
    retryConfig,
    dedupeConfig,
  } = options;

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

  // 构建步骤链（根据配置动态添加）
  const steps: RequestStep[] = [
    new PrepareContextStep(),
  ];

  // 条件添加去重步骤
  if (enableDedupe) {
    steps.push(new DedupeStep({
      defaultOptions: dedupeConfig,
    }));
  }

  // 添加取消检查步骤
  steps.push(new AbortStep());

  // 条件添加重试步骤
  if (enableRetry) {
    steps.push(new RetryStep({
      defaultStrategy: retryConfig,
    }));
  }

  // 条件添加事件步骤
  if (enableEvents) {
    steps.push(new EventStep());
  }

  // 添加传输步骤（必须）
  steps.push(new TransportStep(transport));

  // 创建客户端
  const client = new RequestClient(transport);
  
  // 添加所有步骤
  for (const step of steps) {
    client.with(step);
  }

  return client;
}

