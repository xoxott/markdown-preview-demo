/** 记忆年龄/鲜度类型 */

/** 记忆年龄信息 */
export interface MemoryAgeInfo {
  readonly ageDays: number;
  readonly ageText: string; // '2 days', '3 weeks', '5 months'
  readonly freshnessText: string; // 'fresh' | 'stale' | 'very stale'
  readonly freshnessNote: string; // 鲜度警告文本，用于提示注入
}

/** 鲜度阈值常量 */
export const FRESH_THRESHOLD_DAYS = 7;
export const STALE_THRESHOLD_DAYS = 30;
export const VERY_STALE_THRESHOLD_DAYS = 90;
