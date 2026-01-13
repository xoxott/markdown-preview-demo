/**
 * @suga/request-cache
 * Request cache management for @suga/request-core
 */

// 导出缓存管理器
export { RequestCacheManager } from './managers/RequestCacheManager';

// 导出缓存策略
export {
  DefaultCachePolicy,
  NoCachePolicy,
  createCachePolicy,
} from './policies';

// 导出缓存步骤
export { CacheReadStep } from './steps/CacheReadStep';
export { CacheWriteStep } from './steps/CacheWriteStep';

// 注意：MemoryCache 和 StorageCache 已内联到 RequestCacheManager 中

// 导出缓存策略管理器
export { CacheStrategyManager } from './strategies/CacheStrategyManager';

// 导出类型（统一从 types 导出）
export type * from './types';

// 导出常量
export { DEFAULT_CACHE_CONFIG } from './constants';

// 导出工具函数
export {
  isValidCacheItem,
  isCacheItemExpired,
  getCacheStats,
} from './utils/cache-utils';

// 重新导出存储适配器（从 @suga/storage）
export type { StorageAdapter } from '@suga/storage';
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  defaultStorageAdapter,
} from '@suga/storage';
