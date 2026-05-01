/** 记忆相关性评分类型 — 关键词 TF 评分配置 */

import type { MemoryEntry } from './memory-entry';

/** 相关性评分配置 */
export interface MemoryRelevanceConfig {
  readonly maxResults: number; // 默认 5
  readonly minScore: number; // 默认 0.1
  readonly keywordBoost: number; // 默认 2.0 — 关键词匹配加分
  readonly titleBoost: number; // 默认 3.0 — 标题匹配加分
  readonly typeBoost: number; // 默认 1.5 — 类型匹配加分
  readonly decayFactor: number; // 默认 0.95 — 时间衰减因子（每天）
}

/** 评分后的条目 */
export interface ScoredEntry {
  readonly entry: MemoryEntry;
  readonly score: number;
  readonly matchedKeywords: readonly string[];
}

/** 相关性查询结果 */
export interface RelevanceResult {
  readonly scoredEntries: readonly ScoredEntry[];
  readonly totalCandidates: number;
  readonly queryKeywords: readonly string[];
}

/** 默认评分配置 */
export const DEFAULT_RELEVANCE_CONFIG: MemoryRelevanceConfig = {
  maxResults: 5,
  minScore: 0.1,
  keywordBoost: 2.0,
  titleBoost: 3.0,
  typeBoost: 1.5,
  decayFactor: 0.95
};
