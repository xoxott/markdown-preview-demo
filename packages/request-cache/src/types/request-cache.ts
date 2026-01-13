/**
 * 请求缓存管理器相关类型定义
 */

import type { CacheStrategy, CustomCacheStrategy } from './strategy';
import type { StorageAdapter } from '@suga/storage';

/**
 * 请求缓存配置
 */
export interface RequestCacheOptions {
  /** 默认缓存过期时间（毫秒），默认 5 分钟 */
  defaultExpireTime?: number;
  /** 是否启用持久化缓存 */
  useStorage?: boolean;
  /** 持久化缓存键前缀 */
  storagePrefix?: string;
  /** 缓存策略，默认 'time' */
  strategy?: CacheStrategy;
  /** 最大缓存数量（LRU/FIFO 策略使用） */
  maxSize?: number;
  /** 自定义缓存策略函数（仅在 strategy 为 'custom' 时有效） */
  customStrategy?: CustomCacheStrategy;
  /** 存储适配器（可选，用于自定义存储实现） */
  storageAdapter?: StorageAdapter;
}

