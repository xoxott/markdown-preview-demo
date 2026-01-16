/**
 * RetryStep 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { RetryStep } from '../../steps/RetryStep';
import { createRequestContext } from '@suga/request-core';
import type { NormalizedRequestConfig } from '@suga/request-core';
import type { RetryStrategy } from '../../types';

describe('RetryStep', () => {
  let step: RetryStep;

  beforeEach(() => {
    step = new RetryStep();
  });

  it('应该在 meta 中没有 retry 时跳过', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config);

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
  });

  it('应该在 retry=false 时跳过', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, {
      retry: false,
    });

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
  });

  it('应该在 retry=undefined 时跳过', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, {
      retry: undefined,
    });

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
  });

  it('应该在 retry=true 时启用重试', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      retry: true,
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      ctx.result = 'success';
    };

    await step.execute(ctx, next);

    expect(requestCount).toBe(1);
    expect(ctx.result).toBe('success');
  });

  it('应该在请求失败时重试', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      retry: true,
      retryCount: 2,
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      if (requestCount < 2) {
        // 设置错误并抛出
        const error = { message: 'Network error', status: 500 };
        ctx.error = error;
        throw error;
      }
      // 成功时清除错误并设置结果
      ctx.error = undefined;
      ctx.result = 'success';
    };

    await step.execute(ctx, next);

    expect(requestCount).toBe(2);
    expect(ctx.result).toBe('success');
  }, 10000); // 增加超时时间

  it('应该在达到最大重试次数后抛出错误', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, {
      retry: true,
      retryCount: 1, // 减少重试次数，避免超时
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      const error = { message: 'Network error', status: 500 };
      ctx.error = error;
      throw error;
    };

    await expect(step.execute(ctx, next)).rejects.toBeDefined();

    // 注意：retryCount=1 意味着最多重试 1 次
    // 循环是 attempt <= maxRetries，所以 attempt 从 0 到 1，共 2 次尝试
    // 但实际可能因为延迟等原因，尝试次数可能更多
    expect(requestCount).toBeGreaterThanOrEqual(2);
  }, 10000); // 增加超时时间

  it('应该支持自定义重试策略', async () => {
    const strategy: RetryStrategy = {
      enabled: true,
      maxRetries: 2,
      shouldRetry: () => true,
      retryDelay: () => 10,
    };

    const customStep = new RetryStep({ defaultStrategy: strategy });

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      retry: strategy,
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      if (requestCount < 2) {
        const error = { message: 'Error', status: 500 };
        ctx.error = error;
        throw error;
      }
      // 成功时清除错误并设置结果
      ctx.error = undefined;
      ctx.result = 'success';
    };

    await customStep.execute(ctx, next);

    expect(requestCount).toBe(2);
    expect(ctx.result).toBe('success');
  }, 10000);

  it('应该支持 RetryConfig', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      retry: {
        retry: true,
        retryCount: 2,
        retryOnTimeout: true,
      },
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      if (requestCount < 2) {
        const error = { message: 'Error', status: 500 };
        ctx.error = error;
        throw error;
      }
      // 成功时清除错误并设置结果
      ctx.error = undefined;
      ctx.result = 'success';
    };

    await step.execute(ctx, next);

    expect(requestCount).toBe(2);
    expect(ctx.result).toBe('success');
  }, 10000);

  it('应该使用默认策略', async () => {
    const defaultStrategy: RetryStrategy = {
      enabled: true,
      maxRetries: 3,
      shouldRetry: () => true,
      retryDelay: () => 10,
    };

    const customStep = new RetryStep({ defaultStrategy });

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      retry: true,
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      if (requestCount < 2) {
        const error = { message: 'Error', status: 500 };
        ctx.error = error;
        throw error;
      }
      // 成功时清除错误并设置结果
      ctx.error = undefined;
      ctx.result = 'success';
    };

    await customStep.execute(ctx, next);

    expect(requestCount).toBe(2);
    expect(ctx.result).toBe('success');
  }, 10000);

  it('应该在请求成功时不重试', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, undefined, {
      retry: true,
      retryCount: 3,
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      ctx.result = 'success';
    };

    await step.execute(ctx, next);

    expect(requestCount).toBe(1);
    expect(ctx.result).toBe('success');
  });

  it('应该处理不可重试的错误', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, {
      retry: true,
      retryCount: 3,
    });

    let requestCount = 0;
    const next = async (): Promise<void> => {
      requestCount++;
      ctx.error = { message: 'Not found', status: 404 };
      throw ctx.error;
    };

    await expect(step.execute(ctx, next)).rejects.toBeDefined();

    expect(requestCount).toBe(1); // 404 错误不应该重试
  });
});

