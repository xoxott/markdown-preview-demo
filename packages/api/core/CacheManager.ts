/**
 * 缓存管理模块
 */

import type { RequestConfig } from '../types';
import { requestCacheManager } from '../utils/request/requestCache';

/**
 * 缓存管理器
 */
export class CacheManager {
  /**
   * 检查并获取缓存数据
   * @param config 请求配置
   * @returns 缓存数据或 null
   */
  static getCachedData<T>(config: RequestConfig): T | null {
    const method = (config.method || 'GET').toUpperCase();
    if (method === 'GET' && config.cache === true) {
      return requestCacheManager.get<T>(config);
    }
    return null;
  }

  /**
   * 保存请求结果到缓存
   * @param config 请求配置
   * @param data 请求结果
   */
  static setCacheData<T>(config: RequestConfig, data: T): void {
    const method = (config.method || 'GET').toUpperCase();
    if (method === 'GET' && config.cache === true) {
      requestCacheManager.set(config, data, config.cacheExpireTime);
    }
  }

  /**
   * 清除请求缓存
   * @param config 请求配置（可选，不传则清除所有缓存）
   */
  static clearCache(config?: RequestConfig): void {
    if (config) {
      requestCacheManager.delete(config);
    } else {
      requestCacheManager.clear();
    }
  }

  /**
   * 清理过期缓存
   */
  static cleanupCache(): void {
    requestCacheManager.cleanup();
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): { memoryCount: number; storageCount: number } {
    return requestCacheManager.getStats();
  }
}
