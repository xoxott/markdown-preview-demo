/**
 * runtimeTypes.ts — 运行时类型（非可序列化）
 *
 * 定义SDK运行时API的类型签名，这些类型无法用Zod schema表达。 对齐Claude Code runtimeTypes.ts的设计。
 */

import type { z } from 'zod/v4';
import type { SDKMessage } from './sdkMessages';
import type { EffortLevel, OutputFormatType, PermissionModeValue } from './constants';
import type { SandboxSettings } from './sandboxTypes';

// === Query选项 ===

/** 公开查询选项 */
export interface QueryOptions {
  /** 模型名称 */
  readonly model?: string;
  /** 最大输出token */
  readonly max_tokens?: number;
  /** 系统提示追加 */
  readonly append_system_prompt?: string;
  /** 权限模式 */
  readonly permission_mode?: PermissionModeValue;
  /** 努力级别 */
  readonly effort_level?: EffortLevel;
  /** 输出格式 */
  readonly output_format?: OutputFormatType;
  /** 允许的工具列表 */
  readonly allowed_tools?: readonly string[];
  /** 禁止的工具列表 */
  readonly disallowed_tools?: readonly string[];
  /** MCP服务器配置 */
  readonly mcp_servers?: Record<string, unknown>;
  /** 思考配置 */
  readonly thinking?: ThinkingConfigOption;
  /** Sandbox配置 */
  readonly sandbox?: SandboxSettings;
  /** Abort信号 */
  readonly abort_signal?: AbortSignal;
  /** 工作目录 */
  readonly cwd?: string;
  /** 是否启用JSON Schema输出 */
  readonly json_schema?: boolean;
}

/** 思考配置选项 */
export type ThinkingConfigOption =
  | { type: 'enabled'; budget_tokens: number }
  | { type: 'disabled' }
  | { type: 'adaptive' };

// === Session类型 ===

/** SDK会话选项 */
export interface SDKSessionOptions {
  /** 模型 */
  readonly model?: string;
  /** 权限模式 */
  readonly permission_mode?: PermissionModeValue;
  /** 最大轮次 */
  readonly max_turns?: number;
  /** 工作目录 */
  readonly cwd?: string;
  /** 系统提示追加 */
  readonly append_system_prompt?: string;
  /** 允许的工具 */
  readonly allowed_tools?: readonly string[];
  /** MCP服务器 */
  readonly mcp_servers?: Record<string, unknown>;
}

/** SDK会话接口 */
export interface SDKSession {
  /** 会话ID */
  readonly sessionId: string;
  /** 发送消息到Agent */
  prompt(message: string): AsyncIterable<SDKMessage>;
  /** 中止当前轮次 */
  abort(): Promise<void>;
  /** 关闭会话 */
  close(): Promise<void>;
}

/** 列出会话选项 */
export interface ListSessionsOptions {
  /** 按目录过滤 */
  readonly cwd?: string;
  /** 分页偏移 */
  readonly offset?: number;
  /** 分页限制 */
  readonly limit?: number;
}

/** 获取会话消息选项 */
export interface GetSessionMessagesOptions {
  /** 偏移 */
  readonly offset?: number;
  /** 限制 */
  readonly limit?: number;
}

/** 分叉会话选项 */
export interface ForkSessionOptions {
  /** 从哪条消息分叉 */
  readonly from_message_id?: string;
}

/** 分叉会话结果 */
export interface ForkSessionResult {
  readonly new_session_id: string;
  readonly session_id: string;
}

/** 会话变更选项 */
export interface SessionMutationOptions {
  /** 自定义标题 */
  readonly title?: string;
  /** 标签 */
  readonly tag?: string | null;
}

// === MCP工具定义 ===

/** SDK MCP工具定义 */
export interface SdkMcpToolDefinition<T = unknown> {
  /** 工具名称 */
  readonly name: string;
  /** 工具描述 */
  readonly description: string;
  /** 输入schema（Zod） */
  readonly input_schema: z.ZodType<T>;
  /** 处理函数 */
  readonly handler: (input: T) => Promise<string>;
}

/** SDK MCP工具定义（不含handler，用于注册） */
export interface SdkMcpToolSpec {
  readonly name: string;
  readonly description: string;
  readonly input_schema: unknown;
}

/** MCP服务器创建配置 */
export interface CreateSdkMcpServerConfig {
  readonly name: string;
  readonly version: string;
  readonly tools: readonly SdkMcpToolDefinition[];
}

// === Query返回类型 ===

/** Query返回 — AsyncIterable<SDKMessage> */
export type Query = AsyncIterable<SDKMessage>;

/** 内部Query — 带更多配置 */
export type InternalQuery = AsyncIterable<SDKMessage>;
