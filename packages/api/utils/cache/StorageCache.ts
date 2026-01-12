/**
 * 存储缓存
 * 只负责 localStorage 缓存的读写操作
 */

import { storageManager } from '../storage/storage';
import { safeParseJSON } from '../common/serialization';
import { internalWarn } from '../common/internalLogger';
import type { CacheItem } from './MemoryCache';

/**
 * 存储缓存类
 * 单一职责：只负责 localStorage 缓存的读写
 */
export class StorageCache {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
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
    try {
      const cached = storageManager.getItem(this.getStorageKey(key));
      const parsed = safeParseJSON<CacheItem<T> | null>(cached, null);
      return parsed;
    } catch (error) {
      internalWarn('从存储读取缓存失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存项
   */
  set<T = unknown>(key: string, item: CacheItem<T>): boolean {
    try {
      const json = JSON.stringify(item);
      storageManager.setItem(this.getStorageKey(key), json);
      return true;
    } catch (error) {
      internalWarn('保存到存储失败:', error);
      return false;
    }
  }

  /**
   * 删除缓存项
   */
  delete(key: string): void {
    storageManager.removeItem(this.getStorageKey(key));
  }

  /**
   * 清空所有缓存（仅清空当前前缀的缓存项）
   * 如果存储适配器支持 getAllKeys，则只清空当前前缀的键
   * 否则会警告并跳过清空操作（避免清空所有存储）
   */
  clear(): void {
    try {
      // 获取所有键并只删除当前前缀的键
      const allKeys = storageManager.getAllKeys();
      for (const key of allKeys) {
        if (key.startsWith(this.prefix)) {
          storageManager.removeItem(key);
        }
      }
    } catch (error) {
      internalWarn('清空存储缓存失败:', error);
    }
  }
}
