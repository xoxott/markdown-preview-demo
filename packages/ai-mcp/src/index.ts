/**
 * @suga/ai-mcp
 * MCP 协议抽象层 — 配置类型、传输接口、连接管理、名称规范化 + Server 端
 */

// 类型导出
export type * from './types';

// Zod Schema
export {
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpSSEIDEServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpWebSocketIDEServerConfigSchema,
  McpSdkServerConfigSchema,
  McpServerConfigSchema,
  McpJsonConfigSchema
} from './types/mcp-config';

export {
  McpConfigScopeSchema,
  getMcpScopePriority,
  MCP_CONFIG_SCOPE_PRIORITY
} from './types/mcp-scope';

// 连接状态辅助
export {
  getConnectionName,
  isMcpConnected,
  getConnectionStateType,
  isReconnecting,
  needsAuthentication,
  hasFailed,
  isDisabled
} from './types/mcp-connection';

// 名称规范化
export { normalizeNameForMCP } from './naming/normalization';
export {
  mcpInfoFromString,
  getMcpPrefix,
  buildMcpToolName,
  getMcpDisplayName,
  extractMcpToolDisplayName,
  getToolNameForPermissionCheck
} from './naming/mcpStringUtils';

// 环境变量扩展
export { expandEnvVarsInString } from './config/envExpansion';

// 传输
export { createLinkedTransportPair, InProcessTransport } from './transport/InProcessTransport';
export { StdioTransport } from './transport/StdioTransport';
export type { StdioTransportOptions } from './transport/StdioTransport';
export { StdioTransportFactory } from './transport/StdioTransportFactory';
export { SSETransportAdapter } from './transport/SSETransportAdapter';
export { StreamableHTTPTransportAdapter } from './transport/StreamableHTTPTransportAdapter';
export { UnifiedTransportFactory } from './transport/UnifiedTransportFactory';

// G41+G42: MCP ClaudeAI代理 导出
export {
  McpClaudeAIProxyConfigSchema,
  isClaudeAIProxyConfig,
  getClaudeAIProxyDisplayName
} from './types/mcp-claudeai-proxy';

// G43: MCP Auth工具 导出
export { McpAuthActionSchema, McpAuthInputSchema } from './types/mcp-auth-tool';

// N13: MCP OAuth 流程实现
export { McpOAuthFlow } from './connection/McpOAuthFlow';
export type { McpOAuthFlowPhase } from './connection/McpOAuthFlow';

// N14: MCP Channel 通知系统
export { isChannelAllowed } from './types/mcp-channel';

// N37: MCP Headers Helper
export { executeHeadersHelper, DEFAULT_HEADERS_HELPER_CONFIG } from './connection/headersHelper';
export type { HeadersHelperConfig, HeadersHelperFn } from './connection/headersHelper';

// N38: MCP VSCode SDK 桥接
export {
  createVSCodeSdkBridge,
  DEFAULT_VSCODE_SDK_BRIDGE_CONFIG
} from './connection/vscodeSdkBridge';
export type {
  VSCodeSdkBridgeConfig,
  VSCodeSdkBridge,
  VSCodeFileUpdatedNotification,
  VSCodeLogEventNotification,
  VSCodeSdkNotificationHandler
} from './connection/vscodeSdkBridge';

// N39: MCP Official Registry
export {
  isOfficialMcpServer,
  DEFAULT_OFFICIAL_REGISTRY_CONFIG
} from './connection/officialRegistry';
export type {
  OfficialRegistryConfig,
  OfficialMcpEntry,
  FetchRegistryFn
} from './connection/officialRegistry';

// G48: OAuth 重定向端口选择
export { buildRedirectUri, findAvailablePort, parseConfiguredPort } from './connection/oauthPort';
export type { OAuthPortOptions } from './connection/oauthPort';

// G49: Channel 白名单
export {
  ChannelAllowlistEntrySchema,
  ChannelAllowlistSchema,
  InMemoryChannelAllowlistProvider,
  parsePluginIdentifier,
  isChannelAllowlisted,
  validateChannelAllowlist
} from './connection/channelAllowlist';
export type {
  ChannelAllowlistEntry,
  ChannelAllowlistProvider
} from './connection/channelAllowlist';

