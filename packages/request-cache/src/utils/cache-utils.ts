/**
 * 缓存工具函数
 * 单一职责：提供缓存清理和统计等工具函数
 */

import type { CacheItem } from '../caches/MemoryCache';

/**
 * 检查缓存项是否有效（未过期）
 */
export function isValidCacheItem(item: CacheItem | null, now: number): boolean {
  if (!item || !item.expireTime) {
    return false;
  }
  return now < item.expireTime;
}

/**
 * 检查缓存项是否已过期
 */
export function isCacheItemExpired(item: CacheItem | null, now: number): boolean {
  return !isValidCacheItem(item, now);
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(
  memoryCount: number,
  storageCount: number = 0,
): {
  memoryCount: number;
  storageCount: number;
} {
  return {
    memoryCount,
    storageCount,
  };
}

