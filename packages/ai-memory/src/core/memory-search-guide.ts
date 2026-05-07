/**
 * G40: Memory 搜索指导 — 构建搜索上下文段
 *
 * 对齐 Claude Code buildSearchingPastContextSection:
 *
 * 在 LLM system prompt 中插入一段指导，告诉模型如何搜索过去的记忆。 指导内容:
 *
 * 1. 当用户提到"之前"、"上次"、"以前"等 → 搜索记忆
 * 2. 搜索策略: 先关键词 → 再时间范围 → 再类型过滤
 * 3. 搜索后根据相关性评分决定是否引用
 */

import type { MemorySearchGuideConfig } from '../types/memory-search-guide';

/** 默认搜索指导配置 */
const DEFAULT_SEARCH_GUIDE_CONFIG: MemorySearchGuideConfig = {
  enabled: true,
  maxSearchResults: 5,
  relevanceThreshold: 0.3,
  searchHintKeywords: [
    '之前',
    '上次',
    '以前',
    '以前做',
    '上次做',
    '之前做',
    '上次说过',
    '之前说过',
    'before',
    'previous',
    'earlier',
    'last time',
    'past'
  ],
  includeSearchStrategyHint: true
};

/**
 * buildSearchingPastContextSection — 构建记忆搜索指导段
 *
 * 返回一段文本，插入到 system prompt 中，指导 LLM： 当用户提到过去的事件/决策时，主动搜索记忆库。
 */
export function buildSearchingPastContextSection(
  config?: Partial<MemorySearchGuideConfig>
): string {
  const merged = { ...DEFAULT_SEARCH_GUIDE_CONFIG, ...config };

  if (!merged.enabled) return '';

  const hintKeywordsStr = merged.searchHintKeywords.join('、');

  const section = `<memory-search-guide>
When the user mentions past events, decisions, or prior work (keywords like: ${hintKeywordsStr}), you should search the memory system before responding.

Search strategy:
1. Extract key concepts from the user's mention (project names, tool names, decisions, errors)
2. Use those concepts as search queries against the memory store
3. Review top ${merged.maxSearchResults} results with relevance score >= ${merged.relevanceThreshold}
4. If relevant memories found: reference them in your response with context
5. If no relevant memories: proceed normally without mentioning the search
</memory-search-guide>`;

  return section;
}

/**
 * detectMemorySearchTrigger — 检测用户消息是否触发记忆搜索
 *
 * 返回是否需要搜索记忆，以及建议的搜索关键词。
 */
export function detectMemorySearchTrigger(
  userMessage: string,
  config?: Partial<MemorySearchGuideConfig>
): { shouldSearch: boolean; suggestedKeywords: string[] } {
  const merged = { ...DEFAULT_SEARCH_GUIDE_CONFIG, ...config };
  const lowerMsg = userMessage.toLowerCase();

  // 检测触发关键词
  const triggered = merged.searchHintKeywords.some(kw => lowerMsg.includes(kw.toLowerCase()));

  if (!triggered) {
    return { shouldSearch: false, suggestedKeywords: [] };
  }

  // 提取搜索关键词: 去掉触发词，提取剩余的实词
  const words = lowerMsg
    .replace(/[之前上次以前说过做]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  return {
    shouldSearch: true,
    suggestedKeywords: words.length > 0 ? words : [lowerMsg.substring(0, 20)]
  };
}
