/**
 * MCP XAA (Cross-App Access) — RFC 8693 + RFC 7523 Token Exchange
 *
 * 对齐 CC services/mcp/xaa.ts。在企业环境下绕过浏览器同意页直接获取 MCP access_token：
 *
 * 1. RFC 8693 Token Exchange at IdP: id_token → ID-JAG
 * 2. RFC 7523 JWT Bearer Grant at AS: ID-JAG → access_token
 *
 * 与 OAuth 标准 authorization_code 流程不同，XAA 不需要用户交互（"silent" auth）。
 */

import { z } from 'zod';

// ============================================================
// 协议常量
// ============================================================

export const TOKEN_EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
export const JWT_BEARER_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
export const ID_JAG_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:id-jag';
export const ID_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:id_token';

const XAA_REQUEST_TIMEOUT_MS = 30_000;

// ============================================================
// Schema
// ============================================================

export const TokenExchangeResponseSchema = z.object({
  access_token: z.string(),
  issued_token_type: z.string().optional(),
  token_type: z.string(),
  expires_in: z.number().optional(),
  scope: z.string().optional()
});

export type TokenExchangeResponse = z.infer<typeof TokenExchangeResponseSchema>;

export const JwtBearerResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
  scope: z.string().optional()
});

export type JwtBearerResponse = z.infer<typeof JwtBearerResponseSchema>;

// ============================================================
// 错误
// ============================================================

/**
 * IdP token-exchange 失败时抛出
 *
 * shouldClearIdToken 决定调用方是否要丢弃缓存的 id_token：
 *
 * - 4xx / invalid_grant / invalid_token → id_token 已失效，应清理
 * - 5xx → IdP 暂时不可用，id_token 可能仍有效，保留
 * - 200 但响应体不合法 → 协议违规，清理
 */
export class XaaTokenExchangeError extends Error {
  readonly shouldClearIdToken: boolean;
  constructor(message: string, shouldClearIdToken: boolean) {
    super(message);
    this.name = 'XaaTokenExchangeError';
    this.shouldClearIdToken = shouldClearIdToken;
  }
}

/** AS（Authorization Server） JWT Bearer 授权失败 */
export class XaaJwtBearerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XaaJwtBearerError';
  }
}

// ============================================================
// 敏感信息脱敏（用于 debug 日志）
// ============================================================

const SENSITIVE_TOKEN_RE =
  /"(access_token|refresh_token|id_token|assertion|subject_token|client_secret)"\s*:\s*"[^"]*"/g;

/** 在调试日志中遮蔽敏感字段 */
export function redactTokens(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return s.replace(SENSITIVE_TOKEN_RE, (_, k) => `"${k}":"[REDACTED]"`);
}

// ============================================================
// URL 规范化（RFC 8414 §3.3 / RFC 9728 §3.3）
// ============================================================

export function normalizeUrl(url: string): string {
  try {
    return new URL(url).href.replace(/\/$/, '');
  } catch {
    return url.replace(/\/$/, '');
  }
}

// ============================================================
// HTTP 抽象（避免依赖具体的 fetch 实现）
// ============================================================

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

/** 创建带 30s 超时和可选取消信号的 fetch 包装 */
export function makeXaaFetch(baseFetch: FetchLike, abortSignal?: AbortSignal): FetchLike {
  return (url, init) => {
    const timeout = AbortSignal.timeout(XAA_REQUEST_TIMEOUT_MS);
    const signal = abortSignal ? AbortSignal.any([timeout, abortSignal]) : timeout;
    return baseFetch(url, { ...init, signal });
  };
}

// ============================================================
// Layer 2 操作：IdP Token Exchange
// ============================================================

export interface IdpTokenExchangeRequest {
  readonly tokenEndpoint: string;
  readonly idToken: string;
  readonly clientId: string;
  readonly audience: string;
  readonly resource?: string;
  readonly scope?: string;
}

