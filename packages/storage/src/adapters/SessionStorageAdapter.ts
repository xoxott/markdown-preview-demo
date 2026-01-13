/**
 * SessionStorage 适配器实现
 * 适用于浏览器环境
 */

import type { StorageAdapter } from '../types';

/**
 * 开发环境警告函数
 */
function warn(message: string, error?: unknown): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.warn(`[SessionStorageAdapter] ${message}`, error);
  }
}

export class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      warn(`Failed to get item from sessionStorage: ${key}`, error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      warn(`Failed to set item to sessionStorage: ${key}`, error);
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      warn(`Failed to remove item from sessionStorage: ${key}`, error);
    }
  }

  clear(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    try {
      window.sessionStorage.clear();
    } catch (error) {
      warn('Failed to clear sessionStorage', error);
    }
  }

  getAllKeys(): string[] {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return [];
    }
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      warn('Failed to get all keys from sessionStorage', error);
      return [];
    }
  }
}

