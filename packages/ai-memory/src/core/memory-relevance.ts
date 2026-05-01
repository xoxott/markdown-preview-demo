/** 记忆相关性评分 — 关键词 TF + 时间衰减，无 LLM 依赖 */

import type { MemoryEntry } from '../types/memory-entry';
import type {
  MemoryRelevanceConfig,
  RelevanceResult,
  ScoredEntry
} from '../types/memory-relevance';
import { DEFAULT_RELEVANCE_CONFIG } from '../types/memory-relevance';
import { memoryAgeDays } from './memory-age';

/** 英文停用词列表 */
export const DEFAULT_STOP_WORDS: readonly string[] = [
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'it',
  'its',
  'was',
  'are',
  'be',
  'been',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'me',
  'my',
  'your',
  'not',
  'no',
  'so',
  'if',
  'than',
  'then',
  'very',
  'just',
  'also',
  'about',
  'up',
  'out',
  'into',
  'over',
  'after',
  'before',
  'between',
  'what',
  'which',
  'who',
  'how',
  'where',
  'when',
  'why',
  'all',
  'each',
  'use',
  'using',
  'used',
  'like',
  'need',
  'make',
  'more',
  'some'
];

/** 提取关键词 — tokenize + lowercase + 移除停用词 + 去重 */
export function extractKeywords(text: string): string[] {
  // tokenize: 拆分空格、标点、换行
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s\u4E00-\u9FFF]/g, ' ') // 保留中文字符
    .split(/\s+/)
    .filter(t => t.length > 1); // 过滤单字符

  // 移除停用词
  const stopSet = new Set(DEFAULT_STOP_WORDS);
  const filtered = tokens.filter(t => !stopSet.has(t));

  // 去重
  return [...new Set(filtered)];
}

/**
 * 计算单个条目的相关性评分 score = Σ(keywordMatch × keywordBoost) + titleMatchCount × titleBoost +
 * typeMatchCount × typeBoost × decayFactor^ageDays
 */
export function computeRelevanceScore(
  queryKeywords: string[],
  entry: MemoryEntry,
  config: MemoryRelevanceConfig = DEFAULT_RELEVANCE_CONFIG,
  nowMs: number = Date.now()
): number {
  const lowerBody = `${entry.body.toLowerCase()} ${entry.header.description.toLowerCase()}`;
  const lowerName = entry.header.name.toLowerCase();
  const lowerType = entry.header.type;

  let score = 0;
  const matchedKeywords: string[] = [];

  // 关键词匹配（body + description）
  for (const kw of queryKeywords) {
    if (lowerBody.includes(kw)) {
      score += config.keywordBoost;
      matchedKeywords.push(kw);
    }
  }

  // 标题匹配加分
  for (const kw of queryKeywords) {
    if (lowerName.includes(kw)) {
      score += config.titleBoost;
    }
  }

  // 类型匹配加分（类型名直接匹配关键词）
  for (const kw of queryKeywords) {
    if (lowerType === kw || lowerType.includes(kw)) {
      score += config.typeBoost;
    }
  }

  // 时间衰减
  const ageDays = memoryAgeDays(entry.mtimeMs, nowMs);
  score *= config.decayFactor ** ageDays;

  return score;
}

/**
 * 记忆相关性排名 — 主入口
 *
 * 1. 从 query 提取关键词
 * 2. 对每个条目计算评分
 * 3. 过滤 minScore
 * 4. 按评分降序排列
 * 5. 截取 maxResults
 */
export function rankMemories(
  query: string,
  entries: MemoryEntry[],
  config: MemoryRelevanceConfig = DEFAULT_RELEVANCE_CONFIG,
  nowMs: number = Date.now()
): RelevanceResult {
  const queryKeywords = extractKeywords(query);

  if (queryKeywords.length === 0) {
    return { scoredEntries: [], totalCandidates: entries.length, queryKeywords: [] };
  }

  const scored: ScoredEntry[] = [];
  for (const entry of entries) {
    const matchedKeywords: string[] = [];
    const lowerBody = `${entry.body} ${entry.header.description}`.toLowerCase();
    const lowerName = entry.header.name.toLowerCase();

    for (const kw of queryKeywords) {
      if (lowerBody.includes(kw) || lowerName.includes(kw)) {
        matchedKeywords.push(kw);
      }
    }

    const score = computeRelevanceScore(queryKeywords, entry, config, nowMs);
    if (score >= config.minScore) {
      scored.push({ entry, score, matchedKeywords });
    }
  }

  // 按评分降序，评分相等时保持原始顺序（最新优先）
  scored.sort((a, b) => b.score - a.score || entries.indexOf(b.entry) - entries.indexOf(a.entry));

  return {
    scoredEntries: scored.slice(0, config.maxResults),
    totalCandidates: entries.length,
    queryKeywords
  };
}
