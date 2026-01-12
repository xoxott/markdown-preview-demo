/**
 * 存储适配器抽象
 * 支持多种存储方案（localStorage、sessionStorage、内存存储等），解决 SSR 和测试问题
 */

import { internalWarn } from '../common/internalLogger';

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  /**
   * 获取存储项
   */
  getItem(key: string): string | null;

  /**
   * 设置存储项
   */
  setItem(key: string, value: string): void;

  /**
   * 删除存储项
   */
  removeItem(key: string): void;

  /**
   * 清空所有存储项
   */
  clear(): void;

  /**
   * 获取所有存储键
   * 用于支持按前缀清空等功能
   * @returns 所有存储键的数组
   */
  getAllKeys(): string[];
}

/**
 * LocalStorage 适配器
 * 适用于浏览器环境
 */
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // 存储失败（如存储空间已满、隐私模式等）
      internalWarn('localStorage.setItem 失败:', error);
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // 删除失败（如隐私模式、存储被禁用等）
      internalWarn('localStorage.removeItem 失败:', error);
    }
  }

  clear(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.clear();
    } catch (error) {
      // 清空失败（如隐私模式、存储被禁用等）
      internalWarn('localStorage.clear 失败:', error);
    }
  }

  getAllKeys(): string[] {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) {
          keys.push(key);
        }
      }
      return keys;
    } catch {
      return [];
    }
  }
}

/**
 * SessionStorage 适配器
 * 适用于浏览器环境，数据在会话结束时清除
 */
export class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      // 存储失败（如存储空间已满、隐私模式等）
      internalWarn('sessionStorage.setItem 失败:', error);
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      // 删除失败（如隐私模式、存储被禁用等）
      internalWarn('sessionStorage.removeItem 失败:', error);
    }
  }

  clear(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      sessionStorage.clear();
    } catch (error) {
      // 清空失败（如隐私模式、存储被禁用等）
      internalWarn('sessionStorage.clear 失败:', error);
    }
  }

  getAllKeys(): string[] {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key !== null) {
          keys.push(key);
        }
      }
      return keys;
    } catch {
      return [];
    }
  }
}

/**
 * 内存存储适配器
 * 适用于 SSR 环境和测试，数据只存在于内存中
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>();

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

  /**
   * 获取存储项数量（用于测试和调试）
   */
  getSize(): number {
    return this.storage.size;
  }

  /**
   * 获取所有键（用于测试和调试）
   */
  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }
}

/**
 * 存储管理器
 * 统一管理存储操作，支持切换不同的存储适配器
 */
class StorageManager {
  private adapter: StorageAdapter;

  constructor(adapter?: StorageAdapter) {
    // 默认根据环境选择适配器
    if (adapter) {
      this.adapter = adapter;
    } else if (typeof window !== 'undefined') {
      // 浏览器环境使用 localStorage
      this.adapter = new LocalStorageAdapter();
    } else {
      // SSR 环境使用内存存储
      this.adapter = new MemoryStorageAdapter();
    }
  }

  /**
   * 设置存储适配器
   */
  setAdapter(adapter: StorageAdapter): void {
    this.adapter = adapter;
  }

  /**
   * 获取当前存储适配器
   */
  getAdapter(): StorageAdapter {
    return this.adapter;
  }

  /**
   * 获取存储项
   */
  getItem(key: string): string | null {
    return this.adapter.getItem(key);
  }

  /**
   * 设置存储项
   */
  setItem(key: string, value: string): void {
    this.adapter.setItem(key, value);
  }

  /**
   * 删除存储项
   */
  removeItem(key: string): void {
    this.adapter.removeItem(key);
  }

  /**
   * 清空所有存储项
   */
  clear(): void {
    this.adapter.clear();
  }

  /**
   * 获取所有存储键
   */
  getAllKeys(): string[] {
    return this.adapter.getAllKeys();
  }
}

// 创建全局存储管理器实例
export const storageManager = new StorageManager();

/**
 * 配置存储适配器
 * 可以在应用初始化时调用，切换存储方案
 */
export function configureStorage(adapter: StorageAdapter): void {
  storageManager.setAdapter(adapter);
}
