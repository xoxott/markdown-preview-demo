/**
 * MCP OAuth + Cross-App Access (XAA) 类型定义
 *
 * 对齐 Claude Code MCP OAuth 配置:
 *
 * 1. OAuth 认证流程配置（PKCE + Discovery + Dynamic Registration）
 * 2. Cross-App Access 配置（跨应用访问授权）
 * 3. OAuth token 管理（获取/刷新/存储）
 *
 * 注: 这是类型层，OAuth 流程实现由宿主注入 OAuthProvider。
 */

// ============================================================
// OAuth 流程类型
// ============================================================

/** OAuth 认证方法 */
export type OAuthAuthMethod = 'pkce' | 'client_credentials' | 'authorization_code';

/** OAuth Server Metadata（RFC 8414） */
export interface OAuthServerMetadata {
  readonly issuer: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly registrationEndpoint?: string;
  readonly revocationEndpoint?: string;
  readonly scopesSupported?: readonly string[];
  readonly responseTypesSupported?: readonly string[];
  readonly grantTypesSupported?: readonly string[];
  readonly codeChallengeMethodsSupported?: readonly string[];
}

/** OAuth Client Registration 结果 */
export interface OAuthClientRegistration {
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly registrationAccessToken?: string;
  readonly clientIdIssuedAt?: number;
  readonly clientSecretExpiresAt?: number;
}

/** OAuth Token Response */
export interface OAuthTokenResponse {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn?: number;
  readonly refreshToken?: string;
  readonly scope?: string;
}

/** OAuth 错误响应 */
export interface OAuthErrorResponse {
  readonly error: string;
  readonly errorDescription?: string;
  readonly errorUri?: string;
}

// ============================================================
// OAuth Provider 接口（宿主注入）
// ============================================================

/** OAuthProvider — MCP OAuth 认证流程宿主注入接口 */
export interface OAuthProvider {
  /** 发现 OAuth Server Metadata */
  discover(serverUrl: string): Promise<OAuthServerMetadata | null>;
  /** 动态注册 OAuth Client */
  registerClient(
    metadata: OAuthServerMetadata,
    redirectUris: readonly string[]
  ): Promise<OAuthClientRegistration>;
  /** 启动 PKCE 授权流程 */
  startPkceFlow(
    metadata: OAuthServerMetadata,
    registration: OAuthClientRegistration,
    scope?: string
  ): Promise<{ authorizationUrl: string; codeVerifier: string; state: string }>;
  /** 完成 PKCE 授权流程（用 authorization code 换取 token） */
  completePkceFlow(
    metadata: OAuthServerMetadata,
    registration: OAuthClientRegistration,
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse>;
  /** 刷新 OAuth token */
  refreshToken(
    metadata: OAuthServerMetadata,
    registration: OAuthClientRegistration,
    refreshToken: string
  ): Promise<OAuthTokenResponse>;
}

// ============================================================
// Cross-App Access (XAA) 类型
// ============================================================

/** Cross-App Access 配置 — 跨应用访问授权 */
export interface CrossAppAccessConfig {
  /** 授权的应用标识 */
  readonly authorizedApp: string;
  /** 授权范围 */
  readonly scope?: readonly string[];
  /** Token 交换 URL */
  readonly tokenExchangeUrl?: string;
  /** 是否允许自动 token 交换 */
  readonly autoExchange?: boolean;
}

/** XAA Token 交换请求 */
export interface XaaTokenExchangeRequest {
  readonly subjectToken: string;
  readonly subjectTokenType: string;
  readonly targetApp: string;
  readonly scope?: readonly string[];
}

/** XAA Token 交换响应 */
export interface XaaTokenExchangeResponse {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn?: number;
  readonly scope?: string;
}

// ============================================================
// MCP OAuth 认证状态
// ============================================================

/** MCP Server OAuth 认证状态 */
export interface McpOAuthState {
  /** server 名称 */
  readonly serverName: string;
  /** 认证阶段 */
  readonly phase:
    | 'discovery'
    | 'registration'
    | 'authorization'
    | 'token_exchange'
    | 'authenticated'
    | 'failed';
  /** OAuth Server Metadata（discovery 完成后） */
  readonly metadata?: OAuthServerMetadata;
  /** Client Registration（registration 完成后） */
  readonly registration?: OAuthClientRegistration;
  /** 当前 token */
  readonly token?: OAuthTokenResponse;
  /** 错误信息 */
  readonly error?: string;
}
