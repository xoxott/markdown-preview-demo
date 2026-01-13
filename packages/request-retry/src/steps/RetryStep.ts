/**
 * 重试步骤
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import { retryRequest } from '../utils/retry-request';
import type { RetryStrategy, RetryConfig, RetryMeta } from '../types';

/**
 * 重试步骤配置
 */
export interface RetryStepOptions {
  /** 默认重试策略 */
  defaultStrategy?: RetryStrategy;
}

/**
 * 类型守卫：判断是否为重试策略对象
 */
function isRetryStrategy(value: RetryStrategy | RetryConfig): value is RetryStrategy {
  return (
    'shouldRetry' in value &&
    'retryDelay' in value &&
    typeof value.shouldRetry === 'function' &&
    typeof value.retryDelay === 'function'
  );
}

/**
 * 解析重试配置
 */
function parseRetryConfig(
  retryConfig: boolean | RetryStrategy | RetryConfig | undefined,
): {
  strategy?: RetryStrategy;
  config?: RetryConfig;
} {
  if (retryConfig === undefined) {
    return {};
  }

  if (typeof retryConfig === 'boolean') {
    return { config: { retry: retryConfig } };
  }

  if (isRetryStrategy(retryConfig)) {
    return { strategy: retryConfig };
  }

  return { config: retryConfig };
}

/**
 * 重试步骤
 */
export class RetryStep implements RequestStep {
  private defaultStrategy?: RetryStrategy;

  constructor(options: RetryStepOptions = {}) {
    this.defaultStrategy = options.defaultStrategy;
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    const retryConfig = (ctx.meta as RetryMeta)?.retry;
    if (!retryConfig) {
      return next();
    }

    const { strategy, config } = parseRetryConfig(retryConfig);
    const finalStrategy = strategy ?? this.defaultStrategy;

    await retryRequest(
      async () => {
        await next();
        if (ctx.error) {
          throw ctx.error;
        }
      },
      config,
      finalStrategy,
    );
  }
}

