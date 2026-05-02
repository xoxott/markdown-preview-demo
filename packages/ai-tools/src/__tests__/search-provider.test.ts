/** @suga/ai-tools — InMemorySearchProvider测试 */

import { describe, expect, it } from 'vitest';
import { InMemorySearchProvider } from '../provider/InMemorySearchProvider';

describe('InMemorySearchProvider', () => {
  it('search → 返回固定结果', async () => {
    const provider = new InMemorySearchProvider([
      { title: 'Result 1', url: 'https://r1.com', snippet: 'Snippet 1' }
    ]);
    const result = await provider.search('test');
    expect(result.results.length).toBe(1);
    expect(result.durationSeconds).toBeGreaterThan(0);
  });

  it('search(allowedDomains) → 过滤', async () => {
    const provider = new InMemorySearchProvider([
      { title: 'A', url: 'https://allowed.com', snippet: '' },
      { title: 'B', url: 'https://blocked.com', snippet: '' }
    ]);
    const result = await provider.search('test', { allowedDomains: ['allowed.com'] });
    expect(result.results.length).toBe(1);
  });

  it('search(blockedDomains) → 排除', async () => {
    const provider = new InMemorySearchProvider([
      { title: 'A', url: 'https://good.com', snippet: '' },
      { title: 'B', url: 'https://bad.com', snippet: '' }
    ]);
    const result = await provider.search('test', { blockedDomains: ['bad.com'] });
    expect(result.results.length).toBe(1);
  });

  it('isEnabled → true(默认)', () => {
    const provider = new InMemorySearchProvider();
    expect(provider.isEnabled()).toBe(true);
  });

  it('setEnabled(false) → isEnabled返回false', () => {
    const provider = new InMemorySearchProvider();
    provider.setEnabled(false);
    expect(provider.isEnabled()).toBe(false);
  });

  it('reset → 清空历史', async () => {
    const provider = new InMemorySearchProvider();
    await provider.search('test1');
    await provider.search('test2');
    provider.reset();
    expect(provider.getSearchHistory()).toEqual([]);
  });
});