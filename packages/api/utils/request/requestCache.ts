/**
 * 请求缓存工具
 * 协调者：组合 MemoryCache、StorageCache、CacheStrategyManager 等模块
 */

import { DEFAULT_CACHE_CONFIG } from '../../constants';
import { generateKey } from '../common/serialization';
import { internalWarn } from '../common/internalLogger';
import type { RequestConfig } from '../../types';
import { MemoryCache, type CacheItem } from '../cache/MemoryCache';
import { StorageCache } from '../cache/StorageCache';
import { CacheStrategyManager } from '../cache/CacheStrategyManager';
import { isValidCacheItem, isCacheItemExpired, getCacheStats } from '../cache/cacheUtils';
import type { CacheStrategy, CustomCacheStrategy } from '../cache/types';

/**
 * 请求缓存配置
 */
export interface RequestCacheOptions {
  /** 默认缓存过期时间（毫秒），默认 5 分钟 */
  defaultExpireTime?: number;
  /** 是否启用 localStorage 缓存 */
  useLocalStorage?: boolean;
  /** localStorage 缓存键前缀 */
  localStoragePrefix?: string;
  /** 缓存策略，默认 'time' */
  strategy?: CacheStrategy;
  /** 最大缓存数量（LRU/FIFO 策略使用） */
  maxSize?: number;
  /** 自定义缓存策略函数（仅在 strategy 为 'custom' 时有效） */
  customStrategy?: CustomCacheStrategy;
}

/**
 * 请求缓存管理器
 * 协调者：组合各个缓存模块，提供统一的缓存接口
 */
class RequestCacheManager {
  private memoryCache: MemoryCache;
  private storageCache: StorageCache | null;
  private strategyManager: CacheStrategyManager;
  private defaultExpireTime: number;

  constructor(options: RequestCacheOptions = {}) {
    this.defaultExpireTime = options.defaultExpireTime ?? DEFAULT_CACHE_CONFIG.DEFAULT_EXPIRE_TIME;
    this.memoryCache = new MemoryCache();
    this.storageCache = options.useLocalStorage
      ? new StorageCache(options.localStoragePrefix ?? DEFAULT_CACHE_CONFIG.LOCAL_STORAGE_PREFIX)
      : null;
    this.strategyManager = new CacheStrategyManager(
      options.strategy ?? 'time',
      options.maxSize ?? 100,
      options.customStrategy,
    );
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(config: RequestConfig): string {
    const { url, method, params } = config;
    return generateKey(method || 'GET', url || '', params);
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
  get<T = unknown>(config: RequestConfig): T | null {
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
  set<T = unknown>(config: RequestConfig, data: T, expireTime?: number): void {
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
  delete(config: RequestConfig): void {
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
    const storageCount = 0; // 存储适配器接口限制，无法获取
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

// 创建全局请求缓存管理器实例
export const requestCacheManager = new RequestCacheManager();

/**
 * 配置请求缓存选项
 */
export function configureRequestCache(options: RequestCacheOptions): void {
  if (options.defaultExpireTime !== undefined) {
    requestCacheManager.setDefaultExpireTime(options.defaultExpireTime);
  }

  if (options.strategy !== undefined) {
    requestCacheManager.setStrategy(options.strategy);
  }

  if (options.maxSize !== undefined) {
    requestCacheManager.setMaxSize(options.maxSize);
  }

  if (options.customStrategy !== undefined) {
    requestCacheManager.setCustomStrategy(options.customStrategy);
  }

  if (options.useLocalStorage !== undefined || options.localStoragePrefix !== undefined) {
    internalWarn(
      'useLocalStorage 和 localStoragePrefix 需要在创建 RequestCacheManager 实例时配置，当前修改不会生效',
    );
  }
}
