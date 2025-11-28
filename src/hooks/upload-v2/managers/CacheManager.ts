/**
 * 缓存管理器
 * 提供基于 Map 的缓存机制，支持 TTL 和优化的 LRU 策略
 * 使用 Map 的插入顺序特性实现 LRU（更高效）
 */
export class CacheManager {
  // Map 保持插入顺序，第一个元素是最旧的
  private cache = new Map<string, { value: unknown; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize = 1000, ttl = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * 设置缓存（优化的 LRU）
   */
  set<T = unknown>(key: string, value: T, customTtl?: number): void {
    // 如果已存在，先删除（Map 会保持插入顺序）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果超过最大大小，删除最旧的项（Map 的第一个元素）
    if (this.cache.size >= this.maxSize) {
      // Map 的 keys() 迭代器按插入顺序返回
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // 插入新项（会添加到 Map 的末尾，成为最新的项）
    this.cache.set(key, {
      value,
      timestamp: Date.now() + (customTtl ?? this.ttl)
    });
  }

  /**
   * 获取缓存（优化的 LRU）
   */
  get<T = unknown>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return null;
    }

    // LRU: 删除并重新插入，使其成为最新的项（Map 会将其移到末尾）
    // 这种方式比双向链表更简单高效
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value as T;
  }

  /**
   * 删除指定缓存
   */
  remove(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 删除指定缓存（remove 的别名）
   */
  delete(key: string): boolean {
    return this.remove(key);
  }

  /**
   * 批量删除缓存
   */
  removeMany(keys: string[]): number {
    let removed = 0;
    keys.forEach(key => {
      if (this.cache.delete(key)) {
        removed++;
      }
    });
    return removed;
  }

  /**
   * 检查缓存是否存在且有效
   */
  isValid(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now > item.timestamp) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      cleaned++;
    });

    return cleaned;
  }

  /** 清空所有缓存 */
  clear(): void {
    this.cache.clear();
  }
}

