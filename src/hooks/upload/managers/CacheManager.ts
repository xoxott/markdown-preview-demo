/**
 * 缓存管理器
 *
 * 提供简单的基于 Map 的缓存机制，支持：
 *
 * - 最大缓存条数限制
 * - TTL（时间有效性）
 * - 自动删除最旧条目
 * - LRU（最近最少使用）策略
 */
export default class CacheManager {
  private cache = new Map<string, { value: any; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttl: number;

  /**
   * 构造函数
   *
   * @param maxSize - 最大缓存条数，默认 1000
   * @param ttl - 缓存有效期（毫秒），默认 30 分钟
   */
  constructor(maxSize = 1000, ttl = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * 设置缓存
   *
   * @param key - 缓存 key
   * @param value - 缓存值
   * @param customTtl - 自定义TTL（可选）
   */
  set(key: string, value: any, customTtl?: number): void {
    // 如果已存在，先删除（这样可以更新位置到最后）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 检查容量
    if (this.cache.size >= this.maxSize) {
      // 删除最旧的条目（Map 保持插入顺序，第一个是最旧的）
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now() + (customTtl ?? this.ttl)
    });
  }

  /**
   * 获取缓存
   *
   * @param key - 缓存 key
   * @returns 缓存值，如果不存在或已过期则返回 null
   */
  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return null;
    }

    // LRU: 更新访问顺序
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  /**
   * 删除指定缓存
   *
   * @param key - 缓存 key
   * @returns 是否删除成功
   */
  remove(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 批量删除缓存
   *
   * @param keys - 要删除的 key 数组
   * @returns 删除的条数
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
   * 删除符合条件的缓存
   *
   * @param predicate - 判断函数
   * @returns 删除的条数
   */
  removeWhere(predicate: (key: string, value: any) => boolean): number {
    let removed = 0;
    const keysToRemove: string[] = [];

    this.cache.forEach((item, key) => {
      if (predicate(key, item.value)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => {
      if (this.cache.delete(key)) {
        removed++;
      }
    });

    return removed;
  }

  /**
   * 检查缓存是否存在（不检查过期）
   *
   * @param key - 缓存 key
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * 检查缓存是否存在且有效（检查过期）
   *
   * @param key - 缓存 key
   * @returns 是否存在且有效
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
   *
   * @returns 当前缓存条数
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有缓存的 key
   *
   * @returns key 数组
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 清理过期缓存
   *
   * @returns 清理的条数
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

  /**
   * 更新缓存的 TTL
   *
   * @param key - 缓存 key
   * @param ttl - 新的 TTL（毫秒）
   * @returns 是否更新成功
   */
  touch(key: string, ttl?: number): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    item.timestamp = Date.now() + (ttl ?? this.ttl);
    return true;
  }

  /**
   * 获取缓存统计信息
   *
   * @returns 统计信息
   */
  stats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    let oldest: number | null = null;
    let newest: number | null = null;

    this.cache.forEach(item => {
      const timestamp = item.timestamp;
      if (!oldest || timestamp < oldest) oldest = timestamp;
      if (!newest || timestamp > newest) newest = timestamp;
    });

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // 需要额外追踪命中率
      oldestTimestamp: oldest,
      newestTimestamp: newest
    };
  }

  /** 清空所有缓存 */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 导出缓存数据（用于持久化）
   *
   * @returns 缓存数据
   */
  export(): Array<[string, any, number]> {
    const data: Array<[string, any, number]> = [];

    this.cache.forEach((item, key) => {
      data.push([key, item.value, item.timestamp]);
    });

    return data;
  }

  /**
   * 导入缓存数据（从持久化恢复）
   *
   * @param data - 缓存数据
   */
  import(data: Array<[string, any, number]>): void {
    this.clear();

    data.forEach(([key, value, timestamp]) => {
      // 只导入未过期的数据
      if (timestamp > Date.now()) {
        this.cache.set(key, { value, timestamp });
      }
    });

    // 如果导入后超出容量限制，删除最旧的
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }
}

// 导出类型定义
export interface CacheEntry {
  value: any;
  timestamp: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}

// 使用示例
/*
const cache = new CacheManager(100, 60 * 1000); // 最多100条，TTL 1分钟

// 基本操作
cache.set('key1', 'value1');
const value = cache.get('key1');
cache.remove('key1');

// 批量删除
cache.removeMany(['key1', 'key2', 'key3']);

// 条件删除
cache.removeWhere((key, value) => key.startsWith('temp_'));

// 清理过期缓存
cache.cleanup();

// 更新 TTL
cache.touch('key1', 2 * 60 * 1000); // 延长到 2 分钟

// 持久化
const data = cache.export();
localStorage.setItem('cache', JSON.stringify(data));

// 恢复
const savedData = JSON.parse(localStorage.getItem('cache') || '[]');
cache.import(savedData);
*/