/** Layer 2: 用 id_token 在 IdP 换取 ID-JAG（identity assertion authorization grant） */
export async function requestIdJagFromIdp(
  request: IdpTokenExchangeRequest,
  fetchFn: FetchLike
): Promise<TokenExchangeResponse> {
  const params = new URLSearchParams({
    grant_type: TOKEN_EXCHANGE_GRANT,
    subject_token: request.idToken,
    subject_token_type: ID_TOKEN_TYPE,
    requested_token_type: ID_JAG_TOKEN_TYPE,
    client_id: request.clientId,
    audience: request.audience
  });
  if (request.resource) params.set('resource', request.resource);
  if (request.scope) params.set('scope', request.scope);

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
    const shouldClear = res.status >= 400 && res.status < 500;
    throw new XaaTokenExchangeError(
      `IdP token exchange failed: ${res.status} ${body.slice(0, 256)}`,
      shouldClear
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    throw new XaaTokenExchangeError(`IdP returned non-JSON: ${(err as Error).message}`, true);
  }

  const parsed = TokenExchangeResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new XaaTokenExchangeError(
      `IdP token-exchange response invalid: ${parsed.error.message}`,
      true
    );
  }
  return parsed.data;
}

// ============================================================
// Layer 2 操作：AS JWT Bearer Grant
// ============================================================

export interface AsJwtBearerRequest {
  readonly tokenEndpoint: string;
  readonly idJagAssertion: string;
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly resource?: string;
  readonly scope?: string;
}

/** Layer 2: 用 ID-JAG 在 AS 换取 access_token */
export async function requestAccessTokenWithJwtBearer(
  request: AsJwtBearerRequest,
  fetchFn: FetchLike
): Promise<JwtBearerResponse> {
  const params = new URLSearchParams({
    grant_type: JWT_BEARER_GRANT,
    assertion: request.idJagAssertion,
    client_id: request.clientId
  });
  if (request.clientSecret) params.set('client_secret', request.clientSecret);
  if (request.resource) params.set('resource', request.resource);
  if (request.scope) params.set('scope', request.scope);

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
    throw new XaaJwtBearerError(`AS JWT Bearer grant failed: ${res.status} ${body.slice(0, 256)}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    throw new XaaJwtBearerError(`AS returned non-JSON: ${(err as Error).message}`);
  }

  const parsed = JwtBearerResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new XaaJwtBearerError(`AS response invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

// ============================================================
// Layer 3 编排：完整 XAA 流程
// ============================================================

export interface XaaTokenAcquisitionRequest {
  readonly idToken: string;
  readonly clientId: string;
  readonly idpTokenEndpoint: string;
  readonly asTokenEndpoint: string;
  readonly resource: string;
  readonly scope?: string;
  readonly clientSecret?: string;
}

export interface XaaTokenResult {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn?: number;
  readonly scope?: string;
}

/** 完整 XAA 流程：id_token -> ID-JAG -> access_token */
export async function acquireXaaAccessToken(
  request: XaaTokenAcquisitionRequest,
  fetchFn: FetchLike
): Promise<XaaTokenResult> {
  const idJag = await requestIdJagFromIdp(
    {
      tokenEndpoint: request.idpTokenEndpoint,
      idToken: request.idToken,
      clientId: request.clientId,
      audience: request.asTokenEndpoint,
      resource: request.resource,
      scope: request.scope
    },
    fetchFn
  );

  const access = await requestAccessTokenWithJwtBearer(
    {
      tokenEndpoint: request.asTokenEndpoint,
      idJagAssertion: idJag.access_token,
      clientId: request.clientId,
      clientSecret: request.clientSecret,
      resource: request.resource,
      scope: request.scope
    },
    fetchFn
  );

  return {
    accessToken: access.access_token,
    tokenType: access.token_type,
    expiresIn: access.expires_in,
    scope: access.scope
  };
}
