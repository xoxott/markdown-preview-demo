/**
 * 缓存步骤相关类型定义
 */

import type { RequestCacheManager } from '../managers/RequestCacheManager';
import type { CachePolicy, CacheConfig } from '../policies';

/**
 * 缓存读取步骤配置
 */
export interface CacheReadStepOptions {
  /** 请求缓存管理器实例 */
  requestCacheManager?: RequestCacheManager;
  /** 缓存策略工厂函数 */
  policyFactory?: (cache?: CacheConfig) => CachePolicy;
}

/**
 * 缓存写入步骤配置
 */
export interface CacheWriteStepOptions {
  /** 请求缓存管理器实例 */
  requestCacheManager?: RequestCacheManager;
  /** 缓存策略工厂函数 */
  policyFactory?: (cache?: CacheConfig) => CachePolicy;
}

