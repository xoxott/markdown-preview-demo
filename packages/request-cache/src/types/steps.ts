/** 缓存步骤相关类型定义 */

import type { RequestCacheManager } from '../managers/RequestCacheManager';
import type { CacheConfig, CachePolicy } from '../policies';

/** 步骤构造选项：meta.cache 未设置时是否默认启用 */
export interface CacheStepEnabledByDefaultOption {
  /** meta.cache 未设置时是否默认启用（显式 cache: false 仍可关闭） */
  enabledByDefault?: boolean;
}

/** 缓存读取步骤配置 */
export interface CacheReadStepOptions extends CacheStepEnabledByDefaultOption {
  /** 请求缓存管理器实例 */
  requestCacheManager?: RequestCacheManager;
  /** 缓存策略工厂函数 */
  policyFactory?: (cache?: CacheConfig) => CachePolicy;
}

/** 缓存写入步骤配置 */
export interface CacheWriteStepOptions extends CacheStepEnabledByDefaultOption {
  /** 请求缓存管理器实例 */
  requestCacheManager?: RequestCacheManager;
  /** 缓存策略工厂函数 */
  policyFactory?: (cache?: CacheConfig) => CachePolicy;
}
