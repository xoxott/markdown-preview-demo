/**
 * @suga/ai-sdk — Agent SDK统一入口
 *
 * 聚合17包类型导出 + Zod Schema + 公开API函数签名 + 控制协议。
 * SDK消费者只需 `import { ... } from '@suga/ai-sdk'` 获取完整类型体系。
 */

// === 核心类型聚合 ===
export type * from './sdk/coreTypes';

// === SDK共享类型 ===
export type * from './sdk/sharedTypes';

// === SDK消息类型 ===
export type * from './sdk/sdkMessages';

// === SDK实用类型 ===
export type * from './sdk/sdkUtilityTypes';

// === Sandbox类型 ===
export type * from './sdk/sandboxTypes';

// === 控制协议类型 ===
export type * from './sdk/controlTypes';

// === 运行时类型 ===
export type * from './sdk/runtimeTypes';

// === 常量 ===
export { HOOK_EVENTS, EXIT_REASONS, PERMISSION_MODES } from './sdk/constants';
export type {
  HookEventName,
  ExitReason,
  EffortLevel,
  PermissionModeValue,
  OutputFormatType,
  SessionStatusValue
} from './sdk/constants';

// === Zod Schema ===
export {
  // 从子包聚合
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpSSEIDEServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpWebSocketIDEServerConfigSchema,
  McpSdkServerConfigSchema,
  McpServerConfigSchema,
  McpJsonConfigSchema,
  McpConfigScopeSchema,
  GlobInputSchema,
  GrepInputSchema,
  FileReadInputSchema,
  FileWriteInputSchema,
  FileEditInputSchema,
  BashInputSchema,
  PermissionRuleStringSchema,
  SettingsPermissionsSectionSchema,
  SettingsSchema,
  // SDK特有schema
  HookEventSchema,
  ExitReasonSchema,
  PermissionModeSchema,
  SDKUserMessageSchema,
  SDKAssistantMessageSchema,
  SDKResultSuccessSchema,
  SDKResultErrorSchema,
  SDKResultMessageSchema,
  SDKSystemMessageSchema,
  SDKStatusMessageSchema,
  SDKMessageSchema,
  SDKUsageInfoSchema,
  SDKSessionInfoSchema,
  AgentDefinitionConfigSchema,
  SDKControlRequestSchema,
  SDKControlResponseSchema,
  SDKKeepAliveMessageSchema,
  SandboxNetworkConfigSchema,
  SandboxFilesystemConfigSchema,
  SandboxSettingsSchema,
  OutputFormatSchema,
  ThinkingConfigSchema,
  SDKHookCallbackMatcherSchema
} from './sdk/coreSchemas';

// === 控制协议Schema ===
export {
  SDKControlInitializeRequestSchema,
  SDKControlInitializeResponseSchema,
  SDKControlPermissionRequestSchema,
  SDKControlSetPermissionModeRequestSchema,
  SDKControlInterruptRequestSchema,
  SDKControlSetModelRequestSchema,
  SDKControlMcpStatusRequestSchema,
  SDKControlMcpSetServersRequestSchema,
  SDKControlMcpReconnectRequestSchema,
  SDKControlMcpToggleRequestSchema,
  SDKControlGetContextUsageRequestSchema,
  SDKControlElicitationRequestSchema,
  SDKControlEndSessionRequestSchema,
  SDKControlReloadPluginsRequestSchema,
  SDKControlStopTaskRequestSchema,
  SDKControlRewindFilesRequestSchema,
  SDKControlRequestInnerSchema,
  SDKControlRequestEnvelopeSchema,
  SDKControlCancelRequestSchema,
  StdoutMessageSchema,
  StdinMessageSchema
} from './sdk/controlSchemas';

// === 公开API函数 ===
export { tool, createSdkMcpServer, SDKAbortError } from './api/mcpTool';
export { query, unstable_v2_prompt } from './api/query';
export {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
  getSessionMessages,
  listSessions,
  getSessionInfo,
  renameSession,
  tagSession,
  forkSession
} from './api/session';
