/* eslint-disable consistent-return */
/** 重试步骤 */

import {
  PIPELINE_RUN_FROM_INDEX_META,
  PIPELINE_STEP_INDEX_META,
  type PipelineRunFromIndex,
  type RequestContext,
  type RequestStep,
  resolveStepMetaFlag
} from '@suga/request-core';
import { retryRequest } from '../utils/retry-request';
import type { RetryConfig, RetryMeta, RetryStrategy } from '../types';

/** 重试步骤配置 */
export interface RetryStepOptions {
  /** 默认重试策略 */
  defaultStrategy?: RetryStrategy;
  /** meta.retry 未设置时是否默认启用（显式 retry: false 仍可关闭） */
  enabledByDefault?: boolean;
}

/** 类型守卫：判断是否为重试策略对象 */
function isRetryStrategy(value: RetryStrategy | RetryConfig): value is RetryStrategy {
  return (
    'shouldRetry' in value &&
    'retryDelay' in value &&
    typeof value.shouldRetry === 'function' &&
    typeof value.retryDelay === 'function'
  );
}

/** 解析重试配置 */
function parseRetryConfig(retryConfig: boolean | RetryStrategy | RetryConfig | undefined): {
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

/** 重试步骤 */
export class RetryStep implements RequestStep {
  private defaultStrategy?: RetryStrategy;
  private enabledByDefault: boolean;

  constructor(options: RetryStepOptions = {}) {
    this.defaultStrategy = options.defaultStrategy;
    this.enabledByDefault = options.enabledByDefault ?? false;
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    const retryConfig = resolveStepMetaFlag((ctx.meta as RetryMeta)?.retry, this.enabledByDefault);
    if (!retryConfig) {
      return next();
    }

    const { strategy, config } = parseRetryConfig(retryConfig);
    const finalStrategy = strategy ?? this.defaultStrategy;

    const runFromIndex = ctx.meta[PIPELINE_RUN_FROM_INDEX_META] as PipelineRunFromIndex | undefined;
    const stepIndex = ctx.meta[PIPELINE_STEP_INDEX_META] as number | undefined;

    const runAttempt =
      runFromIndex !== undefined && stepIndex !== undefined
        ? async () => {
            await runFromIndex(stepIndex + 1);
          }
        : async () => {
            await next();
          };

    await retryRequest(
      async () => {
        await runAttempt();
        if (ctx.error) {
          throw ctx.error;
        }
      },
      config,
      finalStrategy
    );
  }
}
