/**
 * OfficialRegistry — Anthropic MCP Registry URL 预取与安全验证
 *
 * N39: 从 Anthropic MCP Registry 预取官方 URL 列表， 用于验证用户配置的 MCP 服务器 URL 是否来自官方来源。
 */

export interface OfficialRegistryConfig {
  readonly enabled: boolean;
  readonly registryUrl: string;
  readonly cacheTtlMs: number;
}

export const DEFAULT_OFFICIAL_REGISTRY_CONFIG: OfficialRegistryConfig = {
  enabled: false,
  registryUrl: 'https://registry.mcp.anthropic.com',
  cacheTtlMs: 86400000 // 24h
};

/** FetchRegistryFn — 宿主注入的fetch函数 */
export type FetchRegistryFn = (url: string) => Promise<readonly OfficialMcpEntry[]>;

/** Official MCP 服务器条目 */
export interface OfficialMcpEntry {
  readonly name: string;
  readonly url: string;
  readonly description?: string;
  readonly category?: string;
  readonly verified: boolean;
}

/** isOfficialMcpServer — 检查 URL 是否在官方 Registry 中 */
export function isOfficialMcpServer(url: string, entries: readonly OfficialMcpEntry[]): boolean {
  return entries.some(e => e.url === url && e.verified);
}
