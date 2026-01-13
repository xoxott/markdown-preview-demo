/**
 * 缓存管理器相关类型定义
 */

import type { RequestCacheManager } from '../managers/RequestCacheManager';
import type { CachePolicy, CacheConfig } from '../policies';

/**
 * 缓存管理器配置
 */
export interface CacheManagerOptions {
  /**
   * 请求缓存管理器实例
   * 如果不提供，会创建新的实例
   */
  requestCacheManager?: RequestCacheManager;

  /**
   * 默认缓存策略工厂函数
   * 如果不提供，使用默认策略（DefaultCachePolicy）
   */
  defaultPolicyFactory?: (cache?: CacheConfig) => CachePolicy;
}

