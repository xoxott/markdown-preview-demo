/** 记忆年龄/鲜度计算 — 纯函数 */

import type { MemoryAgeInfo } from '../types/memory-age';
import { FRESH_THRESHOLD_DAYS, STALE_THRESHOLD_DAYS } from '../types/memory-age';

/** 计算记忆年龄天数 — floor 取整，负数钳制为 0 */
export function memoryAgeDays(mtimeMs: number, nowMs: number = Date.now()): number {
  const days = Math.floor((nowMs - mtimeMs) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

/** 人类可读年龄文本 — 'today', 'yesterday', 'N days', 'N weeks', 'N months', 'N years' */
export function memoryAge(mtimeMs: number, nowMs: number = Date.now()): string {
  const days = memoryAgeDays(mtimeMs, nowMs);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 60) {
    const w = Math.round(days / 7);
    return `${w} week${w !== 1 ? 's' : ''}`;
  }
  if (days < 365) {
    const m = Math.round(days / 30);
    return `${m} month${m !== 1 ? 's' : ''}`;
  }
  const y = Math.round(days / 365);
  return `${y} year${y !== 1 ? 's' : ''}`;
}

/** 鲜度等级文本 — 'fresh' | 'stale' | 'very stale' */
export function memoryFreshnessText(mtimeMs: number, nowMs: number = Date.now()): string {
  const days = memoryAgeDays(mtimeMs, nowMs);
  if (days < FRESH_THRESHOLD_DAYS) return 'fresh';
  if (days < STALE_THRESHOLD_DAYS) return 'stale';
  return 'very stale';
}

/**
 * 鲜度警告文本 — 用于提示注入 fresh: 无警告 stale: '(stale — N days old, consider refreshing)' very stale: '(very
 * stale — N months/years old)'
 */
export function memoryFreshnessNote(mtimeMs: number, nowMs: number = Date.now()): string {
  const freshness = memoryFreshnessText(mtimeMs, nowMs);
  const age = memoryAge(mtimeMs, nowMs);

  if (freshness === 'fresh') return '';
  if (freshness === 'stale') return `(stale — ${age}, consider refreshing)`;
  return `(very stale — ${age})`;
}

/** 聚合年龄信息 */
export function memoryAgeInfo(mtimeMs: number, nowMs: number = Date.now()): MemoryAgeInfo {
  return {
    ageDays: memoryAgeDays(mtimeMs, nowMs),
    ageText: memoryAge(mtimeMs, nowMs),
    freshnessText: memoryFreshnessText(mtimeMs, nowMs),
    freshnessNote: memoryFreshnessNote(mtimeMs, nowMs)
  };
}
