/** MemoryRelevance 测试 — 关键词提取 + TF评分 + 排名 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STOP_WORDS,
  computeRelevanceScore,
  extractKeywords,
  rankMemories
} from '../core/memory-relevance';
import { DEFAULT_RELEVANCE_CONFIG } from '../types/memory-relevance';
import type { MemoryEntry } from '../types/memory-entry';
import type { MemoryType } from '../types/memory-type';

function makeEntry(
  name: string,
  desc: string,
  type: MemoryType,
  body: string,
  mtimeMs: number = Date.now()
): MemoryEntry {
  return {
    header: { name, description: desc, type },
    body,
    filePath: `${type}/${name}.md`,
    mtimeMs
  };
}

describe('MemoryRelevance — extractKeywords', () => {
  it('正常英文文本 → 提取关键词', () => {
    const keywords = extractKeywords('how to use React hooks for state management');
    expect(keywords).toContain('react');
    expect(keywords).toContain('hooks');
    expect(keywords).toContain('state');
    expect(keywords).toContain('management');
    // 停用词过滤
    expect(keywords).not.toContain('how');
    expect(keywords).not.toContain('to');
    expect(keywords).not.toContain('use');
    expect(keywords).not.toContain('for');
  });

  it('空字符串 → 无关键词', () => {
    expect(extractKeywords('')).toEqual([]);
  });

  it('纯停用词 → 无关键词', () => {
    expect(extractKeywords('the a an is it')).toEqual([]);
  });

  it('中文文本 → 保留中文字符', () => {
    const keywords = extractKeywords('如何使用 React 组件');
    expect(keywords).toContain('react');
    expect(keywords.some(k => k.includes('组件'))).toBe(true);
  });

  it('大小写 → 统一小写', () => {
    const keywords = extractKeywords('REACT hooks TypeScript');
    expect(keywords).toContain('react');
    expect(keywords).toContain('typescript');
  });

  it('单字符 → 过滤', () => {
    const keywords = extractKeywords('a b c React');
    expect(keywords).not.toContain('a');
    expect(keywords).not.toContain('b');
    expect(keywords).toContain('react');
  });

  it('去重 → 不重复', () => {
    const keywords = extractKeywords('React React hooks hooks');
    expect(keywords.filter(k => k === 'react').length).toBe(1);
  });
});

describe('MemoryRelevance — computeRelevanceScore', () => {
  it('关键词完全匹配 → 高分', () => {
    const entry = makeEntry(
      'React Hooks',
      'How to use React hooks',
      'feedback',
      'Use React hooks for state management'
    );
    const score = computeRelevanceScore(['react', 'hooks'], entry);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeGreaterThanOrEqual(DEFAULT_RELEVANCE_CONFIG.keywordBoost * 2);
  });

  it('部分关键词匹配 → 中等分', () => {
    const entry = makeEntry(
      'Preferences',
      'User prefers dark mode',
      'user',
      'Dark mode and VS Code'
    );
    const score = computeRelevanceScore(['dark', 'preferences'], entry);
    expect(score).toBeGreaterThan(0);
  });

  it('无匹配 → 0分', () => {
    const entry = makeEntry(
      'Git Rules',
      'Use git for version control',
      'feedback',
      'Always commit with messages'
    );
    const score = computeRelevanceScore(['react', 'hooks'], entry);
    expect(score).toBe(0);
  });

  it('标题匹配 → titleBoost 加分', () => {
    const entry = makeEntry('React Guide', 'React framework', 'reference', 'A guide');
    const scoreWithTitle = computeRelevanceScore(['react'], entry);
    const entryNoTitle = makeEntry('Guide', 'React framework', 'reference', 'A guide');
    const scoreNoTitle = computeRelevanceScore(['react'], entryNoTitle);
    expect(scoreWithTitle).toBeGreaterThan(scoreNoTitle);
  });

  it('类型匹配 → typeBoost 加分', () => {
    const entry = makeEntry('Rules', 'DB rules', 'feedback', 'No mocks');
    const score = computeRelevanceScore(['feedback'], entry);
    expect(score).toBeGreaterThanOrEqual(DEFAULT_RELEVANCE_CONFIG.typeBoost);
  });

  it('时间衰减 → 旧文件分数更低', () => {
    const now = Date.now();
    const freshEntry = makeEntry('React', 'React guide', 'reference', 'React hooks', now - 1000);
    const staleEntry = makeEntry(
      'React',
      'React guide',
      'reference',
      'React hooks',
      now - 30 * 24 * 60 * 60 * 1000
    );
    const freshScore = computeRelevanceScore(['react'], freshEntry, DEFAULT_RELEVANCE_CONFIG, now);
    const staleScore = computeRelevanceScore(['react'], staleEntry, DEFAULT_RELEVANCE_CONFIG, now);
    expect(freshScore).toBeGreaterThan(staleScore);
  });
});

describe('MemoryRelevance — rankMemories', () => {
  it('多个条目 → 按评分排名', () => {
    const entries = [
      makeEntry(
        'React Hooks',
        'React hooks guide',
        'reference',
        'Use React hooks for state',
        Date.now() - 1000
      ),
      makeEntry(
        'Git Rules',
        'Git conventions',
        'feedback',
        'Always commit with messages',
        Date.now() - 1000
      ),
      makeEntry(
        'Dark Mode',
        'Prefers dark mode',
        'user',
        'User prefers dark theme',
        Date.now() - 1000
      )
    ];
    const result = rankMemories('React hooks state', entries);
    expect(result.scoredEntries.length).toBeGreaterThan(0);
    expect(result.scoredEntries[0].entry.header.name).toBe('React Hooks');
  });

  it('minScore 过滤 → 低分条目被排除', () => {
    const entries = [
      makeEntry('React', 'React guide', 'reference', 'React framework', Date.now()),
      makeEntry('Git', 'Git rules', 'feedback', 'No related content', Date.now())
    ];
    const result = rankMemories('React', entries, { ...DEFAULT_RELEVANCE_CONFIG, minScore: 5 });
    // Git 条目无 React 关键词 → 分数为 0 → 被过滤
    expect(result.scoredEntries.every(e => e.score >= 5)).toBe(true);
  });

  it('maxResults 截取 → 最多5个', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry(`React ${i}`, `React guide ${i}`, 'reference', 'React hooks', Date.now() - i * 1000)
    );
    const result = rankMemories('React', entries);
    expect(result.scoredEntries.length).toBeLessThanOrEqual(DEFAULT_RELEVANCE_CONFIG.maxResults);
  });

  it('空查询 → 无结果', () => {
    const entries = [makeEntry('React', 'React guide', 'reference', 'React hooks')];
    const result = rankMemories('', entries);
    expect(result.scoredEntries.length).toBe(0);
    expect(result.queryKeywords.length).toBe(0);
  });

  it('空条目 → 无结果', () => {
    const result = rankMemories('React hooks', []);
    expect(result.scoredEntries.length).toBe(0);
    expect(result.totalCandidates).toBe(0);
  });
});

describe('MemoryRelevance — DEFAULT_STOP_WORDS', () => {
  it('含基本停用词', () => {
    expect(DEFAULT_STOP_WORDS).toContain('the');
    expect(DEFAULT_STOP_WORDS).toContain('and');
    expect(DEFAULT_STOP_WORDS).toContain('is');
  });

  it('不含关键词性词汇', () => {
    expect(DEFAULT_STOP_WORDS).not.toContain('react');
    expect(DEFAULT_STOP_WORDS).not.toContain('hooks');
  });
});
