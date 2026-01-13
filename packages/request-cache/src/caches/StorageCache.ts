/**
 * 存储缓存
 * 只负责持久化缓存的读写操作
 */

import { safeParseJSON, safeStringify } from '@suga/utils';
import type { StorageAdapter } from '../adapters';
import { defaultStorageAdapter } from '../adapters';
import type { CacheItem } from './MemoryCache';

/**
 * 存储缓存类
 */
export class StorageCache {
  private prefix: string;
  private adapter: StorageAdapter;

  constructor(prefix: string, adapter?: StorageAdapter) {
    this.prefix = prefix;
    this.adapter = adapter ?? defaultStorageAdapter;
  }

  /**
   * 获取完整的存储键名
   */
  private getStorageKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 获取缓存项
   */
  get<T = unknown>(key: string): CacheItem<T> | null {
    const cached = this.adapter.getItem(this.getStorageKey(key));
    return safeParseJSON<CacheItem<T> | null>(cached, null);
  }

  /**
   * 设置缓存项
   */
  set<T = unknown>(key: string, item: CacheItem<T>): boolean {
    const json = safeStringify(item, false);
    this.adapter.setItem(this.getStorageKey(key), json);
    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): void {
    this.adapter.removeItem(this.getStorageKey(key));
  }

  /**
   * 获取缓存数量（仅统计当前前缀的缓存项）
   */
  size(): number {
    const allKeys = this.adapter.getAllKeys();
    return allKeys.filter((key) => key.startsWith(this.prefix)).length;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const allKeys = this.adapter.getAllKeys();
    for (const key of allKeys) {
      if (key.startsWith(this.prefix)) {
        this.adapter.removeItem(key);
      }
    }
  }
}

