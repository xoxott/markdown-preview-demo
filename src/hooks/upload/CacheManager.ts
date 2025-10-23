/** 缓存管理器 */
export default class CacheManager {
  private cache = new Map<string, any>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize = 1000, ttl = 30 * 60 * 1000) { // 30分钟TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {
      // 删除最旧的条目
      const firstKey = this.cache.keys().next().value;
      if(firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

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

  clear(): void {
    this.cache.clear();
  }
}