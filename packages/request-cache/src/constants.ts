/**
 * 缓存常量定义
 */

/**
 * 默认缓存配置常量
 */
export const DEFAULT_CACHE_CONFIG = {
  /** 默认缓存过期时间：5 分钟 */
  DEFAULT_EXPIRE_TIME: 5 * 60 * 1000,
  /** 持久化缓存键前缀 */
  STORAGE_PREFIX: 'cache_',
  /** 默认最大缓存数量 */
  DEFAULT_MAX_SIZE: 100,
} as const;
