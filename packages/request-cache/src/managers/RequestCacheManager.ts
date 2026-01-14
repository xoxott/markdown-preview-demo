/**
 * 请求缓存管理器
 * 协调者：组合内存缓存、存储缓存、CacheStrategyManager 等模块
 */

import { safeParseJSON, safeStringify } from '@suga/utils';
import type { StorageAdapter } from '@suga/storage';
import { defaultStorageAdapter } from '@suga/storage';
import { CacheStrategyManager } from '../strategies/CacheStrategyManager';
import { isValidCacheItem, isCacheItemExpired, getCacheStats } from '../utils/cache-utils';
import type { CacheItem } from '../types/cache-item';
import type { CacheStrategy, CustomCacheStrategy } from '../types/strategy';
import type { RequestCacheOptions } from '../types/request-cache';
import { DEFAULT_CACHE_CONFIG } from '../constants';

/**
 * 请求缓存管理器
 */
export class RequestCacheManager {
  // 内存缓存（直接使用 Map）
  private memoryCache = new Map<string, CacheItem>();
  // 存储缓存（使用 StorageAdapter）
  private storageCache: {
    prefix: string;
    adapter: StorageAdapter;
  } | null = null;
  private strategyManager: CacheStrategyManager;
  private defaultExpireTime: number;

  constructor(options: RequestCacheOptions = {}) {
    this.defaultExpireTime = options.defaultExpireTime ?? DEFAULT_CACHE_CONFIG.DEFAULT_EXPIRE_TIME;
    this.storageCache = options.useStorage
      ? {
          prefix: options.storagePrefix ?? DEFAULT_CACHE_CONFIG.STORAGE_PREFIX,
          adapter: options.storageAdapter ?? defaultStorageAdapter,
        }
      : null;
    this.strategyManager = new CacheStrategyManager(
      options.strategy ?? 'time',
      options.maxSize ?? DEFAULT_CACHE_CONFIG.DEFAULT_MAX_SIZE,
      options.customStrategy,
    );
  }

  /**
   * 获取存储键名（带前缀）
   */
  private getStorageKey(key: string): string {
    return this.storageCache ? `${this.storageCache.prefix}${key}` : key;
  }

  /**
   * 从内存缓存获取有效数据
   */
  private getFromMemoryCache<T>(key: string): T | null {
    const now = Date.now();
    const item = this.memoryCache.get(key) as CacheItem<T> | undefined;

    if (!item) {
      return null;
    }

    if (!isValidCacheItem(item, now)) {
      this.memoryCache.delete(key);
      this.strategyManager.removeFromAccessOrder(key);
      return null;
    }

    this.strategyManager.updateAccessOrder(key);
    return item.data;
  }

  /**
   * 从存储缓存获取有效数据
   */
  private getFromStorageCache<T>(key: string): T | null {
    if (!this.storageCache) {
      return null;
    }

    const now = Date.now();
    const cached = this.storageCache.adapter.getItem(this.getStorageKey(key));
    const item = safeParseJSON<CacheItem<T> | null>(cached, null);

    if (!item) {
      return null;
    }

    if (!isValidCacheItem(item, now)) {
      this.storageCache.adapter.removeItem(this.getStorageKey(key));
      return null;
    }

    // 将存储缓存的数据同步到内存缓存
    this.memoryCache.set(key, item);
    return item.data;
  }

  /**
   * 通过键获取缓存（直接使用 ctx.id）
   */
  getByKey<T = unknown>(key: string): T | null {
    const memoryData = this.getFromMemoryCache<T>(key);

    if (memoryData !== null) {
      return memoryData;
    }

    return this.getFromStorageCache<T>(key);
  }

  /**
   * 应用缓存策略，清理超出限制的缓存
   */
  private applyCacheStrategy(key: string): void {
    const currentSize = this.memoryCache.size;
    const cacheEntries = Array.from(this.memoryCache.entries());
    const keysToDelete = this.strategyManager.applyStrategy(currentSize, key, cacheEntries);

    for (const deleteKey of keysToDelete) {
      this.memoryCache.delete(deleteKey);
      this.strategyManager.removeFromAccessOrder(deleteKey);
      if (this.storageCache) {
        this.storageCache.adapter.removeItem(this.getStorageKey(deleteKey));
      }
    }
  }

