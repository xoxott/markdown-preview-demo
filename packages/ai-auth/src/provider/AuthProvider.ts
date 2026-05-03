/**
 * AuthProvider — OAuth认证核心Provider实现
 *
 * 对齐Claude Code services/mcp/auth.ts ClaudeAuthProvider，但通过宿主注入 替换所有I/O操作（token存储、浏览器、加密、网络）。
 *
 * 核心职责：
 *
 * 1. OAuthClientProvider接口实现 — MCP SDK的认证入口
 * 2. Token管理 — 过期检测 + 5分钟提前刷新 + step-up检测
 * 3. Discovery状态 — 缓存+持久化最小URL
 * 4. 客户端信息管理 — DCR注册后的clientId/clientSecret
 * 5. PKCE code verifier管理
 */

import type {
  AuthProviderConfig,
  OAuthClientInformation,
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthDiscoveryState
} from '../types/mcp-auth-types';
import type { OAuthTokens } from '../types/auth-types';
import { getTokenRemainingSeconds, parseScopes } from '../types/auth-types';
import { generateState, getServerKey } from '../crypto/pkce';
import { NoCodeVerifierError } from '../errors/auth-errors';
import type {
  BrowserLauncher,
  CryptoProvider,
  McpAuthBridgeProvider,
  TokenStorageProvider
} from './AuthProviderInterface';

/** AuthProvider — 宿主注入的OAuth认证Provider */
export class AuthProvider implements OAuthClientProvider {
  private readonly config: AuthProviderConfig;
  private readonly storage: TokenStorageProvider;
  private readonly browser: BrowserLauncher;
  private readonly crypto: CryptoProvider;
  /** @internal MCP认证桥接 — Phase 3使用 */
  public readonly _bridge?: McpAuthBridgeProvider;

  private _codeVerifier?: string;
  private _authorizationUrl?: string;
  private _state?: string;
  private _scopes?: string;
  private _pendingStepUpScope?: string;
  private _refreshInProgress?: Promise<OAuthTokens | undefined>;
  private onAuthorizationUrlCallback?: (url: string) => void;

  constructor(
    config: AuthProviderConfig,
    storage: TokenStorageProvider,
    browser: BrowserLauncher,
    crypto: CryptoProvider,
    bridge?: McpAuthBridgeProvider,
    onAuthorizationUrl?: (url: string) => void
  ) {
    this.config = config;
    this.storage = storage;
    this.browser = browser;
    this.crypto = crypto;
    this._bridge = bridge;
    this.onAuthorizationUrlCallback = onAuthorizationUrl;
  }

  // ─── OAuthClientProvider接口实现 ───

  get redirectUrl(): string {
    return this.config.redirectUri;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: `Suga Auth (${this.config.serverName})`,
      redirect_uris: [this.config.redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    };
  }

  readonly clientMetadataUrl: string | undefined = undefined;

  /** 获取已注册的客户端信息 */
  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    const serverKey = this.getServerKey();
    const data = this.storage.read();
    const storedInfo = data?.[serverKey];

    if (storedInfo?.clientId) {
      return {
        client_id: storedInfo.clientId,
        client_secret: storedInfo.clientSecret
      };
    }

    // Fallback: 预配置的clientId
    const configClientId = this.config.clientId;
    if (configClientId) {
      return { client_id: configClientId };
    }

