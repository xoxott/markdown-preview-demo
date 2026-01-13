/**
 * 请求缓存管理器
 * 协调者：组合 MemoryCache、StorageCache、CacheStrategyManager 等模块
 */

import { generateKey } from '@suga/utils';
import type { NormalizedRequestConfig } from '@suga/request-core';
import { MemoryCache, type CacheItem } from '../caches/MemoryCache';
import { StorageCache } from '../caches/StorageCache';
import { CacheStrategyManager } from '../strategies/CacheStrategyManager';
import { isValidCacheItem, isCacheItemExpired, getCacheStats } from '../utils/cache-utils';
import type { CacheStrategy, CustomCacheStrategy } from '../types/strategy';
import type { RequestCacheOptions } from '../types/request-cache';
import { DEFAULT_CACHE_CONFIG } from '../constants';


/**
 * 请求缓存管理器
 */
export class RequestCacheManager {
  private memoryCache: MemoryCache;
  private storageCache: StorageCache | null;
  private strategyManager: CacheStrategyManager;
  private defaultExpireTime: number;

  constructor(options: RequestCacheOptions = {}) {
    this.defaultExpireTime = options.defaultExpireTime ?? DEFAULT_CACHE_CONFIG.DEFAULT_EXPIRE_TIME;
    this.memoryCache = new MemoryCache();
    this.storageCache = options.useStorage
      ? new StorageCache(
          options.storagePrefix ?? DEFAULT_CACHE_CONFIG.STORAGE_PREFIX,
          options.storageAdapter,
        )
      : null;
    this.strategyManager = new CacheStrategyManager(
      options.strategy ?? 'time',
      options.maxSize ?? DEFAULT_CACHE_CONFIG.DEFAULT_MAX_SIZE,
      options.customStrategy,
    );
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(config: NormalizedRequestConfig): string {
    const { url, method, params, data } = config;
    return generateKey(method || 'GET', url || '', params, data);
  }

  /**
   * 从内存缓存获取有效数据
   */
  private getFromMemoryCache<T>(key: string): T | null {
    const now = Date.now();
    const item = this.memoryCache.get<T>(key);

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
    const item = this.storageCache.get<T>(key);

    if (!item) {
      return null;
    }

    if (!isValidCacheItem(item, now)) {
      this.storageCache.delete(key);
      return null;
    }

    this.memoryCache.set(key, item);
    return item.data;
  }

  /**
   * 获取缓存
   */
  get<T = unknown>(config: NormalizedRequestConfig): T | null {
    const key = this.generateCacheKey(config);
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
    const currentSize = this.memoryCache.size();
    const cacheEntries = this.memoryCache.entries();
    const keysToDelete = this.strategyManager.applyStrategy(currentSize, key, cacheEntries);

    for (const deleteKey of keysToDelete) {
      this.memoryCache.delete(deleteKey);
      this.strategyManager.removeFromAccessOrder(deleteKey);
    }
  }

  /**
   * 设置缓存
   */
  set<T = unknown>(config: NormalizedRequestConfig, data: T, expireTime?: number): void {
    const key = this.generateCacheKey(config);
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

    if (this.storageCache) {
      this.storageCache.set(key, cacheItem);
    }
  }

  /**
   * 删除缓存
   */
  delete(config: NormalizedRequestConfig): void {
    const key = this.generateCacheKey(config);
    this.memoryCache.delete(key);
    this.strategyManager.removeFromAccessOrder(key);

    if (this.storageCache) {
      this.storageCache.delete(key);
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
      this.storageCache.clear();
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(_force: boolean = false): void {
    const cacheEntries = this.memoryCache.entries();
    const now = Date.now();

    for (const [key, item] of cacheEntries) {
      if (isCacheItemExpired(item, now)) {
        this.memoryCache.delete(key);
        this.strategyManager.removeFromAccessOrder(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { memoryCount: number; storageCount: number } {
    const memoryCount = this.memoryCache.size();
    const storageCount = this.storageCache?.size() ?? 0;
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
    const currentSize = this.memoryCache.size();
    const strategy = this.strategyManager.getStrategy();

    this.strategyManager.setMaxSize(maxSize);

    if (currentSize <= maxSize) {
      return;
    }

    if (strategy === 'lru' || strategy === 'fifo') {
      const cacheEntries = this.memoryCache.entries();
      const keysToDelete = this.strategyManager.applyStrategy(currentSize, '', cacheEntries);

      for (const deleteKey of keysToDelete) {
        this.memoryCache.delete(deleteKey);
        this.strategyManager.removeFromAccessOrder(deleteKey);
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

