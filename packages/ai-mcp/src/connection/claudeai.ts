/**
 * MCP ClaudeAI Proxy — claude.ai 组织级管理的 MCP server 抓取
 *
 * 对齐 CC services/mcp/claudeai.ts。从 claude.ai 后端拉取组织管理的 MCP server 列表 （需要 user:mcp_servers OAuth
 * scope），结果按 session 缓存。返回的 server 配置会 注入到 normal MCP 配置流程中，与本地 ~/.claude.json 等同对待。
 */

import { z } from 'zod';

// ============================================================
// 协议常量
// ============================================================

const FETCH_TIMEOUT_MS = 5_000;
const MCP_SERVERS_BETA_HEADER = 'mcp-servers-2025-12-04';
const REQUIRED_SCOPE = 'user:mcp_servers';

// ============================================================
// Schema
// ============================================================

export const ClaudeAIMcpServerSchema = z.object({
  type: z.literal('mcp_server'),
  id: z.string(),
  display_name: z.string(),
  url: z.string(),
  created_at: z.string()
});

export type ClaudeAIMcpServer = z.infer<typeof ClaudeAIMcpServerSchema>;

export const ClaudeAIMcpServersResponseSchema = z.object({
  data: z.array(ClaudeAIMcpServerSchema),
  has_more: z.boolean(),
  next_page: z.string().nullable()
});

export type ClaudeAIMcpServersResponse = z.infer<typeof ClaudeAIMcpServersResponseSchema>;

// ============================================================
// Eligibility 状态（用于遥测）
// ============================================================

export type ClaudeAIMcpEligibilityState =
  | 'enabled'
  | 'disabled_env_var'
  | 'no_oauth_token'
  | 'missing_scope'
  | 'fetch_failed';

// ============================================================
// HTTP 抽象
// ============================================================

export interface ClaudeAIFetchProvider {
  fetch(
    url: string,
    init: {
      method: string;
      headers: Record<string, string>;
      timeoutMs: number;
    }
  ): Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
}

// ============================================================
// 抓取器
// ============================================================

export interface ClaudeAIMcpFetcherOptions {
  /** 基础 API URL（如 https://api.claude.ai） */
  readonly baseUrl: string;
  /** 是否启用（来自 ENABLE_CLAUDEAI_MCP_SERVERS 环境变量） */
  readonly enabled: boolean;
  /** OAuth token + scopes（从 claude.ai 登录获得） */
  readonly oauthTokens?: {
    readonly accessToken: string;
    readonly scopes?: readonly string[];
  };
  /** HTTP fetcher（由宿主提供，便于注入超时/重试） */
  readonly fetchProvider: ClaudeAIFetchProvider;
  /** 遥测回调 */
  readonly telemetry?: (state: ClaudeAIMcpEligibilityState) => void;
}

/** 抓取结果 */
export interface ClaudeAIMcpFetchResult {
  /** 服务器列表（key 为服务名） */
  readonly servers: Readonly<Record<string, ClaudeAIMcpServer>>;
  /** 实际状态 */
  readonly state: ClaudeAIMcpEligibilityState;
}

/**
 * 从 claude.ai 抓取组织管理的 MCP server 配置
 *
 * 会根据 oauthTokens 的 scope 自动判断是否有权限访问；返回空 servers 时不抛错， 而是通过 result.state 区分原因（disabled_env_var /
 * no_oauth_token / missing_scope / fetch_failed）。
 */
export async function fetchClaudeAIMcpServers(
  options: ClaudeAIMcpFetcherOptions
): Promise<ClaudeAIMcpFetchResult> {
  if (!options.enabled) {
    options.telemetry?.('disabled_env_var');
    return { servers: {}, state: 'disabled_env_var' };
  }

  const tokens = options.oauthTokens;
  if (!tokens?.accessToken) {
    options.telemetry?.('no_oauth_token');
    return { servers: {}, state: 'no_oauth_token' };
  }

  if (!tokens.scopes?.includes(REQUIRED_SCOPE)) {
    options.telemetry?.('missing_scope');
    return { servers: {}, state: 'missing_scope' };
  }

  const url = `${options.baseUrl.replace(/\/$/, '')}/v1/mcp_servers?limit=1000`;

  try {
    const res = await options.fetchProvider.fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Accept': 'application/json',
        'anthropic-beta': MCP_SERVERS_BETA_HEADER
      },
      timeoutMs: FETCH_TIMEOUT_MS
    });

    if (!res.ok) {
      options.telemetry?.('fetch_failed');
      return { servers: {}, state: 'fetch_failed' };
    }

    const json = await res.json();
    const parsed = ClaudeAIMcpServersResponseSchema.safeParse(json);
    if (!parsed.success) {
      options.telemetry?.('fetch_failed');
      return { servers: {}, state: 'fetch_failed' };
    }

    const servers: Record<string, ClaudeAIMcpServer> = {};
    for (const server of parsed.data.data) {
      servers[server.id] = server;
    }
    options.telemetry?.('enabled');
    return { servers, state: 'enabled' };
  } catch {
    options.telemetry?.('fetch_failed');
    return { servers: {}, state: 'fetch_failed' };
  }
}

/** 缓存包装器 — 一次 session 内只抓取一次，等同于 lodash `memoize` */
export class ClaudeAIMcpFetcherWithCache {
  private cache: Promise<ClaudeAIMcpFetchResult> | null = null;

  constructor(private readonly options: ClaudeAIMcpFetcherOptions) {}

  async getServers(): Promise<ClaudeAIMcpFetchResult> {
    if (!this.cache) {
      this.cache = fetchClaudeAIMcpServers(this.options);
    }
    return this.cache;
  }

  reset(): void {
    this.cache = null;
  }
}
