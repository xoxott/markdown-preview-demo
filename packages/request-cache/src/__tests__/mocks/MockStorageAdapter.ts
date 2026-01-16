/**
 * Mock StorageAdapter 用于测试
 */

import type { StorageAdapter } from '@suga/storage';

export class MockStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  /**
   * 清空存储（用于测试）
   */
  reset(): void {
    this.clear();
  }

  /**
   * 获取存储大小（用于测试）
   */
  getSize(): number {
    return this.storage.size;
  }
}

