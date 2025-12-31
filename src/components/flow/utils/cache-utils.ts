/**
 * 缓存工具函数
 *
 * 提供通用的缓存管理功能，支持大小限制和自动清理
 */

/**
 * 缓存配置选项
 */
export interface CacheManagerOptions {
  /** 最大缓存大小 */
  maxSize?: number;
  /** 清理时删除的项数 */
  cleanupSize?: number;
}

/**
 * 带自动清理功能的缓存类
 */
class Cache<K, V> extends Map<K, V> {
  private maxSize: number;
  private cleanupSize: number;

  constructor(options: CacheManagerOptions = {}) {
    super();
    this.maxSize = options.maxSize ?? 500;
    this.cleanupSize = options.cleanupSize ?? 100;
  }

  /**
   * 清理旧缓存项
   */
  private cleanup(): void {
    if (this.size > this.maxSize) {
      const keys = Array.from(this.keys());
      for (let i = 0; i < this.cleanupSize; i++) {
        this.delete(keys[i]);
      }
    }
  }

  /**
   * 设置缓存项（带自动清理）
   */
  set(key: K, value: V): this {
    super.set(key, value);
    this.cleanup();
    return this;
  }
}

/**
 * 创建带自动清理功能的缓存
 *
 * @param options 缓存配置选项
 * @returns 缓存 Map 实例
 *
 * @example
 * ```typescript
 * const cache = createCache({ maxSize: 500, cleanupSize: 100 });
 * cache.set('key1', value1);
 * cache.set('key2', value2);
 * // 当缓存大小超过 500 时，自动删除最旧的 100 项
 * ```
 */
export function createCache<K, V>(options: CacheManagerOptions = {}): Map<K, V> {
  return new Cache<K, V>(options);
}

