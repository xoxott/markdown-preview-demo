/**
 * 无缓存策略实现
 * 始终返回 false，用于明确禁用缓存
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import type { CachePolicy } from '../types';

export class NoCachePolicy implements CachePolicy {
  shouldRead(): boolean {
    return false;
  }

  shouldWrite(): boolean {
    return false;
  }

  getKey(config: NormalizedRequestConfig): string {
    return `${config.method || 'GET'}:${config.url || ''}`;
  }

  getTTL(): number | undefined {
    return undefined;
  }
}

