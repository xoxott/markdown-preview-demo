/**
 * OAuth Zod Schema 聚合
 *
 * 覆盖认证相关核心schema：OAuth token交换、Discovery、错误响应等。 运行时校验 + 类型推导双用途。
 */

import { z } from 'zod/v4';

// ─── 订阅类型 ───

export const SubscriptionTypeSchema = z.enum(['max', 'pro', 'enterprise', 'team']);

// ─── OAuth Token 交换响应 ───

export const OAuthTokenExchangeResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  token_type: z.string(),
  scope: z.string().optional(),
  account: z
    .object({
      uuid: z.string(),
      email_address: z.string()
    })
    .optional(),
  organization: z
    .object({
      uuid: z.string()
    })
    .optional()
});

// ─── OAuth Tokens（内部格式） ───

export const OAuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  scopes: z.array(z.string()),
  subscriptionType: SubscriptionTypeSchema.nullable(),
  rateLimitTier: z.string().nullable()
});

// ─── OAuth Profile ───

export const OAuthProfileResponseSchema = z.object({
  account: z.object({
    uuid: z.string(),
    email: z.string(),
    display_name: z.string().optional(),
    created_at: z.string().optional()
  }),
  organization: z.object({
    uuid: z.string(),
    organization_type: z.string().optional(),
    rate_limit_tier: z.string().optional(),
    has_extra_usage_enabled: z.boolean().optional(),
    billing_type: z.string().optional()
  })
});

// ─── OAuth Error ───

export const OAuthErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
  error_uri: z.string().optional()
});

// ─── Discovery State ───

export const OAuthDiscoveryStateSchema = z.object({
  authorizationServerUrl: z.string().url().optional(),
  resourceMetadataUrl: z.string().url().optional()
});

// ─── Token Storage Entry ───

export const TokenStorageEntrySchema = z.object({
  serverName: z.string(),
  serverUrl: z.string().url(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  scope: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  discoveryState: OAuthDiscoveryStateSchema.optional(),
  stepUpScope: z.string().optional()
});

// ─── Auth Provider Config ───

export const AuthProviderConfigSchema = z.object({
  serverName: z.string().min(1),
  serverUrl: z.string().url(),
  redirectUri: z.string().url(),
  skipBrowserOpen: z.boolean().optional(),
  clientId: z.string().optional()
});

// ─── OAuth Config ───

export const OAuthConfigSchema = z.object({
  clientId: z.string().min(1),
  authorizeUrl: z.string().url(),
  tokenUrl: z.string().url(),
  redirectUrl: z.string().url().optional(),
  scope: z.string().optional()
});

// ─── Auth Code Listener 状态 ───

export const AuthCodeListenerStateSchema = z.enum([
  'idle',
  'listening',
  'waiting',
  'completed',
  'error'
]);
