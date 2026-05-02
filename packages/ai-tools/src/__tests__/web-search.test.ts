/** @suga/ai-tools — WebSearchTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { WebSearchInput } from '../types/tool-inputs';
import { InMemorySearchProvider } from '../provider/InMemorySearchProvider';
import { webSearchTool } from '../tools/web-search';

function createContext(provider?: InMemorySearchProvider): ExtendedToolUseContext {
  const searchProvider = provider ?? new InMemorySearchProvider();
  return {
    abortController: new AbortController(),
    tools: {} as ToolRegistry,
    sessionId: 'test',
    fsProvider: {} as any,
    searchProvider
  };
}

describe('WebSearchTool', () => {
  it('search → 返回搜索结果', async () => {
    const provider = new InMemorySearchProvider([
      { title: 'Test Result', url: 'https://test.com', snippet: 'Test content' }
    ]);
    const result = await webSearchTool.call(
      { query: 'test query' } as WebSearchInput,
      createContext(provider)
    );
    expect(result.data.query).toBe('test query');
    expect(result.data.results.length).toBe(1);
    expect(result.data.results[0].title).toBe('Test Result');
    expect(result.data.durationSeconds).toBeGreaterThan(0);
  });

  it('search(allowedDomains) → 过滤域名', async () => {
    const provider = new InMemorySearchProvider([
      { title: 'Good', url: 'https://good.com/page', snippet: '' },
      { title: 'Bad', url: 'https://bad.com/page', snippet: '' }
    ]);
    const result = await webSearchTool.call(
      { query: 'test', allowedDomains: ['good.com'] } as WebSearchInput,
      createContext(provider)
    );
    expect(result.data.results.length).toBe(1);
    expect(result.data.results[0].url).toContain('good.com');
  });

  it('search(blockedDomains) → 排除域名', async () => {
    const provider = new InMemorySearchProvider([
      { title: 'Good', url: 'https://good.com/page', snippet: '' },
      { title: 'Blocked', url: 'https://blocked.com/page', snippet: '' }
    ]);
    const result = await webSearchTool.call(
      { query: 'test', blockedDomains: ['blocked.com'] } as WebSearchInput,
      createContext(provider)
    );
    expect(result.data.results.length).toBe(1);
    expect(result.data.results[0].url).not.toContain('blocked.com');
  });

  it('search(provider禁用) → 返回空结果', async () => {
    const provider = new InMemorySearchProvider();
    provider.setEnabled(false);
    const result = await webSearchTool.call(
      { query: 'test' } as WebSearchInput,
      createContext(provider)
    );
    expect(result.data.results).toEqual([]);
  });

  it('search(无provider) → 返回空结果', async () => {
    const result = await webSearchTool.call(
      { query: 'test' } as WebSearchInput,
      {
        abortController: new AbortController(),
        tools: {} as ToolRegistry,
        sessionId: 'test',
        fsProvider: {} as any
      } as ExtendedToolUseContext
    );
    expect(result.data.results).toEqual([]);
  });

  it('validateInput(空查询) → deny', () => {
    const ctx = createContext();
    const result = webSearchTool.validateInput!({ query: '' } as WebSearchInput, ctx);
    expect(result.behavior).toBe('deny');
  });

  it('validateInput(有效查询) → allow', () => {
    const ctx = createContext();
    const result = webSearchTool.validateInput!({ query: 'test' } as WebSearchInput, ctx);
    expect(result.behavior).toBe('allow');
  });

  it('isReadOnly → true', () => {
    expect(webSearchTool.isReadOnly!({ query: 'test' } as WebSearchInput)).toBe(true);
  });

  it('safetyLabel → network', () => {
    expect(webSearchTool.safetyLabel!({ query: 'test' } as WebSearchInput)).toBe('network');
  });

  it('isDestructive → false', () => {
    expect(webSearchTool.isDestructive!({ query: 'test' } as WebSearchInput)).toBe(false);
  });
});