    return undefined;
  }

  /** 保存客户端注册信息 */
  async saveClientInformation(info: OAuthClientInformationFull): Promise<void> {
    const serverKey = this.getServerKey();
    const data = this.storage.read() ?? {};
    const existing = data[serverKey] ?? {
      serverName: this.config.serverName,
      serverUrl: this.config.serverUrl,
      accessToken: '',
      expiresAt: 0
    };

    data[serverKey] = {
      ...existing,
      clientId: info.client_id,
      clientSecret: info.client_secret
    };

    this.storage.update(data);
  }

  /** 获取当前token — 可能触发自动刷新 */
  async tokens(): Promise<OAuthTokens | undefined> {
    const serverKey = this.getServerKey();
    const data = await this.storage.readAsync();
    const tokenData = data?.[serverKey];

    if (!tokenData) return undefined;

    const expiresIn = getTokenRemainingSeconds(tokenData.expiresAt);

    // Step-up检测：如果需要提升scope且当前token不含该scope
    const currentScopes = tokenData.scope?.split(' ') ?? [];
    const needsStepUp =
      this._pendingStepUpScope !== undefined &&
      this._pendingStepUpScope.split(' ').some(s => !currentScopes.includes(s));

    // 过期且无refresh_token → undefined
    if (expiresIn <= 0 && !tokenData.refreshToken) return undefined;

    // 5分钟内过期 + 有refresh_token → 主动刷新
    if (expiresIn <= 300 && tokenData.refreshToken && !needsStepUp) {
      if (!this._refreshInProgress) {
        this._refreshInProgress = this.refreshAuthorization(tokenData.refreshToken).finally(() => {
          this._refreshInProgress = undefined;
        });
      }
      try {
        const refreshed = await this._refreshInProgress;
        if (refreshed) return refreshed;
      } catch {
        // 刷新失败 → 返回当前token（可能过期）
      }
    }

    // 返回当前token
    return {
      accessToken: tokenData.accessToken,
      refreshToken: needsStepUp ? '' : (tokenData.refreshToken ?? ''),
      expiresAt: tokenData.expiresAt,
      scopes: parseScopes(tokenData.scope),
      subscriptionType: null,
      rateLimitTier: null
    };
  }

  /** 保存新token */
  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this._pendingStepUpScope = undefined;
    const serverKey = this.getServerKey();
    const data = this.storage.read() ?? {};
    const existing = data[serverKey] ?? {
      serverName: this.config.serverName,
      serverUrl: this.config.serverUrl,
      accessToken: '',
      expiresAt: 0
    };

    data[serverKey] = {
      ...existing,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scopes.join(' ')
    };

    this.storage.update(data);
  }

  /** 重定向到授权URL — 通知UI + 可选打开浏览器 */
  async redirectToAuthorization(url: URL): Promise<void> {
    this._authorizationUrl = url.toString();

    // 提取scope
    const scopes = url.searchParams.get('scope');
    if (scopes) this._scopes = scopes;

    // 通知UI
    if (this.onAuthorizationUrlCallback) {
      this.onAuthorizationUrlCallback(url.toString());
    }

    // 可选打开浏览器
    if (!this.config.skipBrowserOpen) {
      await this.browser.openBrowser(url.toString());
    }
  }

  /** 保存PKCE code verifier */
  async saveCodeVerifier(verifier: string): Promise<void> {
    this._codeVerifier = verifier;
  }

  /** 获取PKCE code verifier */
  async codeVerifier(): Promise<string> {
    if (!this._codeVerifier) throw new NoCodeVerifierError();
    return this._codeVerifier;
  }

  /** 失效指定范围的凭据 */
  async invalidateCredentials(
    scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'
  ): Promise<void> {
    // verifier只清除内存属性，不依赖storage
    if (scope === 'verifier') {
      this._codeVerifier = undefined;
      return;
    }

    const serverKey = this.getServerKey();
    const data = this.storage.read();
    if (!data) return;

    const entry = data[serverKey];
    if (!entry) return;

    switch (scope) {
      case 'all':
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete data[serverKey];
        break;
      case 'client':
        data[serverKey] = { ...entry, clientId: undefined, clientSecret: undefined };
        break;
      case 'tokens':
        data[serverKey] = { ...entry, accessToken: '', refreshToken: undefined, expiresAt: 0 };
        break;
      case 'discovery':
        data[serverKey] = { ...entry, discoveryState: undefined, stepUpScope: undefined };
        break;
      default:
        break;
    }

    this.storage.update(data);
  }

  /** 保存Discovery状态 — 仅持久化最小URL */
  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    const serverKey = this.getServerKey();
    const data = this.storage.read() ?? {};
    const existing = data[serverKey] ?? {
      serverName: this.config.serverName,
      serverUrl: this.config.serverUrl,
      accessToken: '',
      expiresAt: 0
    };

    data[serverKey] = {
      ...existing,
      discoveryState: {
        authorizationServerUrl: state.authorizationServerUrl,
        resourceMetadataUrl: state.resourceMetadataUrl
      }
    };

    this.storage.update(data);
  }

  /** 获取Discovery状态 */
  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    const serverKey = this.getServerKey();
    const data = this.storage.read();
    const cached = data?.[serverKey]?.discoveryState;

    if (cached?.authorizationServerUrl) {
      return {
        authorizationServerUrl: cached.authorizationServerUrl,
        resourceMetadataUrl: cached.resourceMetadataUrl
      };
    }

    return undefined;
  }

  /** 刷新authorization — 用refresh_token换新token */
  async refreshAuthorization(refreshToken: string): Promise<OAuthTokens | undefined> {
    try {
      const { performTokenRefresh } = await import('../flow/OAuthFlow');
      return performTokenRefresh(this, refreshToken, this.config, 3, this.config.fetchFn);
    } catch {
      // performTokenRefresh 失败 → 返回 undefined（宿主可重试）
      return undefined;
    }
  }

  // ─── 公开辅助方法 ───

  /** 标记step-up认证pending */
  markStepUpPending(scope: string): void {
    this._pendingStepUpScope = scope;
  }

  /** 生成OAuth state参数 */
  async state(): Promise<string> {
    if (!this._state) this._state = generateState(this.crypto);
    return this._state;
  }

  /** 获取server key — 防止凭据跨服务器复用 */
  getServerKey(): string {
    const configJson = JSON.stringify({
      type: 'sse',
      url: this.config.serverUrl
    });
    return getServerKey(this.crypto, this.config.serverName, configJson);
  }

  /** 获取授权URL */
  readonly getAuthorizationUrl = (): string | undefined => this._authorizationUrl;

  /** 获取scopes */
  readonly getScopes = (): string | undefined => this._scopes;
}
