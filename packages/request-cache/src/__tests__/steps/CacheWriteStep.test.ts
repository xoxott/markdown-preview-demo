/**
 * CacheWriteStep 测试
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import { createRequestContext } from '@suga/request-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { RequestCacheManager } from '../../managers/RequestCacheManager';
import { DefaultCachePolicy } from '../../policies/implementations/DefaultCachePolicy';
import { NoCachePolicy } from '../../policies/implementations/NoCachePolicy';
import { CacheWriteStep } from '../../steps/CacheWriteStep';

describe('CacheWriteStep', () => {
  let cacheManager: RequestCacheManager;
  let step: CacheWriteStep;

  beforeEach(() => {
    cacheManager = new RequestCacheManager();
    step = new CacheWriteStep({ requestCacheManager: cacheManager });
  });

  it('应该在请求成功且 cache=true 时写入缓存', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const result = { id: 1, name: 'John' };
    const ctx = createRequestContext<typeof result>(config, 'test-key', { cache: true });
    ctx.result = result;

    const next = async (): Promise<void> => {
      // 模拟请求成功
    };

    await step.execute(ctx, next);

    // 验证缓存已写入
    const cached = cacheManager.getByKey<typeof result>('test-key');
    expect(cached).toEqual(result);
  });

  it('应该在请求有错误时不写入缓存', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, 'test-key', { cache: true });
    ctx.result = { id: 1 };
    ctx.error = new Error('Request failed');

    const next = async (): Promise<void> => {
      // 模拟请求失败
    };

    await step.execute(ctx, next);

    // 验证缓存未写入
    const cached = cacheManager.getByKey('test-key');
    expect(cached).toBeNull();
  });

  it('应该在 result 为 undefined 时不写入缓存', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, 'test-key', { cache: true });
    ctx.result = undefined;

    const next = async (): Promise<void> => {
      // 模拟请求成功但没有结果
    };

    await step.execute(ctx, next);

    // 验证缓存未写入
    const cached = cacheManager.getByKey('test-key');
    expect(cached).toBeNull();
  });

  it('应该在 cache=false 时不写入缓存', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const result = { id: 1 };
    const ctx = createRequestContext<typeof result>(config, 'test-key', { cache: false });
    ctx.result = result;

    const next = async (): Promise<void> => {
      // 模拟请求成功
    };

    await step.execute(ctx, next);

    // 验证缓存未写入
    const cached = cacheManager.getByKey('test-key');
    expect(cached).toBeNull();
  });

  it('应该在 cache=undefined 时不写入缓存', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const result = { id: 1 };
    const ctx = createRequestContext<typeof result>(config, 'test-key');
    ctx.result = result;

    const next = async (): Promise<void> => {
      // 模拟请求成功
    };

    await step.execute(ctx, next);

    // 验证缓存未写入
    const cached = cacheManager.getByKey('test-key');
    expect(cached).toBeNull();
  });

  it('应该使用策略的 shouldWrite 方法判断', async () => {
    const customPolicy = new NoCachePolicy();
    const policyFactory = () => customPolicy;

    const customStep = new CacheWriteStep({
      requestCacheManager: cacheManager,
      policyFactory,
    });

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const result = { id: 1 };
    const ctx = createRequestContext<typeof result>(config, 'test-key', { cache: true });
    ctx.result = result;

    const next = async (): Promise<void> => {
      // 模拟请求成功
    };

    await customStep.execute(ctx, next);

    // NoCachePolicy 应该阻止写入缓存
    const cached = cacheManager.getByKey('test-key');
    expect(cached).toBeNull();
  });

  it('应该使用策略的 getTTL 方法获取过期时间', async () => {
    const customPolicy = new DefaultCachePolicy();
    const policyFactory = () => customPolicy;

    const customStep = new CacheWriteStep({
      requestCacheManager: cacheManager,
      policyFactory,
    });

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const result = { id: 1 };
    const ctx = createRequestContext<typeof result>(config, 'test-key', {
      cache: true,
      cacheExpireTime: 10 * 60 * 1000, // 10 分钟
    });
    ctx.result = result;

    const next = async (): Promise<void> => {
      // 模拟请求成功
    };

    await customStep.execute(ctx, next);

    // 验证缓存已写入
    const cached = cacheManager.getByKey<typeof result>('test-key');
    expect(cached).toEqual(result);
  });

  it('应该使用 ctx.id 作为缓存键', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const customId = 'custom-request-id';
    const result = { id: 1, name: 'John' };
    const ctx = createRequestContext<typeof result>(config, customId, { cache: true });
    ctx.result = result;

    const next = async (): Promise<void> => {
      // 模拟请求成功
    };

    await step.execute(ctx, next);

    // 验证使用自定义 ID 写入缓存
    const cached = cacheManager.getByKey<typeof result>(customId);
    expect(cached).toEqual(result);
  });

  it('应该先执行 next 再写入缓存', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const result = { id: 1 };
    const ctx = createRequestContext<typeof result>(config, 'test-key', { cache: true });

    let nextExecuted = false;
    const next = async (): Promise<void> => {
      nextExecuted = true;
      // 在 next 中设置结果
      ctx.result = result;
    };

    await step.execute(ctx, next);

    expect(nextExecuted).toBe(true);
    // 验证缓存已写入
    const cached = cacheManager.getByKey<typeof result>('test-key');
    expect(cached).toEqual(result);
  });
});

