/**
 * MCP OAuth 特有类型定义
 *
 * 从Claude Code services/mcp/auth.ts ClaudeAuthProvider接口提取的抽象核心。
 * 覆盖OAuthClientProvider接口、DiscoveryState、Auth配置等。
 */

import type { OAuthTokens } from './auth-types';

// ─── OAuth Client Information ───

/** OAuth客户端信息（注册后的client_id/secret） */
export interface OAuthClientInformation {
  readonly client_id: string;
  readonly client_secret?: string;
}

/** OAuth客户端完整信息（含注册返回的所有字段） */
export interface OAuthClientInformationFull extends OAuthClientInformation {
  readonly client_name?: string;
  readonly redirect_uris?: string[];
}

// ─── OAuth Client Metadata ───

/** OAuth客户端注册元数据 — DCR时发送 */
export interface OAuthClientMetadata {
  readonly client_name: string;
  readonly redirect_uris: string[];
  readonly grant_types: string[];
  readonly response_types: string[];
  readonly token_endpoint_auth_method: string;
  readonly scope?: string;
}

// ─── OAuth Discovery State ───

/** OAuth Discovery状态 — 持久化最小URL（不含完整metadata blob） */
export interface OAuthDiscoveryState {
  readonly authorizationServerUrl?: string;
  readonly resourceMetadataUrl?: string;
  readonly resourceMetadata?: Record<string, unknown>;
  readonly authorizationServerMetadata?: Record<string, unknown>;
}

// ─── OAuth Client Provider 接口 ───

/**
 * OAuthClientProvider — MCP SDK的认证提供者接口
 *
 * 对齐Claude Code ClaudeAuthProvider，所有方法通过宿主注入的 storage/browser/crypto完成实际I/O操作。
 */
export interface OAuthClientProvider {
  /** 回调URL */
  readonly redirectUrl: string;

  /** 客户端注册元数据 */
  readonly clientMetadata: OAuthClientMetadata;

  /** CIMD URL（client_id_metadata_document） */
  readonly clientMetadataUrl?: string;

  /** 获取已注册的客户端信息 */
  clientInformation(): Promise<OAuthClientInformation | undefined>;

  /** 保存客户端注册信息 */
  saveClientInformation(info: OAuthClientInformationFull): Promise<void>;

  /** 获取当前token（可能触发自动刷新） */
  tokens(): Promise<OAuthTokens | undefined>;

  /** 保存新token */
  saveTokens(tokens: OAuthTokens): Promise<void>;

  /** 重定向到授权URL（通知UI/可选打开浏览器） */
  redirectToAuthorization(url: URL): Promise<void>;

  /** 保存PKCE code verifier */
  saveCodeVerifier(verifier: string): Promise<void>;

  /** 获取PKCE code verifier */
  codeVerifier(): Promise<string>;

  /** 失效指定范围的凭据 */
  invalidateCredentials(
    scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'
  ): Promise<void>;

  /** 保存Discovery状态 */
  saveDiscoveryState(state: OAuthDiscoveryState): Promise<void>;

  /** 获取Discovery状态 */
  discoveryState(): Promise<OAuthDiscoveryState | undefined>;

  /** 刷新authorization（用refresh_token换新token） */
  refreshAuthorization(refreshToken: string): Promise<OAuthTokens | undefined>;
}

// ─── Auth Provider 配置 ───

/** AuthProvider配置 — 每个MCP服务器对应一个 */
export interface AuthProviderConfig {
  readonly serverName: string;
  readonly serverUrl: string;
  readonly redirectUri: string;
  readonly skipBrowserOpen?: boolean;
  /** 预配置的OAuth clientId（部分服务器需要） */
  readonly clientId?: string;
}

// ─── Step-up Auth ───

/** Step-up认证状态 — 403 insufficient_scope时需要提升权限 */
export interface StepUpAuthState {
  readonly pendingScope?: string;
  readonly currentScopes: string[];
}

// ─── OAuth Flow 选项 ───

/** performOAuthFlow选项 */
export interface OAuthFlowOptions {
  readonly skipBrowserOpen?: boolean;
  readonly abortSignal?: AbortSignal;
  /** 远程环境手动粘贴callback URL */
  readonly onWaitingForCallback?: (submit: (callbackUrl: string) => void) => void;
}

/** performMcpOAuthFlow选项 */
export interface McpOAuthFlowOptions extends OAuthFlowOptions {
  /** 预配置的callback端口 */
  readonly callbackPort?: number;
  /** 预配置的metadata URL */
  readonly authServerMetadataUrl?: string;
}

// ─── Token Revocation ───

/** Token撤销选项 */
export interface TokenRevocationOptions {
  readonly preserveStepUpState?: boolean;
}

// ─── Auth Flow 结果 ───

/** OAuth流程结果 */
export type OAuthFlowResult = 'AUTHORIZED' | 'REDIRECT' | 'NEEDS_AUTH';

// ─── Fetch Like ───

/** fetch函数签名（用于discovery等HTTP请求） */
export type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;
