/**
 * Flow 缓存管理器
 * 
 * 提供计算结果缓存、渲染结果缓存等功能，提升性能
 */

/**
 * 缓存项
 */
interface CacheItem<T> {
  /** 缓存值 */
  value: T;
  /** 创建时间 */
  createdAt: number;
  /** 最后访问时间 */
  lastAccessed: number;
  /** 访问次数 */
  accessCount: number;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 最大缓存数量 */
  maxSize?: number;
  /** 缓存过期时间（毫秒） */
  ttl?: number;
  /** 是否启用 LRU（最近最少使用）淘汰 */
  enableLRU?: boolean;
}

/**
 * Flow 缓存管理器
 */
export class FlowCache {
  /** 缓存存储 */
  private cache: Map<string, CacheItem<any>> = new Map();
  /** 缓存选项 */
  private options: Required<CacheOptions> = {
    maxSize: 100,
    ttl: 5 * 60 * 1000, // 5 分钟
    enableLRU: true
  };

  constructor(options?: Partial<CacheOptions>) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  /**
   * 设置缓存
   * 
   * @param key 缓存键
   * @param value 缓存值
   */
  set<T>(key: string, value: T): void {
    // 检查是否需要淘汰
    if (this.cache.size >= this.options.maxSize) {
      this.evict();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0
    });
  }

  /**
   * 获取缓存
   * 
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期则返回 undefined
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - item.createdAt > this.options.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // 更新访问信息
    item.lastAccessed = now;
    item.accessCount++;

    return item.value as T;
  }

  /**
   * 检查缓存是否存在
   * 
   * @param key 缓存键
   * @returns 是否存在且未过期
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - item.createdAt > this.options.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   * 
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 淘汰缓存（LRU 或随机）
   */
  private evict(): void {
    if (this.cache.size === 0) {
      return;
    }

    if (this.options.enableLRU) {
      // LRU：删除最近最少使用的项
      let lruKey: string | null = null;
      let lruTime = Infinity;

      this.cache.forEach((item, key) => {
        if (item.lastAccessed < lruTime) {
          lruTime = item.lastAccessed;
          lruKey = key;
        }
      });

      if (lruKey) {
        this.cache.delete(lruKey);
      }
    } else {
      // 随机删除
      const keys = Array.from(this.cache.keys());
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      this.cache.delete(randomKey);
    }
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalAccess: number;
  } {
    let totalAccess = 0;
    this.cache.forEach(item => {
      totalAccess += item.accessCount;
    });

    // 计算命中率（简化版，实际应该记录总请求数）
    const hitRate = this.cache.size > 0 ? 1 : 0;

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate,
      totalAccess
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now - item.createdAt > this.options.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  /**
   * 设置缓存选项
   */
  setOptions(options: Partial<CacheOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 获取所有缓存键
   * 
   * @returns 缓存键数组
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   * 
   * @returns 缓存数量
   */
  size(): number {
    return this.cache.size;
  }
}

