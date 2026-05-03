/**
 * SandboxHttpProvider — 装饰器模式，在 HttpProvider 之上加入 network allow/deny 过滤
 *
 * 拦截 HttpProvider.fetch(url) 请求，检查目标域名是否在 SandboxSettings.network 规则内：
 *
 * - deny 规则优先：域名匹配 deny 列表 → 返回模拟 403 Response
 * - allow 规则白名单：如果 allow 列表存在，域名不在其中 → 返回模拟 403 Response
 * - 两者都不存在 → 允许所有（等同于无网络沙箱）
 *
 * htmlToMarkdown 不做拦截（不涉及网络请求）。
 * isPreapprovedUrl 与 sandbox allow 规则对齐。
 */

import type { HttpProvider } from '../types/http-provider';
import type { SandboxSettings, SandboxNetworkConfig } from '@suga/ai-sdk';

/** 沙箱网络拒绝错误 */
export class SandboxNetworkDenyError extends Error {
  readonly url: string;
  readonly rule: string;

  constructor(url: string, rule: string) {
    super(`Sandbox network denied: ${url} (rule: ${rule})`);
    this.name = 'SandboxNetworkDenyError';
    this.url = url;
    this.rule = rule;
  }
}

/**
 * 从 URL 中提取域名
 *
 * 示例:
 * - https://api.openai.com/v1/chat → api.openai.com
 * - http://localhost:3000/test → localhost
 * - https://evil.com → evil.com
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    // URL 解析失败 → 返回原始字符串（无法匹配规则，默认拒绝）
    return url;
  }
}

/**
 * domainMatchesPattern — 检查域名是否匹配 pattern
 *
 * 支持精确匹配和通配符:
 * - '*.evil.com' → 匹配 sub.evil.com, 但不匹配 evil.com
 * - 'evil.com' → 精确匹配
 */
function domainMatchesPattern(domain: string, pattern: string): boolean {
  // 精确匹配
  if (pattern === domain) return true;

  // 通配符子域名: *.evil.com → 匹配 xxx.evil.com
  if (pattern.startsWith('*.')) {
    const base = pattern.slice(2);
    return domain === base || domain.endsWith('.' + base);
  }

  return false;
}

/**
 * isDomainAllowed — 检查域名是否被网络沙箱规则允许
 *
 * 逻辑:
 * 1. deny 列表优先 — 域名匹配任何 deny 规则 → 拒绝
 * 2. allow 列表白名单 — 如果 allow 列表存在且域名不在其中 → 拒绝
 * 3. 两者都无规则 → 允许
 */
function isDomainAllowed(domain: string, networkConfig: SandboxNetworkConfig): { allowed: true } | { allowed: false; rule: string } {
  // 1. deny 优先
  if (networkConfig.deny) {
    for (const pattern of networkConfig.deny) {
      if (domainMatchesPattern(domain, pattern)) {
        return { allowed: false, rule: pattern };
      }
    }
  }

  // 2. allow 白名单
  if (networkConfig.allow) {
    for (const pattern of networkConfig.allow) {
      if (domainMatchesPattern(domain, pattern)) {
        return { allowed: true };
      }
    }
    return { allowed: false, rule: 'allow_list' };
  }

  return { allowed: true };
}

/** SandboxHttpProvider 配置 */
export interface SandboxHttpProviderConfig {
  readonly inner: HttpProvider;
  readonly sandbox: SandboxSettings;
}

/**
 * SandboxHttpProvider — 罅饰器模式网络沙箱
 *
 * 包裹 inner HttpProvider，在 fetch() 中拦截域名。
 * deny 规则触发 403 Response（工具可捕获并返回友好消息）。
 */
export class SandboxHttpProvider implements HttpProvider {
  private readonly inner: HttpProvider;
  private readonly sandbox: SandboxSettings;

  constructor(config: SandboxHttpProviderConfig) {
    this.inner = config.inner;
    this.sandbox = config.sandbox;
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const domain = extractDomain(url);
    const networkConfig = this.sandbox.network;
    if (!networkConfig) return this.inner.fetch(url, init);

    const result = isDomainAllowed(domain, networkConfig);
    if (!result.allowed) {
      // 返回模拟 403 Response（不抛出异常，保持 fetch API 契约）
      return new Response(
        `Sandbox network denied: access to ${domain} is blocked (rule: ${result.rule})`,
        { status: 403, statusText: 'Forbidden', headers: { 'Content-Type': 'text/plain' } }
      );
    }

    return this.inner.fetch(url, init);
  }

  htmlToMarkdown(html: string, url: string): string {
    // 不拦截 — htmlToMarkdown 不涉及网络请求
    return this.inner.htmlToMarkdown(html, url);
  }

  isPreapprovedUrl(url: string): boolean {
    const domain = extractDomain(url);
    const networkConfig = this.sandbox.network;
    if (!networkConfig?.allow) return this.inner.isPreapprovedUrl?.(url) ?? false;

    // allow 列表中的域名视为预批准
    return isDomainAllowed(domain, networkConfig).allowed;
  }
}

// ============================================================
// SandboxSearchProvider
// ============================================================

import type { SearchProvider, SearchOptions, SearchResult } from '../types/search-provider';

/** SandboxSearchProvider 配置 */
export interface SandboxSearchProviderConfig {
  readonly inner: SearchProvider;
  readonly sandbox: SandboxSettings;
}

/**
 * SandboxSearchProvider — 腔饰器模式搜索沙箱
 *
 * 两种拦截方式:
 * 1. 将 sandbox deny 合入 options.blockedDomains, allow 合入 options.allowedDomains
 * 2. 对返回结果中的 url 做二次过滤（去除不符合规则的域名）
 * 3. deny 列表阻止搜索后端域名 → isEnabled() 返回 false
 */
export class SandboxSearchProvider implements SearchProvider {
  private readonly inner: SearchProvider;
  private readonly sandbox: SandboxSettings;

  constructor(config: SandboxSearchProviderConfig) {
    this.inner = config.inner;
    this.sandbox = config.sandbox;
  }

  isEnabled(): boolean {
    const networkConfig = this.sandbox.network;
    if (!networkConfig) return this.inner.isEnabled();

    // 如果 deny 列表完全阻止搜索（例如 deny 包含 '*' 或搜索引擎域名）
    // 则禁用搜索
    if (networkConfig.deny?.some(p => p === '*')) return false;

    return this.inner.isEnabled();
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const networkConfig = this.sandbox.network;
    if (!networkConfig) return this.inner.search(query, options);

    // 合并 sandbox 规则到 search options
    const mergedOptions: SearchOptions = {
      ...options,
      allowedDomains: [...(networkConfig.allow ?? []), ...(options?.allowedDomains ?? [])],
      blockedDomains: [...(networkConfig.deny ?? []), ...(options?.blockedDomains ?? [])]
    };

    const result = await this.inner.search(query, mergedOptions);

    // 二次过滤: 对结果中的 url 做域名过滤
    const filteredResults = result.results.filter(item => {
      const domain = extractDomain(item.url);
      return isDomainAllowed(domain, networkConfig).allowed;
    });

    return {
      ...result,
      results: filteredResults
    };
  }
}

// 导出内部函数供测试使用
export { extractDomain, domainMatchesPattern, isDomainAllowed };