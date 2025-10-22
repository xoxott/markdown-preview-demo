/**
 * 缓存管理器
 * 
 * 提供简单的基于 Map 的缓存机制，支持：
 *  - 最大缓存条数限制
 *  - TTL（时间有效性）
 *  - 自动删除最旧条目
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
   */
  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {
      // 删除最旧的条目（如果存在）
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
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
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }
}
