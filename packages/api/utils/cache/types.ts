/**
 * 缓存类型定义
 */

import type { CacheItem } from './MemoryCache';

/**
 * 缓存策略类型
 */
export type CacheStrategy = 'time' | 'lru' | 'fifo' | 'custom';

/**
 * 自定义缓存策略函数
 * @param key 缓存键
 * @param value 缓存值
 * @returns 是否应该保留该缓存项
 */
export type CustomCacheStrategy = (key: string, value: CacheItem) => boolean;
