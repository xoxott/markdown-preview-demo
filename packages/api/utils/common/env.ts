/**
 * 环境检测和适配工具
 * 提供统一的环境检测和功能可用性检查
 */

import type { StorageAdapter } from '../storage/storage';
import { LocalStorageAdapter, MemoryStorageAdapter } from '../storage/storage';

/**
 * 环境类型
 */
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof process !== 'undefined' && process.versions?.node;
export const isSSR = isNode || !isBrowser;
export const isDevelopment =
  process.env.NODE_ENV === 'development' ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { DEV?: boolean } })?.env?.DEV === true);
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * 功能类型
 */
export type FeatureType = 'localStorage' | 'sessionStorage' | 'blob' | 'download' | 'formData';

/**
 * 环境适配器
 * 提供环境相关的适配功能
 */
class EnvironmentAdapter {
  /**
   * 获取存储适配器（根据环境自动选择）
   * @returns 存储适配器实例
   */
  getStorageAdapter(): StorageAdapter {
    if (isBrowser) {
      try {
        // 尝试使用 localStorage
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
        return new LocalStorageAdapter();
      } catch {
        // localStorage 不可用，使用内存存储
        return new MemoryStorageAdapter();
      }
    }
    // SSR 环境使用内存存储
    return new MemoryStorageAdapter();
  }

  /**
   * 检查功能是否可用
   * @param feature 功能类型
   * @returns 是否可用
   */
  isFeatureAvailable(feature: FeatureType): boolean {
    switch (feature) {
      case 'localStorage':
        return isBrowser && typeof localStorage !== 'undefined';
      case 'sessionStorage':
        return isBrowser && typeof sessionStorage !== 'undefined';
      case 'blob':
        return isBrowser && typeof Blob !== 'undefined';
      case 'download':
        return isBrowser && typeof document !== 'undefined' && typeof URL !== 'undefined';
      case 'formData':
        return typeof FormData !== 'undefined';
      default:
        return false;
    }
  }

  /**
   * 检查是否支持文件下载
   * @returns 是否支持
   */
  supportsDownload(): boolean {
    return this.isFeatureAvailable('download');
  }

  /**
   * 检查是否支持 Blob
   * @returns 是否支持
   */
  supportsBlob(): boolean {
    return this.isFeatureAvailable('blob');
  }

  /**
   * 检查是否支持 FormData
   * @returns 是否支持
   */
  supportsFormData(): boolean {
    return this.isFeatureAvailable('formData');
  }
}

// 创建全局环境适配器实例
export const environmentAdapter = new EnvironmentAdapter();
