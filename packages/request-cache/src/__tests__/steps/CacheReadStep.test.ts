/**
 * CacheReadStep 测试
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import { createRequestContext } from '@suga/request-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { RequestCacheManager } from '../../managers/RequestCacheManager';
import { DefaultCachePolicy } from '../../policies/implementations/DefaultCachePolicy';
import { NoCachePolicy } from '../../policies/implementations/NoCachePolicy';
import { CacheReadStep } from '../../steps/CacheReadStep';

describe('CacheReadStep', () => {
  let cacheManager: RequestCacheManager;
  let step: CacheReadStep;

  beforeEach(() => {
    cacheManager = new RequestCacheManager();
    step = new CacheReadStep({ requestCacheManager: cacheManager });
  });

  it('应该在缓存未命中时继续执行下一步', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, undefined, { cache: true });

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
    expect(ctx.result).toBeUndefined();
    expect(ctx.state.fromCache).toBe(false);
  });

  it('应该在缓存命中时返回缓存数据并跳过下一步', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const cachedData = { id: 1, name: 'John' };
    const ctx = createRequestContext<typeof cachedData>(config, 'test-key', { cache: true });

    // 先设置缓存
    cacheManager.setByKey('test-key', cachedData, 5000);

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(false);
    expect(ctx.result).toEqual(cachedData);
    expect(ctx.state.fromCache).toBe(true);
  });

  it('应该在 cache=false 时跳过缓存检查', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, 'test-key', { cache: false });

    // 设置缓存
    cacheManager.setByKey('test-key', { id: 1 }, 5000);

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
    expect(ctx.result).toBeUndefined();
    expect(ctx.state.fromCache).toBe(false);
  });

  it('应该在 cache=undefined 时跳过缓存检查', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, 'test-key');

    // 设置缓存
    cacheManager.setByKey('test-key', { id: 1 }, 5000);

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(true);
    expect(ctx.result).toBeUndefined();
  });

  it('应该使用自定义策略工厂', async () => {
    const customPolicy = new NoCachePolicy();
    const policyFactory = () => customPolicy;

    const customStep = new CacheReadStep({
      requestCacheManager: cacheManager,
      policyFactory,
    });

    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const ctx = createRequestContext(config, 'test-key', { cache: true });

    // 设置缓存
    cacheManager.setByKey('test-key', { id: 1 }, 5000);

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await customStep.execute(ctx, next);

    // NoCachePolicy 应该阻止读取缓存
    expect(nextCalled).toBe(true);
    expect(ctx.result).toBeUndefined();
  });

  it('应该使用策略的 shouldRead 方法判断', async () => {
    const customPolicy = new DefaultCachePolicy();
    const policyFactory = () => customPolicy;

    const customStep = new CacheReadStep({
      requestCacheManager: cacheManager,
      policyFactory,
    });

    // POST 请求应该被策略拒绝
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'POST',
    };
    const ctx = createRequestContext(config, 'test-key', { cache: true });

    // 设置缓存
    cacheManager.setByKey('test-key', { id: 1 }, 5000);

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await customStep.execute(ctx, next);

    // DefaultCachePolicy 对 POST 请求返回 false
    expect(nextCalled).toBe(true);
    expect(ctx.result).toBeUndefined();
  });

  it('应该使用 ctx.id 作为缓存键', async () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };
    const customId = 'custom-request-id';
    const cachedData = { id: 1, name: 'John' };
    const ctx = createRequestContext<typeof cachedData>(config, customId, { cache: true });

    // 使用自定义 ID 设置缓存
    cacheManager.setByKey(customId, cachedData, 5000);

    let nextCalled = false;
    const next = async (): Promise<void> => {
      nextCalled = true;
    };

    await step.execute(ctx, next);

    expect(nextCalled).toBe(false);
    expect(ctx.result).toEqual(cachedData);
    expect(ctx.state.fromCache).toBe(true);
  });
});

