/**
 * DefaultCachePolicy 测试
 */

import { describe, expect, it } from 'vitest';
import { DefaultCachePolicy } from '../../policies/implementations/DefaultCachePolicy';
import type { NormalizedRequestConfig } from '@suga/request-core';
import type { CacheMeta } from '../../policies/types';

describe('DefaultCachePolicy', () => {
  const policy = new DefaultCachePolicy();

  describe('shouldRead', () => {
    it('应该对 GET 请求和 cache=true 返回 true', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: true };

      expect(policy.shouldRead(config, meta)).toBe(true);
    });

    it('应该对 GET 请求和 cache=false 返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: false };

      expect(policy.shouldRead(config, meta)).toBe(false);
    });

    it('应该对非 GET 请求返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST',
      };
      const meta: CacheMeta = { cache: true };

      expect(policy.shouldRead(config, meta)).toBe(false);
    });

    it('应该对 cache=undefined 返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      expect(policy.shouldRead(config)).toBe(false);
    });

    it('应该对自定义策略对象返回 true', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const customPolicy = {
        shouldRead: () => true,
        shouldWrite: () => true,
        getTTL: () => undefined,
      };
      const meta: CacheMeta = { cache: customPolicy };

      expect(policy.shouldRead(config, meta)).toBe(true);
    });

    it('应该对小写的 GET 方法返回 true', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'get',
      };
      const meta: CacheMeta = { cache: true };

      expect(policy.shouldRead(config, meta)).toBe(true);
    });
  });

  describe('shouldWrite', () => {
    it('应该对有效数据返回 true', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: true };
      const data = { id: 1, name: 'John' };

      expect(policy.shouldWrite(config, data, meta)).toBe(true);
    });

    it('应该对 null 返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: true };

      expect(policy.shouldWrite(config, null, meta)).toBe(false);
    });

    it('应该对 undefined 返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: true };

      expect(policy.shouldWrite(config, undefined, meta)).toBe(false);
    });

    it('应该对非 GET 请求返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST',
      };
      const meta: CacheMeta = { cache: true };
      const data = { id: 1 };

      expect(policy.shouldWrite(config, data, meta)).toBe(false);
    });

    it('应该对 cache=false 返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: false };
      const data = { id: 1 };

      expect(policy.shouldWrite(config, data, meta)).toBe(false);
    });
  });

  describe('getTTL', () => {
    it('应该从 meta.cacheExpireTime 获取 TTL', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = {
        cache: true,
        cacheExpireTime: 10 * 60 * 1000,
      };

      expect(policy.getTTL(config, meta)).toBe(10 * 60 * 1000);
    });

    it('应该从 cache 对象的 ttl 属性获取 TTL', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = {
        cache: { ttl: 5 * 60 * 1000 } as any,
      };

      expect(policy.getTTL(config, meta)).toBe(5 * 60 * 1000);
    });

    it('应该优先使用 cacheExpireTime 而不是 cache.ttl', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = {
        cache: { ttl: 5 * 60 * 1000 } as any,
        cacheExpireTime: 10 * 60 * 1000,
      };

      expect(policy.getTTL(config, meta)).toBe(10 * 60 * 1000);
    });

    it('应该在没有 TTL 配置时返回 undefined', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: true };

      expect(policy.getTTL(config, meta)).toBeUndefined();
    });

    it('应该在没有 meta 时返回 undefined', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      expect(policy.getTTL(config)).toBeUndefined();
    });
  });
});

