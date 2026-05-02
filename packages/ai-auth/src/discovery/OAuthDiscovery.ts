/**
 * OAuthDiscovery — RFC 9728/8414 OAuth Metadata Discovery
 *
 * 对齐Claude Code services/mcp/auth.ts的discovery逻辑。 提供两层discovery：
 *
 * 1. RFC 9728 — Protected Resource → Authorization Server metadata
 * 2. RFC 8414 — Authorization Server metadata discovery
 *
 * 所有HTTP请求通过宿主注入的fetchFn完成。
 */

import type { FetchLike, OAuthDiscoveryState } from '../types/mcp-auth-types';
import { DiscoveryFailedError } from '../errors/auth-errors';

// ─── 默认fetch ───

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

// ─── Authorization Server Metadata ───

/** RFC 8414 Authorization Server Metadata */
export interface AuthorizationServerMetadata {
  readonly issuer: string;
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly registration_endpoint?: string;
  readonly revocation_endpoint?: string;
  readonly scopes_supported?: string[];
  readonly response_types_supported?: string[];
  readonly grant_types_supported?: string[];
  readonly token_endpoint_auth_methods_supported?: string[];
  readonly code_challenge_methods_supported?: string[];
}

// ─── Protected Resource Metadata (RFC 9728) ───

/** RFC 9728 Protected Resource Metadata */
export interface ProtectedResourceMetadata {
  readonly resource: string;
  readonly authorization_servers?: string[];
}

// ─── fetchAuthServerMetadata ───

/**
 * fetchAuthServerMetadata — 获取Authorization Server metadata
 *
 * 流程（对齐Claude Code services/mcp/auth.ts的discovery逻辑）：
 *
 * 1. 有configuredMetadataUrl → 直接fetch
 * 2. 有cached discoveryState → 使用缓存URL
 * 3. 无缓存 → RFC 9728 resource metadata discovery → RFC 8414 authorization server
 *
 * @param serverUrl MCP服务器URL（作为protected resource）
 * @param configuredMetadataUrl 预配置的metadata URL（优先级最高）
 * @param cachedState 之前缓存的discovery state
 * @param fetchFn 宿主注入的fetch函数
 */
export async function fetchAuthServerMetadata(
  serverUrl: string,
  configuredMetadataUrl?: string,
  cachedState?: OAuthDiscoveryState,
  fetchFn?: FetchLike
): Promise<{ metadata: AuthorizationServerMetadata; discoveryState: OAuthDiscoveryState }> {
  const _fetch = fetchFn ?? defaultFetch;

  // Step 1: 预配置URL（最高优先级）
  if (configuredMetadataUrl) {
    const metadata = await fetchMetadata(configuredMetadataUrl, _fetch);
    return {
      metadata,
      discoveryState: {
        authorizationServerUrl: configuredMetadataUrl
      }
    };
  }

  // Step 2: 缓存的discovery state
  if (cachedState?.authorizationServerUrl) {
    try {
      const metadata = await fetchMetadata(cachedState.authorizationServerUrl, _fetch);
      return { metadata, discoveryState: cachedState };
    } catch {
      // 缓存失效 → 继续discovery
    }
  }

  // Step 3: RFC 9728 resource metadata discovery
  const resourceMetadataUrl =
    cachedState?.resourceMetadataUrl ?? buildResourceMetadataUrl(serverUrl);
  try {
    const resourceMetadata = await fetchResourceMetadata(resourceMetadataUrl, _fetch);

    // 从resource metadata中提取authorization server URL
    const authServerIssuer = resourceMetadata.authorization_servers?.[0];
    if (!authServerIssuer) {
      throw new DiscoveryFailedError(
        resourceMetadataUrl,
        'No authorization_servers in resource metadata'
      );
    }

    // RFC 8414: 从issuer URL推导well-known metadata URL
    const authServerMetadataUrl = buildAuthServerMetadataUrl(authServerIssuer);
    const metadata = await fetchMetadata(authServerMetadataUrl, _fetch);
    return {
      metadata,
      discoveryState: {
        authorizationServerUrl: authServerMetadataUrl,
        resourceMetadataUrl
      }
    };
  } catch (error) {
    if (error instanceof DiscoveryFailedError) throw error;
    throw new DiscoveryFailedError(resourceMetadataUrl, (error as Error).message);
  }
}

// ─── 辅助函数 ───

/** 构建RFC 9728 resource metadata URL */
function buildResourceMetadataUrl(serverUrl: string): string {
  const url = new URL(serverUrl);
  return `${url.origin}/.well-known/oauth-protected-resource`;
}

/** 构建RFC 8414 authorization server metadata URL */
function buildAuthServerMetadataUrl(issuerUrl: string): string {
  const url = new URL(issuerUrl);
  return `${url.origin}/.well-known/oauth-authorization-server`;
}

/** fetch Authorization Server metadata */
async function fetchMetadata(
  metadataUrl: string,
  fetchFn: FetchLike
): Promise<AuthorizationServerMetadata> {
  const response = await fetchFn(metadataUrl, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new DiscoveryFailedError(metadataUrl, `HTTP ${response.status}`);
  }

  return response.json() as Promise<AuthorizationServerMetadata>;
}

/** fetch Protected Resource metadata (RFC 9728) */
async function fetchResourceMetadata(
  resourceUrl: string,
  fetchFn: FetchLike
): Promise<ProtectedResourceMetadata> {
  const response = await fetchFn(resourceUrl, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new DiscoveryFailedError(resourceUrl, `Resource metadata HTTP ${response.status}`);
  }

  return response.json() as Promise<ProtectedResourceMetadata>;
}

/** 从Authorization Server metadata推导token endpoint */
export function getTokenEndpointFromMetadata(metadata: AuthorizationServerMetadata): string {
  return metadata.token_endpoint;
}

/** 从Authorization Server metadata推导authorize endpoint */
export function getAuthorizeEndpointFromMetadata(metadata: AuthorizationServerMetadata): string {
  return metadata.authorization_endpoint;
}

/** 从Authorization Server metadata推导revocation endpoint */
export function getRevocationEndpointFromMetadata(
  metadata: AuthorizationServerMetadata
): string | undefined {
  return metadata.revocation_endpoint;
}

/** 从Authorization Server metadata推导registration endpoint (DCR) */
export function getRegistrationEndpointFromMetadata(
  metadata: AuthorizationServerMetadata
): string | undefined {
  return metadata.registration_endpoint;
}
