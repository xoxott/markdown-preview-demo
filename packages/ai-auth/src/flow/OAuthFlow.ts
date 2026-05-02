/**
 * OAuthFlow — OAuth流程编排
 *
 * 对齐Claude Code services/oauth/flow.ts + services/mcp/auth.ts的流程逻辑。 提供三个核心OAuth流程：
 *
 * 1. performOAuthFlow — PKCE授权码流程（authorize→callback→exchange）
 * 2. performTokenRefresh — refresh_token刷新（含重试+退避）
 * 3. revokeTokens — RFC 7009 token撤销（含fallback）
 *
 * 所有HTTP请求通过宿主注入的fetchFn完成，核心逻辑无直接网络依赖。
 */

import type {
  AuthProviderConfig,
  FetchLike,
  OAuthClientProvider,
  OAuthFlowOptions,
  TokenRevocationOptions
} from '../types/mcp-auth-types';
import type { OAuthTokenExchangeResponse, OAuthTokens } from '../types/auth-types';
import type { CryptoProvider } from '../provider/AuthProviderInterface';
import { AuthCodeListener } from '../listener/AuthCodeListener';
import { buildRedirectUri } from '../listener/CallbackPortManager';
import { generateCodeChallenge, generateCodeVerifier, generateState } from '../crypto/pkce';
import {
  AuthenticationCancelledError,
  InvalidGrantError,
  OAuthError,
  ServerError,
  isRetryableError
} from '../errors/auth-errors';

// ─── 默认fetch ───

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

// ─── Token Exchange ───

/** token交换请求体 — RFC 6749 §4.1.3 */
function buildTokenExchangeBody(
  code: string,
  redirectUri: string,
  clientId?: string,
  codeVerifier?: string
): Record<string, string> {
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  };
  if (clientId) body.client_id = clientId;
  if (codeVerifier) body.code_verifier = codeVerifier;
  return body;
}

/** 解析token交换响应 → OAuthTokens */
function parseTokenResponse(response: OAuthTokenExchangeResponse): OAuthTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? '',
    expiresAt: Date.now() + response.expires_in * 1000,
    scopes: response.scope?.split(' ').filter(Boolean) ?? [],
    subscriptionType: null,
    rateLimitTier: null,
    tokenAccount: response.account
      ? {
          uuid: response.account.uuid,
          emailAddress: response.account.email_address,
          organizationUuid: response.organization?.uuid
        }
      : undefined
  };
}

/** 从serverUrl推导token endpoint */
function deriveTokenEndpoint(serverUrl: string): string {
  const url = new URL(serverUrl);
  if (url.pathname === '/' || url.pathname === '') {
    return `${url.origin}/token`;
  }
  return url.origin + url.pathname.replace(/\/authorize$/, '/token');
}

/** 从serverUrl推导revocation endpoint */
function deriveRevocationEndpoint(serverUrl: string): string {
  const url = new URL(serverUrl);
  if (url.pathname === '/' || url.pathname === '') {
    return `${url.origin}/revoke`;
  }
  return url.origin + url.pathname.replace(/\/authorize$/, '/revoke');
}

// ─── performOAuthFlow ───

/**
 * performOAuthFlow — PKCE授权码完整流程
 *
 * 流程：启动回调服务器 → PKCE → 授权URL → 回调 → token交换 → 保存
 */