// G50: Channel 通知
export {
  CHANNEL_NOTIFICATION_METHOD,
  CHANNEL_PERMISSION_METHOD,
  CHANNEL_PERMISSION_REQUEST_METHOD,
  CHANNEL_TAG,
  ChannelMessageNotificationSchema,
  ChannelPermissionNotificationSchema,
  ChannelNotificationDispatcher,
  isSafeMetaKey,
  escapeXmlAttr,
  renderChannelMessage
} from './connection/channelNotification';
export type {
  ChannelMessageNotification,
  ChannelPermissionNotification,
  ChannelPermissionRequestParams,
  ChannelMessageSink,
  ChannelPermissionResponse,
  ChannelPermissionCallbacks,
  ChannelNotificationDispatcherOptions
} from './connection/channelNotification';

// G51: Channel 权限转发
export {
  PermissionRaceCoordinator,
  requestChannelPermission,
  buildInputPreview
} from './connection/channelPermissions';
export type {
  PermissionDecisionSource,
  PermissionDecisionResult,
  ChannelPermissionRequestSender,
  ActiveChannelsProvider,
  RequestChannelPermissionOptions
} from './connection/channelPermissions';

// G52: XAA (RFC 8693 + 7523)
export {
  TOKEN_EXCHANGE_GRANT,
  JWT_BEARER_GRANT,
  ID_JAG_TOKEN_TYPE,
  ID_TOKEN_TYPE,
  TokenExchangeResponseSchema,
  JwtBearerResponseSchema,
  XaaTokenExchangeError,
  XaaJwtBearerError,
  redactTokens,
  normalizeUrl,
  makeXaaFetch,
  requestIdJagFromIdp,
  requestAccessTokenWithJwtBearer,
  acquireXaaAccessToken
} from './connection/xaa';
export type {
  TokenExchangeResponse,
  JwtBearerResponse,
  FetchLike,
  IdpTokenExchangeRequest,
  AsJwtBearerRequest,
  XaaTokenAcquisitionRequest,
  XaaTokenResult
} from './connection/xaa';

// G53: XAA IdP Login
export {
  IdpDiscoveryDocumentSchema,
  IdpTokenResponseSchema,
  generatePkceVerifier,
  generatePkcePair,
  discoverIdpEndpoints,
  buildIdpAuthorizationUrl,
  exchangeIdpAuthorizationCode,
  validateOAuthState
} from './connection/xaaIdpLogin';
export type {
  IdpDiscoveryDocument,
  IdpTokenResponse,
  PKCEPair,
  BuildIdpAuthUrlOptions,
  ExchangeIdpCodeRequest
} from './connection/xaaIdpLogin';

// G54: ClaudeAI MCP 代理
export {
  ClaudeAIMcpServerSchema,
  ClaudeAIMcpServersResponseSchema,
  fetchClaudeAIMcpServers,
  ClaudeAIMcpFetcherWithCache
} from './connection/claudeai';
export type {
  ClaudeAIMcpServer,
  ClaudeAIMcpServersResponse,
  ClaudeAIMcpEligibilityState,
  ClaudeAIFetchProvider,
  ClaudeAIMcpFetcherOptions,
  ClaudeAIMcpFetchResult
} from './connection/claudeai';

// G55: MCP utils
export {
  filterToolsByServer,
  commandBelongsToServer,
  hashMcpServerConfig,
  parseMcpResourceUri,
  buildMcpResourceUri,
  mergeServersByScope
} from './connection/utils';
export type { ParsedMcpResourceUri } from './connection/utils';

// 连接管理
export { InMemoryMcpConnectionManager } from './connection/McpConnectionManager';
export type { McpConnectionManager } from './connection/McpConnectionManager';
export { DefaultMcpElicitationHandler } from './connection/DefaultMcpElicitationHandler';

// 配置加载
export {
  validateMcpServerConfig,
  validateMcpJsonConfig,
  validateMcpConfigScope,
  getMcpServerTransportType,
  isStdioConfig,
  isRemoteConfig,
  getStdioCommandArray,
  mergeScopedConfigs
} from './connection/McpConfigLoader';
export type { McpConfigLoader } from './connection/McpConfigLoader';

// Server 端（P93 新增）
export {
  McpServerHost,
  McpServerBuilder,
  createStdioServerTransport,
  createSseServerTransport,
  createStreamableHttpServerTransport,
  handleSsePostMessage,
  handleStreamableHttpRequest,
  getSseSessionId,
  getStreamableHttpSessionId,
  connectStdioServer
} from './server';
export type {
  McpServerHostConfig,
  McpToolConfig,
  McpToolCallback,
  McpResourceConfig,
  McpResourceReadCallback,
  McpPromptConfig,
  McpPromptCallback,
  RegisteredTool,
  RegisteredResource,
  RegisteredPrompt,
  McpStdioServerTransportOptions,
  McpSseServerTransportOptions,
  McpStreamableHttpServerTransportOptions
} from './server';
