/**
 * controlSchemas.ts — 控制协议Zod Schema
 *
 * 定义CLI↔SDK宿主之间的通信协议schema（运行时校验）。 对齐Claude Code controlSchemas.ts的核心控制请求subtype。
 */

import { z } from 'zod/v4';

// === 初始化 ===

/** 初始化请求schema */
export const SDKControlInitializeRequestSchema = z.object({
  subtype: z.literal('initialize'),
  hooks: z.array(z.unknown()).optional(),
  sdk_mcp_servers: z.record(z.string(), z.unknown()).optional(),
  json_schema: z.boolean().optional(),
  append_system_prompt: z.string().optional(),
  agents: z.array(z.unknown()).optional(),
  prompt_suggestions: z.array(z.string()).optional()
});

/** 初始化响应schema */
export const SDKControlInitializeResponseSchema = z.object({
  commands: z.array(z.string()),
  agents: z.array(z.unknown()),
  models: z.array(z.unknown()),
  account: z.unknown().optional(),
  pid: z.number()
});

// === 权限 ===

/** 权限请求schema */
export const SDKControlPermissionRequestSchema = z.object({
  subtype: z.literal('can_use_tool'),
  tool_name: z.string(),
  input: z.unknown(),
  tool_use_id: z.string(),
  permission_suggestions: z.unknown().optional()
});

/** 设置权限模式schema */
export const SDKControlSetPermissionModeRequestSchema = z.object({
  subtype: z.literal('set_permission_mode'),
  mode: z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan', 'dontAsk', 'auto'])
});

// === 中断 ===

/** 中断请求schema */
export const SDKControlInterruptRequestSchema = z.object({
  subtype: z.literal('interrupt')
});

// === 模型 ===

/** 设置模型schema */
export const SDKControlSetModelRequestSchema = z.object({
  subtype: z.literal('set_model'),
  model: z.string()
});

// === MCP ===

/** MCP状态请求schema */
export const SDKControlMcpStatusRequestSchema = z.object({
  subtype: z.literal('mcp_status')
});

/** MCP设置服务器请求schema */
export const SDKControlMcpSetServersRequestSchema = z.object({
  subtype: z.literal('mcp_set_servers'),
  servers: z.record(z.string(), z.unknown())
});

/** MCP重连请求schema */
export const SDKControlMcpReconnectRequestSchema = z.object({
  subtype: z.literal('mcp_reconnect'),
  serverName: z.string()
});

/** MCP切换请求schema */
export const SDKControlMcpToggleRequestSchema = z.object({
  subtype: z.literal('mcp_toggle'),
  serverName: z.string(),
  enabled: z.boolean()
});

// === 上下文 ===

/** 上下文用量请求schema */
export const SDKControlGetContextUsageRequestSchema = z.object({
  subtype: z.literal('get_context_usage')
});

// === 用户输入(Elicitation) ===

/** Elicitation请求schema */
export const SDKControlElicitationRequestSchema = z.object({
  subtype: z.literal('elicitation'),
  mcp_server_name: z.string(),
  message: z.string(),
  requested_schema: z.unknown().optional()
});

// === 会话 ===

/** 结束会话请求schema */
export const SDKControlEndSessionRequestSchema = z.object({
  subtype: z.literal('end_session'),
  reason: z.string().optional()
});

// === 插件 ===

/** 重载插件请求schema */
export const SDKControlReloadPluginsRequestSchema = z.object({
  subtype: z.literal('reload_plugins')
});

// === 任务 ===

/** 停止任务请求schema */
export const SDKControlStopTaskRequestSchema = z.object({
  subtype: z.literal('stop_task'),
  task_id: z.string()
});

// === 文件回溯 ===

/** 文件回溯请求schema */
export const SDKControlRewindFilesRequestSchema = z.object({
  subtype: z.literal('rewind_files'),
  user_message_id: z.string(),
  dry_run: z.boolean().optional()
});

// === 控制请求内部联合 ===

/** 控制请求内部联合schema */
export const SDKControlRequestInnerSchema = z.discriminatedUnion('subtype', [
  SDKControlInitializeRequestSchema,
  SDKControlPermissionRequestSchema,
  SDKControlSetPermissionModeRequestSchema,
  SDKControlSetModelRequestSchema,
  SDKControlInterruptRequestSchema,
  SDKControlMcpStatusRequestSchema,
  SDKControlMcpSetServersRequestSchema,
  SDKControlMcpReconnectRequestSchema,
  SDKControlMcpToggleRequestSchema,
  SDKControlGetContextUsageRequestSchema,
  SDKControlElicitationRequestSchema,
  SDKControlEndSessionRequestSchema,
  SDKControlReloadPluginsRequestSchema,
  SDKControlStopTaskRequestSchema,
  SDKControlRewindFilesRequestSchema
]);

// === 信封schema ===

/** 控制请求信封schema */
export const SDKControlRequestEnvelopeSchema = z.object({
  type: z.literal('control_request'),
  request_id: z.string(),
  request: SDKControlRequestInnerSchema
});

/** 控制响应信封schema（复用coreSchemas中的定义） */
export const SDKControlCancelRequestSchema = z.object({
  type: z.literal('control_cancel'),
  request_id: z.string()
});

// === 传输消息schema ===

/** stdout消息schema */
export const StdoutMessageSchema = z.union([
  z.unknown(), // SDKMessage（暂用unknown，待SDKMessageSchema完善后替换）
  SDKControlRequestEnvelopeSchema,
  z.unknown(), // SDKControlResponse
  z.object({ type: z.literal('keep_alive'), timestamp: z.number() })
]);

/** stdin消息schema */
export const StdinMessageSchema = z.union([
  z.object({ type: z.literal('user'), message: z.unknown() }),
  SDKControlRequestEnvelopeSchema,
  z.unknown(), // SDKControlResponse
  SDKControlCancelRequestSchema,
  z.object({ type: z.literal('keep_alive'), timestamp: z.number() }),
  z.object({ type: z.literal('update_env_vars'), env_vars: z.record(z.string(), z.string()) })
]);
