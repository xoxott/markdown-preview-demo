/**
 * cache-utils 测试
 */

import { describe, expect, it } from 'vitest';
import { isValidCacheItem, isCacheItemExpired, getCacheStats } from '../../utils/cache-utils';
import type { CacheItem } from '../../types/cache-item';

describe('cache-utils', () => {
  describe('isValidCacheItem', () => {
    it('应该对有效的缓存项返回 true', () => {
      const now = Date.now();
      const item: CacheItem = {
        data: { id: 1 },
        timestamp: now - 1000,
        expireTime: now + 5000,
      };

      expect(isValidCacheItem(item, now)).toBe(true);
    });

    it('应该对已过期的缓存项返回 false', () => {
      const now = Date.now();
      const item: CacheItem = {
        data: { id: 1 },
        timestamp: now - 10000,
        expireTime: now - 1000,
      };

      expect(isValidCacheItem(item, now)).toBe(false);
    });

    it('应该对 null 返回 false', () => {
      expect(isValidCacheItem(null, Date.now())).toBe(false);
    });

    it('应该对没有 expireTime 的项返回 false', () => {
      const now = Date.now();
      const item = {
        data: { id: 1 },
        timestamp: now - 1000,
      } as unknown as CacheItem;

      expect(isValidCacheItem(item, now)).toBe(false);
    });

    it('应该对刚好过期的项返回 false', () => {
      const now = Date.now();
      const item: CacheItem = {
        data: { id: 1 },
        timestamp: now - 1000,
        expireTime: now,
      };

      expect(isValidCacheItem(item, now)).toBe(false);
    });

    it('应该对即将过期的项返回 true', () => {
      const now = Date.now();
      const item: CacheItem = {
        data: { id: 1 },
        timestamp: now - 1000,
        expireTime: now + 1,
      };

      expect(isValidCacheItem(item, now)).toBe(true);
    });
  });

  describe('isCacheItemExpired', () => {
    it('应该对有效的缓存项返回 false', () => {
      const now = Date.now();
      const item: CacheItem = {
        data: { id: 1 },
        timestamp: now - 1000,
        expireTime: now + 5000,
      };

      expect(isCacheItemExpired(item, now)).toBe(false);
    });

    it('应该对已过期的缓存项返回 true', () => {
      const now = Date.now();
      const item: CacheItem = {
        data: { id: 1 },
        timestamp: now - 10000,
        expireTime: now - 1000,
      };

      expect(isCacheItemExpired(item, now)).toBe(true);
    });

    it('应该对 null 返回 true', () => {
      expect(isCacheItemExpired(null, Date.now())).toBe(true);
    });
  });

  describe('getCacheStats', () => {
    it('应该返回正确的统计信息', () => {
      const stats = getCacheStats(10, 5);

      expect(stats.memoryCount).toBe(10);
      expect(stats.storageCount).toBe(5);
    });

    it('应该使用默认的 storageCount', () => {
      const stats = getCacheStats(10);

      expect(stats.memoryCount).toBe(10);
      expect(stats.storageCount).toBe(0);
    });

    it('应该处理零值', () => {
      const stats = getCacheStats(0, 0);

      expect(stats.memoryCount).toBe(0);
      expect(stats.storageCount).toBe(0);
    });
  });
});

