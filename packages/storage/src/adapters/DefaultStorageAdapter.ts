/**
 * 默认存储适配器实现
 * 根据环境自动选择：浏览器环境使用 localStorage，否则使用内存存储
 */

import type { StorageAdapter } from '../types';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { MemoryStorageAdapter } from './MemoryStorageAdapter';

class DefaultStorageAdapter implements StorageAdapter {
  private adapter: StorageAdapter;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.adapter = new LocalStorageAdapter();
    } else {
      this.adapter = new MemoryStorageAdapter();
    }
  }

  getItem(key: string): string | null {
    return this.adapter.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.adapter.setItem(key, value);
  }

  removeItem(key: string): void {
    this.adapter.removeItem(key);
  }

  clear(): void {
    this.adapter.clear();
  }

  getAllKeys(): string[] {
    return this.adapter.getAllKeys();
  }
}

/**
 * 默认存储适配器实例
 */
export const defaultStorageAdapter = new DefaultStorageAdapter();

