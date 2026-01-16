/**
 * 无缓存策略实现
 * 始终返回 false，用于明确禁用缓存
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import type { CachePolicy, CacheMeta } from '../types';

export class NoCachePolicy implements CachePolicy {
  shouldRead(_config: NormalizedRequestConfig, _meta?: CacheMeta): boolean {
    return false;
  }

  shouldWrite(_config: NormalizedRequestConfig, _data: unknown, _meta?: CacheMeta): boolean {
    return false;
  }

  getTTL(_config: NormalizedRequestConfig, _meta?: CacheMeta): number | undefined {
    return undefined;
  }
}

