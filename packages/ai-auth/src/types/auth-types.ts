/**
 * OAuth 通用类型定义
 *
 * 从Claude Code services/oauth/types.ts 提取的抽象核心。 覆盖OAuth token交换响应、token数据结构、profile信息等。
 */

// ─── 订阅/计费类型 ───

export type SubscriptionType = 'max' | 'pro' | 'enterprise' | 'team';
export type RateLimitTier = string | null;
export type BillingType = string | null;

// ─── OAuth Token 交换响应 ───

/** OAuth token endpoint的原始响应格式（snake_case，对齐RFC 6749） */
export interface OAuthTokenExchangeResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly token_type: string;
  readonly scope?: string;
  readonly account?: {
    readonly uuid: string;
    readonly email_address: string;
  };
  readonly organization?: {
    readonly uuid: string;
  };
}

// ─── OAuth Tokens（内部格式，camelCase） ───

/** OAuth token数据结构 — 存储/传递用的内部格式 */
export interface OAuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly scopes: string[];
  readonly subscriptionType: SubscriptionType | null;
  readonly rateLimitTier: RateLimitTier | null;
  readonly profile?: OAuthProfileResponse;
  readonly tokenAccount?: {
    readonly uuid: string;
    readonly emailAddress: string;
    readonly organizationUuid?: string;
  };
}

// ─── OAuth Profile ───

/** OAuth profile响应 — 用户和组织信息 */
export interface OAuthProfileResponse {
  readonly account: {
    readonly uuid: string;
    readonly email: string;
    readonly display_name?: string;
    readonly created_at?: string;
  };
  readonly organization: {
    readonly uuid: string;
    readonly organization_type?: string;
    readonly rate_limit_tier?: string;
    readonly has_extra_usage_enabled?: boolean;
    readonly billing_type?: string;
  };
}

// ─── OAuth Error ───

/** OAuth错误响应（RFC 6749 §5.2） */
export interface OAuthErrorResponse {
  readonly error: string;
  readonly error_description?: string;
  readonly error_uri?: string;
}

// ─── Scope 解析 ───

/** 从scope字符串解析为数组 */
export function parseScopes(scopeString?: string): string[] {
  return scopeString?.split(' ').filter(Boolean) ?? [];
}

/** 判断token是否过期（含5分钟缓冲） */
export function isOAuthTokenExpired(expiresAt: number): boolean {
  const bufferTime = 5 * 60 * 1000;
  return Date.now() + bufferTime >= expiresAt;
}

/** 获取token剩余有效时间（秒） */
export function getTokenRemainingSeconds(expiresAt: number): number {
  return (expiresAt - Date.now()) / 1000;
}
