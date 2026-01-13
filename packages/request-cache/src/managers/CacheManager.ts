/**
 * 缓存管理模块
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import { RequestCacheManager } from './RequestCacheManager';
import { createCachePolicy, type CachePolicy, type CacheConfig, type CacheMeta } from '../policies';
import type { CacheManagerOptions } from '../types/manager';

/**
 * 缓存管理器
 */
export class CacheManager {
  private requestCacheManager: RequestCacheManager;
  private defaultPolicyFactory: (cache?: CacheConfig) => CachePolicy;

  constructor(options: CacheManagerOptions = {}) {
    this.requestCacheManager = options.requestCacheManager ?? new RequestCacheManager();
    this.defaultPolicyFactory = options.defaultPolicyFactory ?? createCachePolicy;
  }

  /**
   * 检查并获取缓存数据
   * @param config 请求配置
   * @param meta 元数据（包含 cache 配置）
   * @returns 缓存数据或 null
   */
  getCachedData<T>(config: NormalizedRequestConfig, meta?: CacheMeta): T | null {
    // 根据配置创建缓存策略
    const cacheConfig = meta?.cache as CacheConfig | undefined;
    const policy = this.defaultPolicyFactory(cacheConfig);

    // 策略决定是否应该读取缓存
    if (!policy.shouldRead(config, meta)) {
      return null;
    }

    // 从缓存存储中获取
    return this.requestCacheManager.get<T>(config);
  }

  /**
   * 保存请求结果到缓存
   * @param config 请求配置
   * @param data 请求结果
   * @param meta 元数据（包含 cache 配置）
   */
  setCacheData<T>(config: NormalizedRequestConfig, data: T, meta?: CacheMeta): void {
    // 根据配置创建缓存策略
    const cacheConfig = meta?.cache as CacheConfig | undefined;
    const policy = this.defaultPolicyFactory(cacheConfig);

    // 策略决定是否应该写入缓存
    if (!policy.shouldWrite(config, data, meta)) {
      return;
    }

    // 获取 TTL（策略决定）
    const ttl = policy.getTTL(config, meta);

    // 写入缓存存储
    this.requestCacheManager.set(config, data, ttl);
  }

  /**
   * 清除请求缓存
   * @param config 请求配置（可选，不传则清除所有缓存）
   */
  clearCache(config?: NormalizedRequestConfig): void {
    if (config) {
      this.requestCacheManager.delete(config);
    } else {
      this.requestCacheManager.clear();
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    this.requestCacheManager.cleanup();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { memoryCount: number; storageCount: number } {
    return this.requestCacheManager.getStats();
  }
}