  /**
   * 通过键设置缓存（直接使用 ctx.id）
   */
  setByKey<T = unknown>(key: string, data: T, expireTime?: number): void {
    const now = Date.now();
    const expire = expireTime ?? this.defaultExpireTime;

    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expireTime: now + expire,
    };

    this.applyCacheStrategy(key);
    this.memoryCache.set(key, cacheItem);

    const strategy = this.strategyManager.getStrategy();
    if (strategy === 'lru') {
      this.strategyManager.updateAccessOrder(key);
    } else if (strategy === 'fifo') {
      this.strategyManager.addToAccessOrder(key);
    }

    // 同步到存储缓存
    if (this.storageCache) {
      const json = safeStringify(cacheItem, false);
      this.storageCache.adapter.setItem(this.getStorageKey(key), json);
    }
  }

  /**
   * 通过键删除缓存（直接使用 ctx.id）
   */
  deleteByKey(key: string): void {
    this.memoryCache.delete(key);
    this.strategyManager.removeFromAccessOrder(key);

    if (this.storageCache) {
      this.storageCache.adapter.removeItem(this.getStorageKey(key));
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear();
    this.strategyManager = new CacheStrategyManager(
      this.strategyManager.getStrategy(),
      this.strategyManager.getMaxSize(),
    );

    if (this.storageCache) {
      const allKeys = this.storageCache.adapter.getAllKeys();
      for (const storageKey of allKeys) {
        if (storageKey.startsWith(this.storageCache.prefix)) {
          this.storageCache.adapter.removeItem(storageKey);
        }
      }
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(_force: boolean = false): void {
    const cacheEntries = Array.from(this.memoryCache.entries());
    const now = Date.now();

    for (const [key, item] of cacheEntries) {
      if (isCacheItemExpired(item, now)) {
        this.memoryCache.delete(key);
        this.strategyManager.removeFromAccessOrder(key);
        if (this.storageCache) {
          this.storageCache.adapter.removeItem(this.getStorageKey(key));
        }
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { memoryCount: number; storageCount: number } {
    const memoryCount = this.memoryCache.size;
    const storageCount = this.storageCache
      ? this.storageCache.adapter
          .getAllKeys()
          .filter((key: string) => key.startsWith(this.storageCache!.prefix)).length
      : 0;
    return getCacheStats(memoryCount, storageCount);
  }

  /**
   * 设置默认过期时间
   */
  setDefaultExpireTime(expireTime: number): void {
    this.defaultExpireTime = expireTime;
  }

  /**
   * 设置缓存策略
   */
  setStrategy(strategy: CacheStrategy): void {
    this.strategyManager.setStrategy(strategy);
  }

  /**
   * 设置最大缓存数量
   */
  setMaxSize(maxSize: number): void {
    const currentSize = this.memoryCache.size;
    const strategy = this.strategyManager.getStrategy();

    this.strategyManager.setMaxSize(maxSize);

    if (currentSize <= maxSize) {
      return;
    }

    if (strategy === 'lru' || strategy === 'fifo') {
      const cacheEntries = Array.from(this.memoryCache.entries());
      const keysToDelete = this.strategyManager.applyStrategy(currentSize, '', cacheEntries);

      for (const deleteKey of keysToDelete) {
        this.memoryCache.delete(deleteKey);
        this.strategyManager.removeFromAccessOrder(deleteKey);
        if (this.storageCache) {
          this.storageCache.adapter.removeItem(this.getStorageKey(deleteKey));
        }
      }
    }
  }

  /**
   * 设置自定义缓存策略
   */
  setCustomStrategy(strategy: CustomCacheStrategy): void {
    this.strategyManager.setCustomStrategy(strategy);
  }
}
