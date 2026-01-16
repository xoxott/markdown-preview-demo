/**
 * NoCachePolicy 测试
 */

import { describe, expect, it } from 'vitest';
import { NoCachePolicy } from '../../policies/implementations/NoCachePolicy';
import type { NormalizedRequestConfig } from '@suga/request-core';
import type { CacheMeta } from '../../policies/types';

describe('NoCachePolicy', () => {
  const policy = new NoCachePolicy();

  describe('shouldRead', () => {
    it('应该始终返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: true };

      expect(policy.shouldRead(config, meta)).toBe(false);
    });

    it('应该在没有 meta 时也返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      expect(policy.shouldRead(config)).toBe(false);
    });
  });

  describe('shouldWrite', () => {
    it('应该始终返回 false', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: true };
      const data = { id: 1 };

      expect(policy.shouldWrite(config, data, meta)).toBe(false);
    });
  });

  describe('getTTL', () => {
    it('应该始终返回 undefined', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const meta: CacheMeta = { cache: true, cacheExpireTime: 1000 };

      expect(policy.getTTL(config, meta)).toBeUndefined();
    });
  });
});

