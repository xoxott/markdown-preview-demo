/**
 * VNode 缓存管理模块
 *
 * @module cache
 * @note 当前缓存系统已定义但未在渲染流程中使用
 *       如需启用缓存，需要在 render 函数中集成缓存逻辑
 */

import type { FrameworkNode } from '../adapters/types';
import { PERFORMANCE_CONFIG } from '../constants';

/** VNode 缓存 */
const vnodeCache = new Map<string, FrameworkNode>();

/** 缓存清理定时器 ID */
let cacheCleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 清理过期缓存（保留一半缓存，FIFO 策略）
 */
export function cleanCache(): void {
  if (vnodeCache.size <= PERFORMANCE_CONFIG.CACHE_MAX_SIZE) {
    return;
  }

  const keys = Array.from(vnodeCache.keys());
  const deleteCount = Math.floor(keys.length / 2);

  // 删除前一半的缓存（FIFO 策略）
  for (let i = 0; i < deleteCount; i++) {
    vnodeCache.delete(keys[i]);
  }
}

/**
 * 启动缓存清理定时器
 */
export function startCacheCleanup(): void {
  if (cacheCleanupTimer) {
    return; // 已经启动
  }

  cacheCleanupTimer = setInterval(() => {
    cleanCache();
  }, PERFORMANCE_CONFIG.CACHE_CLEANUP_INTERVAL);
}

/**
 * 停止缓存清理定时器
 */
export function stopCacheCleanup(): void {
  if (cacheCleanupTimer) {
    clearInterval(cacheCleanupTimer);
    cacheCleanupTimer = null;
  }
}

/**
 * 获取缓存
 *
 * @param key - 缓存键
 * @returns 缓存的 VNode 或 undefined
 */
export function getCache(key: string): FrameworkNode | undefined {
  return vnodeCache.get(key);
}

/**
 * 设置缓存
 *
 * @param key - 缓存键
 * @param value - VNode 值
 */
export function setCache(key: string, value: FrameworkNode): void {
  vnodeCache.set(key, value);
}

/**
 * 清除所有缓存
 */
export function clearCache(): void {
  vnodeCache.clear();
}

/**
 * 获取缓存统计信息
 *
 * @returns 缓存统计
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: vnodeCache.size,
    maxSize: PERFORMANCE_CONFIG.CACHE_MAX_SIZE
  };
}