export async function performOAuthFlow(
  provider: OAuthClientProvider,
  config: AuthProviderConfig,
  crypto: CryptoProvider,
  options?: OAuthFlowOptions,
  fetchFn?: FetchLike
): Promise<OAuthTokens> {
  const _fetch = fetchFn ?? defaultFetch;
  const abortSignal = options?.abortSignal;

  // Step 1: 生成PKCE参数
  const codeVerifier = generateCodeVerifier(crypto);
  await provider.saveCodeVerifier(codeVerifier);

  const state = generateState(crypto);
  const codeChallenge = generateCodeChallenge(crypto, codeVerifier);

  // Step 2: 启动回调服务器
  const callbackPath = new URL(config.redirectUri).pathname;
  const listener = new AuthCodeListener(callbackPath);
  const port = await listener.start();

  // Step 3: 构建授权URL
  const clientInfo = await provider.clientInformation();
  const clientId = clientInfo?.client_id ?? config.clientId;
  const redirectUri = buildRedirectUri(port, callbackPath);

  const authorizeUrl = new URL(config.serverUrl);
  authorizeUrl.pathname = authorizeUrl.pathname === '/' ? '/authorize' : authorizeUrl.pathname;

  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId ?? '');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);

  // Step 4: 通知浏览器/UI
  await provider.redirectToAuthorization(authorizeUrl);

  // Step 5: 等待授权码回调
  try {
    const authorizationCode = await listener.waitForAuthorization(state, async () => {
      // onReady — browser已由redirectToAuthorization打开
    });

    // Step 6: 用code交换token
    const verifier = await provider.codeVerifier();
    const tokenUrl = deriveTokenEndpoint(config.serverUrl);
    const body = buildTokenExchangeBody(authorizationCode, redirectUri, clientId, verifier);

    const response = await _fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString()
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'unknown' }));
      throw new OAuthError(errorBody.error ?? 'token_exchange_failed', errorBody.error_description);
    }

    const tokenResponse = (await response.json()) as OAuthTokenExchangeResponse;
    const tokens = parseTokenResponse(tokenResponse);
    await provider.saveTokens(tokens);

    listener.handleSuccessRedirect('http://localhost:3118/success');
    listener.close();

    return tokens;
  } catch (error) {
    listener.close();

    if (abortSignal?.aborted) {
      throw new AuthenticationCancelledError('OAuth flow aborted by user');
    }

    throw error;
  }
}

// ─── performTokenRefresh ───

/**
 * performTokenRefresh — refresh_token刷新
 *
 * 流程：POST token_endpoint → 指数退避重试 → invalid_grant不重试
 */
export async function performTokenRefresh(
  provider: OAuthClientProvider,
  refreshToken: string,
  config: AuthProviderConfig,
  maxAttempts: number = 3,
  fetchFn?: FetchLike
): Promise<OAuthTokens | undefined> {
  const _fetch = fetchFn ?? defaultFetch;
  const tokenUrl = deriveTokenEndpoint(config.serverUrl);
  const clientInfo = await provider.clientInformation();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const body: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      };
      if (clientInfo?.client_id) body.client_id = clientInfo.client_id;

      const response = await _fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString()
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'unknown' }));

        if (errorBody.error === 'invalid_grant') {
          throw new InvalidGrantError(
            errorBody.error_description ?? 'Refresh token has expired or been revoked'
          );
        }

        if (response.status >= 500) {
          throw new ServerError(errorBody.error_description);
        }

        throw new OAuthError(errorBody.error, errorBody.error_description);
      }

      const tokenResponse = (await response.json()) as OAuthTokenExchangeResponse;
      const tokens = parseTokenResponse(tokenResponse);
      await provider.saveTokens(tokens);
      return tokens;
    } catch (error) {
      if (!isRetryableError(error as Error) || attempt >= maxAttempts) {
        throw error;
      }

      // 指数退避：1s, 2s, 4s...
      const delayMs = 2 ** (attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return undefined;
}

// ─── revokeTokens ───

/**
 * revokeTokens — RFC 7009 token撤销
 *
 * 流程：POST revocation_endpoint → graceful处理不支持 → 清除本地凭据
 */
export async function revokeTokens(
  provider: OAuthClientProvider,
  config: AuthProviderConfig,
  options?: TokenRevocationOptions,
  fetchFn?: FetchLike
): Promise<void> {
  const _fetch = fetchFn ?? defaultFetch;
  const tokens = await provider.tokens();
  if (!tokens) return;

  const revokeUrl = deriveRevocationEndpoint(config.serverUrl);

  // 尝试撤销access_token
  await attemptRevoke(tokens.accessToken, 'access_token', revokeUrl, _fetch);

  // 尝试撤销refresh_token
  if (tokens.refreshToken) {
    await attemptRevoke(tokens.refreshToken, 'refresh_token', revokeUrl, _fetch);
  }

  // 清除本地凭据
  const scope = options?.preserveStepUpState ? 'tokens' : 'all';
  await provider.invalidateCredentials(scope);
}

/** 尝试撤销单个token — graceful处理不支持的服务器 */
async function attemptRevoke(
  token: string,
  tokenTypeHint: string,
  revokeUrl: string,
  fetchFn: FetchLike
): Promise<void> {
  try {
    const body = new URLSearchParams({
      token,
      token_type_hint: tokenTypeHint
    }).toString();

    const response = await fetchFn(revokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    // RFC 7009: 200=成功, 503=不支持 → 其他也graceful忽略
    void response; // 响应状态不影响流程
  } catch {
    // 网络错误 → graceful忽略（revocation是尽力而为）
  }
}
