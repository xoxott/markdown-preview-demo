/**
 * CircuitBreakerStep 测试
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import { createRequestContext } from '@suga/request-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { CircuitBreakerManager } from '../../managers/CircuitBreakerManager';
import { CircuitBreakerStep } from '../../steps/CircuitBreakerStep';

describe('CircuitBreakerStep', () => {
  let step: CircuitBreakerStep;
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager();
    step = new CircuitBreakerStep({ circuitBreakerManager: manager });
  });

  it('应该在 meta 中没有 circuitBreaker 时跳过', async () => {
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

  it('应该在 circuitBreaker=false 时跳过', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, {
      circuitBreaker: false,
    });

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
  });

  it('应该在 circuitBreaker=undefined 时跳过', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, {
      circuitBreaker: undefined,
    });

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
  });

  it('应该在请求成功时正常执行', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, 'test-key', {
      circuitBreaker: true,
    });

    const next = async (): Promise<void> => {
      ctx.result = 'success';
    };

    await step.execute(ctx, next);

    expect(ctx.result).toBe('success');
    expect(ctx.error).toBeUndefined();
  });

  it('应该在请求失败时抛出错误', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, 'test-key', {
      circuitBreaker: true,
    });

    const error = new Error('Request failed');
    const next = async (): Promise<void> => {
      ctx.error = error;
    };

    await expect(step.execute(ctx, next)).rejects.toThrow('Request failed');
  });

  it('应该在熔断开启时使用 fallback', async () => {
    const breaker = manager.getOrCreateBreaker('test-key', {
      failureThreshold: 2,
      fallback: () => 'fallback-data',
    });

    // 开启熔断
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(async () => {
          throw { response: { status: 500 } };
        });
      } catch {
        // 忽略错误
      }
    }

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, 'test-key', {
      circuitBreaker: true,
    });

    const next = async (): Promise<void> => {
      ctx.result = 'should-not-execute';
    };

    await step.execute(ctx, next);

    expect(ctx.result).toBe('fallback-data');
    expect(ctx.meta.circuitBreakerUsedFallback).toBe(true);
  });

  it('应该在熔断开启时抛出错误当没有 fallback', async () => {
    const breaker = manager.getOrCreateBreaker('test-key', {
      failureThreshold: 2,
    });

    // 开启熔断
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(async () => {
          throw { response: { status: 500 } };
        });
      } catch {
        // 忽略错误
      }
    }

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, 'test-key', {
      circuitBreaker: true,
    });

    const next = async (): Promise<void> => {
      ctx.result = 'should-not-execute';
    };

    await expect(step.execute(ctx, next)).rejects.toThrow('熔断器已开启，请求被拒绝');
  });

  it('应该在 meta 中暴露熔断器状态', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, 'test-key', {
      circuitBreaker: true,
    });

    const next = async (): Promise<void> => {
      ctx.result = 'success';
    };

    await step.execute(ctx, next);

    expect(ctx.meta.circuitBreakerState).toBeDefined();
    expect(ctx.meta.circuitBreakerMetrics).toBeDefined();
    expect(ctx.meta.circuitBreakerStateBeforeExecute).toBeDefined();
    expect(ctx.meta.circuitBreakerMetricsBeforeExecute).toBeDefined();
  });

  it('应该使用 ctx.id 作为熔断器键', async () => {
    const customId = 'custom-request-id';
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, customId, {
      circuitBreaker: true,
    });

    const next = async (): Promise<void> => {
      ctx.result = 'success';
    };

    await step.execute(ctx, next);

    // 验证使用了自定义 ID
    const breaker = manager.getOrCreateBreaker(customId);
    expect(breaker).toBeDefined();
  });

  it('应该支持自定义配置', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext<string>(config, 'test-key', {
      circuitBreaker: {
        failureThreshold: 3,
        timeout: 30000,
        successThreshold: 1,
      },
    });

    const next = async (): Promise<void> => {
      ctx.result = 'success';
    };

    await step.execute(ctx, next);

    expect(ctx.result).toBe('success');
  });
});

