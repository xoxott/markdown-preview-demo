/**
 * coreSchemas.ts — Zod Schema聚合 + SDK特有schema
 *
 * 聚合各子包已有的Zod schema + 新增SDK消费者需要的schema。 所有schema使用z.lazy()延迟初始化，避免循环依赖。
 */

import { z } from 'zod/v4';
import { EXIT_REASONS, HOOK_EVENTS, PERMISSION_MODES } from './constants';

// === 从子包re-export已有schema ===

// MCP配置schema — 从@Suga/ai-mcp导出
export {
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpSSEIDEServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpWebSocketIDEServerConfigSchema,
  McpSdkServerConfigSchema,
  McpServerConfigSchema,
  McpJsonConfigSchema,
  McpConfigScopeSchema
} from '@suga/ai-mcp';

// 工具输入schema — 从@Suga/ai-tools导出
export {
  GlobInputSchema,
  GrepInputSchema,
  FileReadInputSchema,
  FileWriteInputSchema,
  FileEditInputSchema,
  BashInputSchema
} from '@suga/ai-tools';

// Settings/权限schema — 从@Suga/ai-tool-core导出
export {
  PermissionRuleStringSchema,
  SettingsPermissionsSectionSchema,
  SettingsSchema
} from '@suga/ai-tool-core';

// === SDK特有schema ===

/** Hook事件schema */
export const HookEventSchema = z.enum(HOOK_EVENTS);

/** 退出原因schema */
export const ExitReasonSchema = z.enum(EXIT_REASONS);

/** 权限模式schema */
export const PermissionModeSchema = z.enum(PERMISSION_MODES);

/** SDK用户消息schema */
export const SDKUserMessageSchema = z.object({
  type: z.literal('user'),
  message: z.unknown(),
  session_id: z.string().optional(),
  uuid: z.string().optional(),
  isSynthetic: z.boolean().optional(),
  priority: z.enum(['normal', 'high']).optional()
});

/** SDK助手消息schema */
export const SDKAssistantMessageSchema = z.object({
  type: z.literal('assistant'),
  message: z.unknown(),
  session_id: z.string().optional(),
  uuid: z.string().optional(),
  error: z.string().optional()
});

/** SDK成功结果schema */
export const SDKResultSuccessSchema = z.object({
  type: z.literal('result'),
  subtype: z.literal('success'),
  result: z.string(),
  duration_ms: z.number(),
  is_error: z.boolean(),
  num_turns: z.number(),
  session_id: z.string().optional(),
  uuid: z.string().optional()
});

/** SDK错误结果schema */
export const SDKResultErrorSchema = z.object({
  type: z.literal('result'),
  subtype: z.enum(['error', 'error_tool', 'error_api', 'error_interrupt']),
  error: z.string(),
  duration_ms: z.number(),
  num_turns: z.number(),
  session_id: z.string().optional(),
  uuid: z.string().optional()
});

/** SDK结果消息schema */
export const SDKResultMessageSchema = z.discriminatedUnion('subtype', [
  SDKResultSuccessSchema,
  SDKResultErrorSchema
]);

/** SDK系统消息schema */
export const SDKSystemMessageSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('init'),
  cwd: z.string(),
  tools: z.array(z.string()),
  model: z.string(),
  permissionMode: z.string(),
  slash_commands: z.array(z.unknown()),
  mcp_servers: z.array(z.unknown()),
  session_id: z.string().optional(),
  uuid: z.string().optional()
});

/** SDK状态消息schema */
export const SDKStatusMessageSchema = z.object({
  type: z.literal('status'),
  status: z.enum(['idle', 'running', 'waiting_for_permission', 'compacting', 'recovering']),
  session_id: z.string().optional(),
  uuid: z.string().optional()
});

/** SDK消息schema联合 */
export const SDKMessageSchema = z.discriminatedUnion('type', [
  SDKUserMessageSchema,
  SDKAssistantMessageSchema,
  SDKResultSuccessSchema,
  SDKResultErrorSchema,
  SDKSystemMessageSchema,
  SDKStatusMessageSchema
]);

/** SDK使用量schema */
export const SDKUsageInfoSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional()
});

/** SDK会话信息schema */
export const SDKSessionInfoSchema = z.object({
  sessionId: z.string(),
  summary: z.string().optional(),
  lastModified: z.number(),
  fileSize: z.number(),
  customTitle: z.string().optional(),
  firstPrompt: z.string().optional(),
  gitBranch: z.string().optional(),
  cwd: z.string().optional(),
  tag: z.string().optional(),
  createdAt: z.number().optional()
});

/** Agent定义配置schema */
export const AgentDefinitionConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  prompt: z.string().optional(),
  tools: z.array(z.string()).optional(),
  model: z.string().optional()
});

/** 控制请求信封schema */
export const SDKControlRequestSchema = z.object({
  type: z.literal('control_request'),
  request_id: z.string(),
  request: z.unknown()
});

/** 控制响应信封schema */
export const SDKControlResponseSchema = z.discriminatedUnion('success', [
  z.object({
    type: z.literal('control_response'),
    request_id: z.string(),
    success: z.literal(true),
    response: z.unknown()
  }),
  z.object({
    type: z.literal('control_response'),
    request_id: z.string(),
    success: z.literal(false),
    error: z.string(),
    pending_permission_requests: z.array(z.unknown()).optional()
  })
]);

/** 保活消息schema */
export const SDKKeepAliveMessageSchema = z.object({
  type: z.literal('keep_alive'),
  timestamp: z.number()
});

/** Sandbox网络配置schema */
export const SandboxNetworkConfigSchema = z.object({
  allow: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional()
});

/** Sandbox文件系统配置schema */
export const SandboxFilesystemConfigSchema = z.object({
  allow: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional()
});

/** Sandbox违规忽略配置schema */
export const SandboxIgnoreViolationsSchema = z.object({
  network: z.array(z.string()).optional(),
  filesystem: z.array(z.string()).optional()
});

/** Sandbox设置schema */
export const SandboxSettingsSchema = z.object({
  network: SandboxNetworkConfigSchema.optional(),
  filesystem: SandboxFilesystemConfigSchema.optional(),
  ignoreViolations: SandboxIgnoreViolationsSchema.optional()
});

/** 输出格式schema */
export const OutputFormatSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text') }),
  z.object({ type: z.literal('json') }),
  z.object({ type: z.literal('json_schema'), schema: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal('streaming_json') })
]);

/** 思考配置schema */
export const ThinkingConfigSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('enabled'), budget_tokens: z.number() }),
  z.object({ type: z.literal('disabled') }),
  z.object({ type: z.literal('adaptive') })
]);

/** Hook回调匹配schema */
export const SDKHookCallbackMatcherSchema = z.object({
  matcher: z.string(),
  callback_ids: z.array(z.string()),
  timeout: z.number().optional()
});
