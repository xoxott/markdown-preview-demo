/**
 * OAuth认证错误类型
 *
 * 对齐Claude Code services/mcp/auth.ts + services/oauth/types.ts的错误类型。
 */

// ─── AuthenticationCancelledError ───

/** 认证被取消 — 用户中断OAuth流程（如按Esc） */
export class AuthenticationCancelledError extends Error {
  constructor(message?: string) {
    super(message ?? 'Authentication was cancelled');
    this.name = 'AuthenticationCancelledError';
  }
}

// ─── InvalidGrantError ───

/** refresh_token无效 — 被撤销/过期，需要重新授权 */
export class InvalidGrantError extends Error {
  readonly errorCode: string;

  constructor(message: string, errorCode: string = 'invalid_grant') {
    super(message);
    this.name = 'InvalidGrantError';
    this.errorCode = errorCode;
  }
}

// ─── OAuthError ───

/** 通用OAuth错误 — RFC 6749 §5.2 error响应 */
export class OAuthError extends Error {
  readonly errorCode: string;
  readonly errorDescription?: string;
  readonly errorUri?: string;

  constructor(errorCode: string, errorDescription?: string, errorUri?: string) {
    const msg = errorDescription
      ? `OAuth error: ${errorCode} - ${errorDescription}`
      : `OAuth error: ${errorCode}`;
    super(msg);
    this.name = 'OAuthError';
    this.errorCode = errorCode;
    this.errorDescription = errorDescription;
    this.errorUri = errorUri;
  }
}

// ─── ServerError ───

/** OAuth服务器错误 — 5xx响应 */
export class ServerError extends OAuthError {
  constructor(errorDescription?: string) {
    super('server_error', errorDescription);
    this.name = 'ServerError';
  }
}

// ─── PortUnavailableError ───

/** OAuth回调端口不可用 */
export class PortUnavailableError extends Error {
  readonly port: number;

  constructor(port: number, message?: string) {
    super(message ?? `OAuth callback port ${port} is already in use`);
    this.name = 'PortUnavailableError';
    this.port = port;
  }
}

// ─── StateMismatchError ───

/** OAuth state参数不匹配 — 可能的CSRF攻击 */
export class StateMismatchError extends Error {
  constructor() {
    super('OAuth state mismatch - possible CSRF attack');
    this.name = 'StateMismatchError';
  }
}

// ─── NoCodeVerifierError ───

/** PKCE code verifier未保存 */
export class NoCodeVerifierError extends Error {
  constructor() {
    super('No code verifier saved');
    this.name = 'NoCodeVerifierError';
  }
}

// ─── DiscoveryFailedError ───

/** OAuth metadata discovery失败 */
export class DiscoveryFailedError extends Error {
  readonly url: string;

  constructor(url: string, reason?: string) {
    super(reason ?? `Failed to discover OAuth metadata from ${url}`);
    this.name = 'DiscoveryFailedError';
    this.url = url;
  }
}

// ─── OAuth Flow 错误原因 ───

/** OAuth流程失败原因 — 用于analytics/telemetry */
export type OAuthFlowErrorReason =
  | 'cancelled'
  | 'timeout'
  | 'provider_denied'
  | 'state_mismatch'
  | 'port_unavailable'
  | 'sdk_auth_failed'
  | 'token_exchange_failed'
  | 'unknown';

/** Token刷新失败原因 */
export type TokenRefreshFailureReason =
  | 'metadata_discovery_failed'
  | 'no_client_info'
  | 'no_tokens_returned'
  | 'invalid_grant'
  | 'transient_retries_exhausted'
  | 'request_failed';

// ─── 辅助函数 ───

/** 判断是否为可重试的错误 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof ServerError) return true;
  if (error instanceof InvalidGrantError) return false;
  if (error instanceof AuthenticationCancelledError) return false;
  // timeout/transient errors — 通过消息判断
  if (/timeout|timed out|etimedout|econnreset/i.test(error.message)) return true;
  return false;
}
