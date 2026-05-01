/**
 * controlTypes.ts — SDK控制协议类型
 *
 * 定义CLI↔SDK宿主之间的通信协议类型（stdin/stdout JSON消息）。 对齐Claude Code
 * controlTypes.ts的SDKControlRequest/Response结构。 共享类型从sharedTypes.ts引用。
 */

import type { SDKMessage } from './sdkMessages';
import type { PermissionModeValue } from './constants';
import type { AgentDefinitionConfig, SDKAccountInfo, SDKModelInfo } from './sharedTypes';

// === 控制请求内部载荷 ===

/** 初始化请求 — SDK宿主启动CLI时的配置 */
export interface SDKControlInitializeRequest {
  readonly subtype: 'initialize';
  readonly hooks?: readonly SDKHookCallbackMatcher[];
  readonly sdk_mcp_servers?: Record<string, unknown>;
  readonly json_schema?: boolean;
  readonly append_system_prompt?: string;
  readonly agents?: readonly AgentDefinitionConfig[];
  readonly prompt_suggestions?: readonly string[];
}

/** Hook回调匹配配置 */
export interface SDKHookCallbackMatcher {
  readonly matcher: string;
  readonly callback_ids: readonly string[];
  readonly timeout?: number;
}

/** 权限请求 — CLI向SDK宿主请求权限审批 */
export interface SDKControlPermissionRequest {
  readonly subtype: 'can_use_tool';
  readonly tool_name: string;
  readonly input: unknown;
  readonly permission_suggestions?: unknown;
  readonly tool_use_id: string;
}

/** 设置权限模式 */
export interface SDKControlSetPermissionModeRequest {
  readonly subtype: 'set_permission_mode';
  readonly mode: PermissionModeValue;
}

/** 设置模型 */
export interface SDKControlSetModelRequest {
  readonly subtype: 'set_model';
  readonly model: string;
}

/** 中断当前对话轮次 */
export interface SDKControlInterruptRequest {
  readonly subtype: 'interrupt';
}

/** MCP状态查询 */
export interface SDKControlMcpStatusRequest {
  readonly subtype: 'mcp_status';
}

/** MCP设置服务器 */
export interface SDKControlMcpSetServersRequest {
  readonly subtype: 'mcp_set_servers';
  readonly servers: Record<string, unknown>;
}

/** 上下文用量查询 */
export interface SDKControlGetContextUsageRequest {
  readonly subtype: 'get_context_usage';
}

/** 用户输入请求（MCP Elicitation） */
export interface SDKControlElicitationRequest {
  readonly subtype: 'elicitation';
  readonly mcp_server_name: string;
  readonly message: string;
  readonly requested_schema?: unknown;
}

/** 结束会话 */
export interface SDKControlEndSessionRequest {
  readonly subtype: 'end_session';
  readonly reason?: string;
}

/** 重载插件 */
export interface SDKControlReloadPluginsRequest {
  readonly subtype: 'reload_plugins';
}

/** 停止任务 */
export interface SDKControlStopTaskRequest {
  readonly subtype: 'stop_task';
  readonly task_id: string;
}

/** 文件回溯 */
export interface SDKControlRewindFilesRequest {
  readonly subtype: 'rewind_files';
  readonly user_message_id: string;
  readonly dry_run?: boolean;
}

/** 控制请求内部联合 — 所有subtype */
export type SDKControlRequestInner =
  | SDKControlInitializeRequest
  | SDKControlPermissionRequest
  | SDKControlSetPermissionModeRequest
  | SDKControlSetModelRequest
  | SDKControlInterruptRequest
  | SDKControlMcpStatusRequest
  | SDKControlMcpSetServersRequest
  | SDKControlGetContextUsageRequest
  | SDKControlElicitationRequest
  | SDKControlEndSessionRequest
  | SDKControlReloadPluginsRequest
  | SDKControlStopTaskRequest
  | SDKControlRewindFilesRequest;

// === 控制请求/响应信封 ===

/** 控制请求信封 */
export interface SDKControlRequest {
  readonly type: 'control_request';
  readonly request_id: string;
  readonly request: SDKControlRequestInner;
}

/** 控制成功响应 */
export interface SDKControlSuccessResponse {
  readonly type: 'control_response';
  readonly request_id: string;
  readonly success: true;
  readonly response: unknown;
}

/** 控制错误响应 */
export interface SDKControlErrorResponse {
  readonly type: 'control_response';
  readonly request_id: string;
  readonly success: false;
  readonly error: string;
  readonly pending_permission_requests?: readonly SDKControlPermissionRequest[];
}

/** 控制响应联合 */
export type SDKControlResponse = SDKControlSuccessResponse | SDKControlErrorResponse;

/** 取消控制请求 */
export interface SDKControlCancelRequest {
  readonly type: 'control_cancel';
  readonly request_id: string;
}

// === 初始化响应 ===

/** 初始化响应 — CLI返回给SDK宿主的初始信息 */
export interface SDKControlInitializeResponse {
  readonly commands: readonly string[];
  readonly agents: readonly AgentDefinitionConfig[];
  readonly models: readonly SDKModelInfo[];
  readonly account?: SDKAccountInfo;
  readonly pid: number;
}

// === 传输消息 ===

/** 保活消息 */
export interface SDKKeepAliveMessage {
  readonly type: 'keep_alive';
  readonly timestamp: number;
}

/** stdout消息 — CLI→SDK宿主的输出流 */
export type StdoutMessage =
  | SDKMessage
  | SDKControlRequest
  | SDKControlResponse
  | SDKKeepAliveMessage;

/** stdin消息 — SDK宿主→CLI的输入流 */
export type StdinMessage =
  | { readonly type: 'user'; readonly message: unknown }
  | SDKControlRequest
  | SDKControlResponse
  | SDKControlCancelRequest
  | SDKKeepAliveMessage
  | { readonly type: 'update_env_vars'; readonly env_vars: Record<string, string> };
