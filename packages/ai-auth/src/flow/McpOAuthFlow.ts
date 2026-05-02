/**
 * McpOAuthFlow — MCP OAuth完整流程编排
 *
 * 对齐Claude Code services/mcp/auth.ts的performMCPOAuthFlow。 将discovery + authorize + callback + token
 * exchange串联为一个完整流程。
 *
 * 流程：
 *
 * 1. RFC 9728 discovery → 获取authorization server metadata
 * 2. DCR (Dynamic Client Registration) → 注册客户端（如需要）
 * 3. PKCE + authorize → 重定向浏览器
 * 4. callback → 接收authorization code
 * 5. token exchange → 获取access token
 * 6. 保存 + 标记认证完成
 *
 * 所有HTTP通过宿主注入fetchFn完成，所有I/O通过provider接口完成。
 */

import type {
  AuthProviderConfig,
  FetchLike,
  McpOAuthFlowOptions,
  OAuthClientProvider
} from '../types/mcp-auth-types';
import type { OAuthTokens } from '../types/auth-types';
import type { CryptoProvider, McpAuthBridgeProvider } from '../provider/AuthProviderInterface';
import {
  type AuthorizationServerMetadata,
  fetchAuthServerMetadata
} from '../discovery/OAuthDiscovery';
import { buildRedirectUri } from '../listener/CallbackPortManager';
import { OAuthError } from '../errors/auth-errors';
import { performOAuthFlow } from './OAuthFlow';

// ─── 默认fetch ───

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

// ─── performMcpOAuthFlow ───

/**
 * performMcpOAuthFlow — MCP OAuth完整流程
 *
 * 对齐Claude Code services/mcp/auth.ts的performMCPOAuthFlow。 这是MCP服务器的完整认证流程入口。
 *
 * 流程串联： discovery → DCR → PKCE → authorize → callback → token → markAuthComplete
 */
export async function performMcpOAuthFlow(
  serverName: string,
  serverUrl: string,
  provider: OAuthClientProvider,
  crypto: CryptoProvider,
  bridge?: McpAuthBridgeProvider,
  options?: McpOAuthFlowOptions,
  fetchFn?: FetchLike
): Promise<OAuthTokens> {
  const _fetch = fetchFn ?? defaultFetch;

  // Step 1: 标记需要认证
  if (bridge) bridge.markNeedsAuth(serverName);

  // Step 2: Discovery — 获取authorization server metadata
  const cachedState = await provider.discoveryState();
  const discoveryResult = await fetchAuthServerMetadata(
    serverUrl,
    options?.authServerMetadataUrl,
    cachedState,
    _fetch
  );

  // 保存discovery state
  await provider.saveDiscoveryState(discoveryResult.discoveryState);

  const metadata = discoveryResult.metadata;

  // Step 3: DCR — Dynamic Client Registration（如需要）
  const clientInfo = await provider.clientInformation();
  if (!clientInfo?.client_id && metadata.registration_endpoint) {
    await performDynamicClientRegistration(provider, metadata, serverUrl, _fetch);
  }

  // Step 4: PKCE授权码流程
  const config: AuthProviderConfig = {
    serverName,
    serverUrl: metadata.authorization_endpoint,
    redirectUri: options?.callbackPort
      ? buildRedirectUri(options.callbackPort, '/callback')
      : provider.redirectUrl,
    skipBrowserOpen: options?.skipBrowserOpen
  };

  const tokens = await performOAuthFlow(provider, config, crypto, options, _fetch);

  // Step 5: 标记认证完成
  if (bridge) await bridge.markAuthComplete(serverName);

  return tokens;
}

// ─── DCR ───

/**
 * performDynamicClientRegistration — RFC 7591 Dynamic Client Registration
 *
 * POST registration_endpoint with client metadata → 获取client_id/client_secret
 */
async function performDynamicClientRegistration(
  provider: OAuthClientProvider,
  metadata: AuthorizationServerMetadata,
  _serverUrl: string,
  fetchFn: FetchLike
): Promise<void> {
  if (!metadata.registration_endpoint) return;

  const clientMetadata = provider.clientMetadata;

  const response = await fetchFn(metadata.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientMetadata)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'unknown' }));
    throw new OAuthError(
      errorBody.error ?? 'dcr_failed',
      errorBody.error_description ?? `DCR registration failed: HTTP ${response.status}`
    );
  }

  const registrationResponse = (await response.json()) as {
    client_id: string;
    client_secret?: string;
    client_name?: string;
  };

  await provider.saveClientInformation(registrationResponse);
}
