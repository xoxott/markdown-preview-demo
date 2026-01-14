/**
 * 默认缓存策略实现
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import type { CacheConfig, CacheMeta, CachePolicy } from '../types';

export class DefaultCachePolicy implements CachePolicy {
  shouldRead(config: NormalizedRequestConfig, meta?: CacheMeta): boolean {
    const method = (config.method || 'GET').toUpperCase();
    const cache = meta?.cache as CacheConfig;

    // 如果明确禁用缓存，则不读取
    if (cache === false) {
      return false;
    }

    // 这是默认策略的合理假设，可通过自定义策略覆盖
    if (method !== 'GET') {
      return false;
    }

    return cache === true || (typeof cache === 'object' && cache !== null);
  }

  shouldWrite(config: NormalizedRequestConfig, data: unknown, meta?: CacheMeta): boolean {
    // 写入判断与读取一致
    if (!this.shouldRead(config, meta)) {
      return false;
    }

    // 只缓存成功的数据（非 null/undefined）
    return data !== null && data !== undefined;
  }

  getTTL(_config: NormalizedRequestConfig, meta?: CacheMeta): number | undefined {
    // 当前实现仅从 meta 中获取 TTL，不使用 config
    // 保留 config 参数以支持未来扩展（如根据 URL、method 等动态决定 TTL）
    if (meta?.cacheExpireTime !== undefined) {
      return meta.cacheExpireTime as number;
    }
    // 如果 cache 是对象且包含 ttl，使用对象中的 ttl
    const cache = meta?.cache;
    if (typeof cache === 'object' && cache !== null && 'ttl' in cache) {
      return (cache as { ttl?: number }).ttl;
    }

    return undefined;
  }
}

