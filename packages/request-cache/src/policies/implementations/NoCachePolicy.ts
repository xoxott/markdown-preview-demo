/**
 * 无缓存策略实现
 * 始终返回 false，用于明确禁用缓存
 */

import type { CachePolicy } from '../types';

export class NoCachePolicy implements CachePolicy {
  shouldRead(): boolean {
    return false;
  }

  shouldWrite(): boolean {
    return false;
  }

  getTTL(): number | undefined {
    return undefined;
  }
}

