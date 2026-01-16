/**
 * createCachePolicy 测试
 */

import { describe, expect, it } from 'vitest';
import { createCachePolicy } from '../../policies/implementations/createCachePolicy';
import { DefaultCachePolicy } from '../../policies/implementations/DefaultCachePolicy';
import { NoCachePolicy } from '../../policies/implementations/NoCachePolicy';
import type { CachePolicy } from '../../policies/types';

describe('createCachePolicy', () => {
  it('应该在 cache=false 时返回 NoCachePolicy', () => {
    const policy = createCachePolicy(false);

    expect(policy).toBeInstanceOf(NoCachePolicy);
  });

  it('应该在 cache=undefined 时返回 DefaultCachePolicy', () => {
    const policy = createCachePolicy(undefined);

    expect(policy).toBeInstanceOf(DefaultCachePolicy);
  });

  it('应该在 cache=true 时返回 DefaultCachePolicy', () => {
    const policy = createCachePolicy(true);

    expect(policy).toBeInstanceOf(DefaultCachePolicy);
  });

  it('应该在传入自定义策略对象时返回该对象', () => {
    const customPolicy: CachePolicy = {
      shouldRead: () => true,
      shouldWrite: () => true,
      getTTL: () => 1000,
    };

    const policy = createCachePolicy(customPolicy);

    expect(policy).toBe(customPolicy);
  });

  it('应该识别包含 shouldRead 方法的对象为策略对象', () => {
    const customPolicy = {
      shouldRead: () => true,
      shouldWrite: () => true,
      getTTL: () => undefined,
      otherMethod: () => {},
    };

    const policy = createCachePolicy(customPolicy);

    expect(policy).toBe(customPolicy);
  });

  it('应该将 null 视为无效的策略对象', () => {
    const policy = createCachePolicy(null as any);

    expect(policy).toBeInstanceOf(DefaultCachePolicy);
  });

  it('应该将普通对象视为无效的策略对象', () => {
    const policy = createCachePolicy({ foo: 'bar' } as any);

    expect(policy).toBeInstanceOf(DefaultCachePolicy);
  });
});

