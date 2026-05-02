/** InMemorySearchProvider — 内存搜索实现（测试+轻量宿主） */

import type {
  SearchOptions,
  SearchProvider,
  SearchResult,
  SearchResultItem
} from '../types/search-provider';

export class InMemorySearchProvider implements SearchProvider {
  private enabled = true;
  private fixedResults: SearchResultItem[] = [];
  private searchHistory: string[] = [];

  constructor(fixedResults?: SearchResultItem[]) {
    this.fixedResults = fixedResults ?? [
      { title: 'Example Result', url: 'https://example.com', snippet: 'Example snippet' }
    ];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setFixedResults(results: SearchResultItem[]): void {
    this.fixedResults = results;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    this.searchHistory.push(query);

    let results = [...this.fixedResults];

    // 过滤 allowedDomains
    if (options?.allowedDomains?.length) {
      results = results.filter(r => options.allowedDomains!.some(d => r.url.includes(d)));
    }

    // 过滤 blockedDomains
    if (options?.blockedDomains?.length) {
      results = results.filter(r => !options.blockedDomains!.some(d => r.url.includes(d)));
    }

    return { results, durationSeconds: 0.5 };
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  reset(): void {
    this.searchHistory = [];
  }

  getSearchHistory(): string[] {
    return this.searchHistory;
  }
}
