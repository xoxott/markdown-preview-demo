/**
 * 存储管理工具
 */

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * LocalStorage 适配器
 */
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.removeItem(key);
  }

  clear(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.clear();
  }
}

/**
 * SessionStorage 适配器
 */
export class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    return window.sessionStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    window.sessionStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    window.sessionStorage.removeItem(key);
  }

  clear(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    window.sessionStorage.clear();
  }
}

/**
 * 内存存储适配器
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
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
}

/**
 * 存储管理器
 */
class StorageManager {
  private adapter: StorageAdapter = new MemoryStorageAdapter();

  /**
   * 配置存储适配器
   */
  configure(adapter: StorageAdapter): void {
    this.adapter = adapter;
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
   * 移除存储项
   */
  removeItem(key: string): void {
    this.adapter.removeItem(key);
  }

  /**
   * 清空存储
   */
  clear(): void {
    this.adapter.clear();
  }
}

export const storageManager = new StorageManager();

/**
 * 配置存储
 */
export function configureStorage(adapter: StorageAdapter): void {
  storageManager.configure(adapter);
}

