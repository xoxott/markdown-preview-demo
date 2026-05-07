/**
 * McpOAuthFlow — MCP OAuth 2.0 + PKCE 授权码流程实现
 *
 * N13: 将 G41 的类型定义变为可用的流程类。 实际 HTTP/browser 操作由宿主注入。
 */

import type {
  OAuthClientRegistration,
  OAuthProvider,
  OAuthServerMetadata,
  OAuthTokenResponse
} from '../types/mcp-oauth-xaa';

/** McpOAuthFlow 状态 */
export type McpOAuthFlowPhase =
  | 'discovery'
  | 'registration'
  | 'authorization'
  | 'token_exchange'
  | 'authenticated'
  | 'refreshing'
  | 'failed';

/** McpOAuthFlow — 管理 OAuth 认证全流程 */
export class McpOAuthFlow {
  private phase: McpOAuthFlowPhase = 'discovery';
  private metadata?: OAuthServerMetadata;
  private registration?: OAuthClientRegistration;
  private token?: OAuthTokenResponse;
  private codeVerifier?: string;
  private error?: string;

  constructor(private readonly provider: OAuthProvider) {}

  /** 获取当前状态 */
  get state(): {
    phase: McpOAuthFlowPhase;
    metadata?: OAuthServerMetadata;
    registration?: OAuthClientRegistration;
    token?: OAuthTokenResponse;
    error?: string;
  } {
    return {
      phase: this.phase,
      metadata: this.metadata,
      registration: this.registration,
      token: this.token,
      error: this.error
    };
  }

  /** Step 1: 发现 OAuth Server Metadata */
  async discover(serverUrl: string): Promise<boolean> {
    try {
      this.phase = 'discovery';
      this.metadata = (await this.provider.discover(serverUrl)) ?? undefined;
      if (!this.metadata) {
        this.phase = 'failed';
        this.error = 'No OAuth metadata found';
        return false;
      }
      return true;
    } catch (e) {
      this.phase = 'failed';
      this.error = String(e);
      return false;
    }
  }

  /** Step 2: 动态注册 OAuth Client */
  async registerClient(redirectUris: readonly string[]): Promise<boolean> {
    if (!this.metadata) {
      this.phase = 'failed';
      this.error = 'No metadata available';
      return false;
    }
    try {
      this.phase = 'registration';
      this.registration = await this.provider.registerClient(this.metadata, redirectUris);
      return true;
    } catch (e) {
      this.phase = 'failed';
      this.error = String(e);
      return false;
    }
  }

  /** Step 3: 启动 PKCE 授权流程 — 返回 authorization URL */
  async startAuthorization(scope?: string): Promise<string | null> {
    if (!this.metadata || !this.registration) {
      this.phase = 'failed';
      this.error = 'No metadata or registration available';
      return null;
    }
    try {
      this.phase = 'authorization';
      const result = await this.provider.startPkceFlow(this.metadata, this.registration, scope);
      this.codeVerifier = result.codeVerifier;
      return result.authorizationUrl;
    } catch (e) {
      this.phase = 'failed';
      this.error = String(e);
      return null;
    }
  }

  /** Step 4: 完成 PKCE 授权 — 用 authorization code 换取 token */
  async completeAuthorization(code: string, redirectUri: string): Promise<boolean> {
    if (!this.metadata || !this.registration || !this.codeVerifier) {
      this.phase = 'failed';
      this.error = 'Missing prerequisites for token exchange';
      return false;
    }
    try {
      this.phase = 'token_exchange';
      this.token = await this.provider.completePkceFlow(
        this.metadata,
        this.registration,
        code,
        this.codeVerifier,
        redirectUri
      );
      this.phase = 'authenticated';
      return true;
    } catch (e) {
      this.phase = 'failed';
      this.error = String(e);
      return false;
    }
  }

  /** Step 5: 刷新过期 token */
  async refreshToken(): Promise<boolean> {
    if (!this.metadata || !this.registration || !this.token?.refreshToken) {
      return false;
    }
    try {
      this.phase = 'refreshing';
      this.token = await this.provider.refreshToken(
        this.metadata,
        this.registration,
        this.token.refreshToken
      );
      this.phase = 'authenticated';
      return true;
    } catch (e) {
      this.phase = 'failed';
      this.error = String(e);
      return false;
    }
  }

  /** 获取当前 access token */
  get accessToken(): string | undefined {
    return this.token?.accessToken;
  }
}
