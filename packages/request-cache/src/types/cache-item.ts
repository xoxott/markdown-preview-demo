/**
 * 缓存项类型定义
 */

/**
 * 缓存项接口
 */
export interface CacheItem<T = unknown> {
  /** 缓存数据 */
  data: T;
  /** 创建时间戳 */
  timestamp: number;
  /** 过期时间戳 */
  expireTime: number;
}

