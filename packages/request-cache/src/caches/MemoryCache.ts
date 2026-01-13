/**
 * 内存缓存
 * 只负责内存缓存的读写操作
 */

/**
 * 缓存项
 */
export interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  expireTime: number;
}

/**
 * 内存缓存类
 */
export class MemoryCache {
  private cache = new Map<string, CacheItem>();

  /**
   * 获取缓存项
   */
  get<T = unknown>(key: string): CacheItem<T> | null {
    const item = this.cache.get(key);
    return (item as CacheItem<T>) || null;
  }

  /**
   * 设置缓存项
   */
  set<T = unknown>(key: string, item: CacheItem<T>): void {
    this.cache.set(key, item as CacheItem);
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 检查缓存项是否存在
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有缓存项
   */
  entries(): Array<[string, CacheItem]> {
    return Array.from(this.cache.entries());
  }
}

