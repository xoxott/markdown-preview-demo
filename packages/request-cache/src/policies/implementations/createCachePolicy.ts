/**
 * 创建缓存策略工厂函数
 * 根据配置创建合适的策略实例
 */

import type { CachePolicy, CacheConfig } from '../types';
import { DefaultCachePolicy } from './DefaultCachePolicy';
import { NoCachePolicy } from './NoCachePolicy';

export function createCachePolicy(cache?: CacheConfig): CachePolicy {
  // 如果明确禁用，返回无缓存策略
  if (cache === false) {
    return new NoCachePolicy();
  }

  // 如果 cache 是策略对象，直接使用
  if (typeof cache === 'object' && cache !== null && 'shouldRead' in cache) {
    return cache as CachePolicy;
  }

  // 默认使用默认策略
  return new DefaultCachePolicy();
}

