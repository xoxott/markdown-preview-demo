/**
 * 缓存策略管理器
 * 单一职责：管理缓存淘汰策略（LRU、FIFO、自定义等）
 */

import type { CacheItem } from './MemoryCache';
import type { CacheStrategy, CustomCacheStrategy } from './types';

/**
 * 缓存策略管理器
 */
export class CacheStrategyManager {
  private strategy: CacheStrategy;
  private maxSize: number;
  private customStrategy?: CustomCacheStrategy;
  private accessOrder: string[] = [];

  constructor(strategy: CacheStrategy, maxSize: number, customStrategy?: CustomCacheStrategy) {
    this.strategy = strategy;
    this.maxSize = maxSize;
    this.customStrategy = customStrategy;
  }

  /**
   * 查找键在访问顺序中的索引
   */
  private findKeyIndex(key: string): number {
    return this.accessOrder.indexOf(key);
  }

  /**
   * 从访问顺序中移除键
   */
  private removeKeyFromOrder(key: string): void {
    const index = this.findKeyIndex(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 更新 LRU 访问顺序
   */
  updateAccessOrder(key: string): void {
    if (this.strategy !== 'lru') {
      return;
    }

    this.removeKeyFromOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * 添加键到访问顺序（用于 FIFO）
   */
  addToAccessOrder(key: string): void {
    if (this.strategy === 'fifo' && !this.accessOrder.includes(key)) {
      this.accessOrder.push(key);
    }
  }

  /**
   * 从访问顺序中移除键
   */
  removeFromAccessOrder(key: string): void {
    this.removeKeyFromOrder(key);
  }

  /**
   * 应用基于访问顺序的策略（LRU/FIFO）：返回需要删除的键列表
   * 删除访问顺序中最旧的项，直到有足够空间
   */
  private applyOrderBasedStrategy(
    strategyType: 'lru' | 'fifo',
    currentSize: number,
    newKey: string,
  ): string[] {
    if (this.strategy !== strategyType || currentSize < this.maxSize) {
      return [];
    }

    const keysToDelete: string[] = [];
    let remainingSize = currentSize;

    // 删除访问顺序中最旧的项，直到有足够空间容纳新项
    while (this.accessOrder.length > 0 && remainingSize >= this.maxSize) {
      const oldestKey = this.accessOrder[0];
      if (!oldestKey) {
        break;
      }

      // 如果新键已存在，跳过它（会在外部更新访问顺序）
      if (oldestKey === newKey) {
        this.accessOrder.shift();
        continue;
      }

      keysToDelete.push(oldestKey);
      this.accessOrder.shift();
      remainingSize--;
    }

    return keysToDelete;
  }

  /**
   * 应用自定义策略：返回需要删除的键列表
   * 根据自定义策略函数决定哪些项应该被删除
   */
  private applyCustomStrategy(cacheEntries: Array<[string, CacheItem]>, newKey: string): string[] {
    if (this.strategy !== 'custom' || !this.customStrategy) {
      return [];
    }

    const keysToDelete: string[] = [];

    for (const [cacheKey, item] of cacheEntries) {
      if (cacheKey === newKey) {
        continue;
      }
      const shouldKeep = this.customStrategy(cacheKey, item);
      if (!shouldKeep) {
        keysToDelete.push(cacheKey);
      }
    }

    return keysToDelete;
  }

  /**
   * 应用缓存策略，返回需要删除的键列表
   */
  applyStrategy(
    currentSize: number,
    newKey: string,
    cacheEntries: Array<[string, CacheItem]>,
  ): string[] {
    switch (this.strategy) {
      case 'time':
        // 基于时间的策略不需要主动删除，由过期机制处理
        return [];

      case 'lru':
        return this.applyOrderBasedStrategy('lru', currentSize, newKey);

      case 'fifo':
        return this.applyOrderBasedStrategy('fifo', currentSize, newKey);

      case 'custom':
        return this.applyCustomStrategy(cacheEntries, newKey);

      default:
        return [];
    }
  }

  /**
   * 设置策略
   */
  setStrategy(strategy: CacheStrategy): void {
    this.strategy = strategy;
    // 只有 LRU 和 FIFO 需要维护访问顺序
    if (strategy !== 'lru' && strategy !== 'fifo') {
      this.accessOrder = [];
    }
  }

  /**
   * 设置最大缓存数量
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
  }

  /**
   * 设置自定义策略
   */
  setCustomStrategy(strategy: CustomCacheStrategy): void {
    this.customStrategy = strategy;
    this.strategy = 'custom';
  }

  /**
   * 获取策略
   */
  getStrategy(): CacheStrategy {
    return this.strategy;
  }

  /**
   * 获取最大缓存数量
   */
  getMaxSize(): number {
    return this.maxSize;
  }
}
