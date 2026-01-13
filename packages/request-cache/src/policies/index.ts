/**
 * 缓存策略模块统一导出
 */

// 导出类型和接口
export type { CachePolicy, CacheConfig, CacheMeta } from './types';

// 导出实现
export {
  DefaultCachePolicy,
  NoCachePolicy,
  createCachePolicy,
} from './implementations';

