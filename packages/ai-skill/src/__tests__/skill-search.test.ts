import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SKILL_SEARCH_CONFIG,
  computeRelevance,
  searchSkillsLocal
} from '../core/skill-search';

describe('searchSkillsLocal', () => {
  it('finds skills by name', () => {
    const registry = {
      list: () => [
        { name: 'commit', description: 'Create git commits' },
        { name: 'review-pr', description: 'Review pull requests' }
      ]
    };
    const results = searchSkillsLocal('commit', registry);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('commit');
  });

  it('finds skills by description', () => {
    const registry = {
      list: () => [
        { name: 'commit', description: 'Create git commits' },
        { name: 'skill-x', description: 'Something unrelated' }
      ]
    };
    const results = searchSkillsLocal('git', registry);
    expect(results.length).toBeGreaterThan(0);
  });

  it('disabled → empty', () => {
    const registry = { list: () => [{ name: 'commit', description: 'test' }] };
    const results = searchSkillsLocal('commit', registry, {
      ...DEFAULT_SKILL_SEARCH_CONFIG,
      localSearchEnabled: false
    });
    expect(results).toHaveLength(0);
  });

  it('no match → empty', () => {
    const registry = { list: () => [{ name: 'commit', description: 'git' }] };
    const results = searchSkillsLocal('xyz', registry);
    expect(results).toHaveLength(0);
  });

  it('limits max results', () => {
    const registry = {
      list: () =>
        Array.from({ length: 30 }, (_, i) => ({ name: `skill-${i}`, description: `skill ${i}` }))
    };
    const results = searchSkillsLocal('skill', registry, {
      ...DEFAULT_SKILL_SEARCH_CONFIG,
      maxResults: 5
    });
    expect(results.length).toBeLessThanOrEqual(5);
  });
});

describe('computeRelevance', () => {
  it('exact match → highest score', () => {
    expect(computeRelevance('commit', 'commit', 'desc')).toBeGreaterThan(10);
  });

  it('name contains query → good score', () => {
    expect(computeRelevance('com', 'commit', 'desc')).toBeGreaterThan(0);
  });

  it('description contains query → some score', () => {
    expect(computeRelevance('git', 'skill', 'Create git commits')).toBeGreaterThan(0);
  });

  it('no match → 0', () => {
    expect(computeRelevance('xyz', 'commit', 'desc')).toBe(0);
  });
});
