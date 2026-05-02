/**
 * @suga/ai-auth — OAuth 2.0 认证层总入口
 *
 * 聚合所有类型、函数、类的导出。
 * 消费者只需 import from '@suga/ai-auth' 获取完整认证能力。
 */

// ─── 类型导出 ───

export type {
  SubscriptionType,
  RateLimitTier,
  BillingType,
  OAuthTokenExchangeResponse,
  OAuthTokens,
  OAuthProfileResponse,
  OAuthErrorResponse
} from './types/auth-types';

export { parseScopes, isOAuthTokenExpired, getTokenRemainingSeconds } from './types/auth-types';

export type {
  OAuthClientInformation,
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthDiscoveryState,
  OAuthClientProvider,
  AuthProviderConfig,
  StepUpAuthState,
  OAuthFlowOptions,
  McpOAuthFlowOptions,
  TokenRevocationOptions,
  OAuthFlowResult,
  FetchLike
} from './types/mcp-auth-types';

// ─── 宿主注入接口 ───

export type {
  TokenStorageProvider,
  TokenStorageEntry,
  BrowserLauncher,
  CryptoProvider,
  McpAuthBridgeProvider,
  AuthProviderDependencies,
  OAuthConfig,
  HashInstance
} from './provider/AuthProviderInterface';

// ─── PKCE ───

export {
  base64URLEncode,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  getServerKey
} from './crypto/pkce';

// ─── Node Crypto Provider ───

export { NodeCryptoProvider } from './crypto/random';

// ─── Callback Port ───

export { buildRedirectUri, findAvailablePort } from './listener/CallbackPortManager';

// ─── 错误类型 ───

export {
  AuthenticationCancelledError,
  InvalidGrantError,
  OAuthError,
  ServerError,
  PortUnavailableError,
  StateMismatchError,
  NoCodeVerifierError,
  DiscoveryFailedError,
  isRetryableError
} from './errors/auth-errors';

export type { OAuthFlowErrorReason, TokenRefreshFailureReason } from './errors/auth-errors';

// ─── Zod Schema ───

export {
  SubscriptionTypeSchema,
  OAuthTokenExchangeResponseSchema,
  OAuthTokensSchema,
  OAuthProfileResponseSchema,
  OAuthErrorResponseSchema,
  OAuthDiscoveryStateSchema,
  TokenStorageEntrySchema,
  AuthProviderConfigSchema,
  OAuthConfigSchema,
  AuthCodeListenerStateSchema
} from './schemas/auth-schemas';

// ─── AuthCodeListener ───

export { AuthCodeListener } from './listener/AuthCodeListener';

// ─── AuthProvider ───

export { AuthProvider } from './provider/AuthProvider';

// ─── InMemoryAuthProvider ───

export {
  InMemoryTokenStorage,
  MockBrowserLauncher,
  createInMemoryAuthProvider
} from './provider/InMemoryAuthImpl';

// ─── OAuthFlow ───

export { performOAuthFlow, performTokenRefresh, revokeTokens } from './flow/OAuthFlow';

// ─── McpOAuthFlow ───

export { performMcpOAuthFlow } from './flow/McpOAuthFlow';

// ─── McpAuthBridge ───

export { McpAuthBridge } from './flow/McpAuthBridge';

// ─── OAuthDiscovery ───

export {
  fetchAuthServerMetadata,
  getTokenEndpointFromMetadata,
  getAuthorizeEndpointFromMetadata,
  getRevocationEndpointFromMetadata,
  getRegistrationEndpointFromMetadata
} from './discovery/OAuthDiscovery';

export type {
  AuthorizationServerMetadata,
  ProtectedResourceMetadata
} from './discovery/OAuthDiscovery';
