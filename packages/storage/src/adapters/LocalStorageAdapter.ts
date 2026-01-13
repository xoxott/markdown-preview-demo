/**
 * LocalStorage 适配器实现
 * 适用于浏览器环境
 */

import type { StorageAdapter } from '../types';

/**
 * 开发环境警告函数
 */
function warn(message: string, error?: unknown): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.warn(`[LocalStorageAdapter] ${message}`, error);
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      warn(`Failed to get item from localStorage: ${key}`, error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      warn(`Failed to set item to localStorage: ${key}`, error);
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      warn(`Failed to remove item from localStorage: ${key}`, error);
    }
  }

  clear(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.clear();
    } catch (error) {
      warn('Failed to clear localStorage', error);
    }
  }

  getAllKeys(): string[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      warn('Failed to get all keys from localStorage', error);
      return [];
    }
  }
}

