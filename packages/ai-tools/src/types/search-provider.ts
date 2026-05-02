/** SearchProvider — 搜索查询宿主注入接口 */

/** 搜索选项 */
export interface SearchOptions {
  /** 仅包含这些域名的结果 */
  allowedDomains?: string[];
  /** 不包含这些域名的结果 */
  blockedDomains?: string[];
}

/** 搜索结果条目 */
export interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
}

/** 搜索结果 */
export interface SearchResult {
  results: SearchResultItem[];
  durationSeconds: number;
}

/**
 * SearchProvider — 搜索查询宿主注入
 *
 * 工具通过此接口执行搜索查询，宿主注入具体实现。 Anthropic API的web_search_20250305 server-side tool可作为真实宿主后端。
 */
export interface SearchProvider {
  /** 执行搜索查询 */
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  /** 是否启用（无人值守/不支持搜索时禁用） */
  isEnabled(): boolean;
}
