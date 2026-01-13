/**
 * 缓存类型定义统一导出
 */

// 基础类型
export type { CacheItem } from './cache-item';
export type { CacheStrategy, CustomCacheStrategy } from './strategy';

// 策略相关类型
export type { CachePolicy, CacheConfig, CacheMeta } from '../policies';

// 管理器相关类型
export type { RequestCacheOptions } from './request-cache';

// 步骤相关类型
export type { CacheReadStepOptions, CacheWriteStepOptions } from './steps';

// 适配器相关类型
export type { StorageAdapter } from '@suga/storage';

