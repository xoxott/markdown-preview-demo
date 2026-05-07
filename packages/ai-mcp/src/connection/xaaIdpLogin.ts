/**
 * MCP XAA IdP Login — IdP 端 OAuth 登录获取 id_token
 *
 * 对齐 CC services/mcp/xaaIdpLogin.ts。在 XAA 流程开始之前，先通过标准 OAuth authorization_code flow 在 IdP（如
 * Okta/Auth0）登录获取 id_token。后续 xaa.ts 用此 id_token 换取 ID-JAG，再换 MCP access_token。
 */

import { Buffer } from 'node:buffer';
import { z } from 'zod';
import type { FetchLike } from './xaa';

// ============================================================
// Schema
// ============================================================

export const IdpDiscoveryDocumentSchema = z.object({
  issuer: z.string(),
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  userinfo_endpoint: z.string().optional(),
  jwks_uri: z.string().optional(),
  scopes_supported: z.array(z.string()).optional(),
  response_types_supported: z.array(z.string()).optional()
});

export type IdpDiscoveryDocument = z.infer<typeof IdpDiscoveryDocumentSchema>;

export const IdpTokenResponseSchema = z.object({
  id_token: z.string(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  token_type: z.string(),
  expires_in: z.number().optional(),
  scope: z.string().optional()
});

export type IdpTokenResponse = z.infer<typeof IdpTokenResponseSchema>;

// ============================================================
// PKCE 生成器
// ============================================================

/** PKCE pair — verifier + challenge */
export interface PKCEPair {
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod: 'S256';
}

const PKCE_VERIFIER_LENGTH = 64;

/** 生成 PKCE code_verifier（43-128 字符 base64url） */
export function generatePkceVerifier(randomBytes: (n: number) => Uint8Array): string {
  const bytes = randomBytes(PKCE_VERIFIER_LENGTH);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i += 1) {
    str += String.fromCharCode(bytes[i] ?? 0);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]+$/, '');
  }
  return Buffer.from(str, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/, '');
}

/** 生成 PKCE pair（需要 SHA-256 实现，由调用方注入） */
export async function generatePkcePair(
  randomBytes: (n: number) => Uint8Array,
  sha256: (input: string) => Promise<Uint8Array>
): Promise<PKCEPair> {
  const verifier = generatePkceVerifier(randomBytes);
  const hash = await sha256(verifier);
  const challenge = base64UrlEncode(hash);
  return {
    codeVerifier: verifier,
    codeChallenge: challenge,
    codeChallengeMethod: 'S256'
  };
}

// ============================================================
// Discovery
// ============================================================

/** OIDC discovery — 拉取 .well-known/openid-configuration */
export async function discoverIdpEndpoints(
  issuer: string,
  fetchFn: FetchLike
): Promise<IdpDiscoveryDocument> {
  const url = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const res = await fetchFn(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status}`);
  }
  const json = await res.json();
  const parsed = IdpDiscoveryDocumentSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid OIDC discovery: ${parsed.error.message}`);
  }
  return parsed.data;
}

// ============================================================
// Authorization URL 构造
// ============================================================

export interface BuildIdpAuthUrlOptions {
  readonly authorizationEndpoint: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scope: string;
  readonly state: string;
  readonly codeChallenge: string;
  readonly nonce?: string;
  /** 额外 query params，如 audience（Auth0）/resource */
  readonly extraParams?: Readonly<Record<string, string>>;
}

/** 构造 IdP authorization URL（用户在浏览器中打开） */
export function buildIdpAuthorizationUrl(options: BuildIdpAuthUrlOptions): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    scope: options.scope,
    state: options.state,
    code_challenge: options.codeChallenge,
    code_challenge_method: 'S256'
  });
  if (options.nonce) params.set('nonce', options.nonce);
  for (const [k, v] of Object.entries(options.extraParams ?? {})) {
    params.set(k, v);
  }
  return `${options.authorizationEndpoint}?${params.toString()}`;
}

// ============================================================
// Token exchange (authorization_code)
// ============================================================

export interface ExchangeIdpCodeRequest {
  readonly tokenEndpoint: string;
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly code: string;
  readonly redirectUri: string;
  readonly codeVerifier: string;
}

/** 用 authorization_code 在 IdP token endpoint 换取 id_token */
export async function exchangeIdpAuthorizationCode(
  request: ExchangeIdpCodeRequest,
  fetchFn: FetchLike
): Promise<IdpTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: request.code,
    client_id: request.clientId,
    redirect_uri: request.redirectUri,
    code_verifier: request.codeVerifier
  });
  if (request.clientSecret) params.set('client_secret', request.clientSecret);

  const res = await fetchFn(request.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params.toString()
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IdP token endpoint failed: ${res.status} ${body.slice(0, 256)}`);
  }

  const json = await res.json();
  const parsed = IdpTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid token response: ${parsed.error.message}`);
  }
  return parsed.data;
}

// ============================================================
// State 校验
// ============================================================

/**
 * 校验 callback 的 state 与请求时的 state 一致（CSRF 防护）
 *
 * @returns 是否匹配
 */
export function validateOAuthState(
  receivedState: string | null | undefined,
  expectedState: string
): boolean {
  return typeof receivedState === 'string' && receivedState === expectedState;
}
