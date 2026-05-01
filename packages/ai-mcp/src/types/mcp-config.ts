/**
 * MCP 服务器配置类型定义
 *
 * 7种传输配置 + OAuth子配置 + 联合类型 + MCP JSON文件格式 基于 Claude Code services/mcp/types.ts 提取的抽象核心
 */

import { z } from 'zod/v4';

// ─── 传输类型 ───

/** MCP 传输协议类型 */
export type McpTransportType = 'stdio' | 'sse' | 'sse-ide' | 'http' | 'ws' | 'ws-ide' | 'sdk';

// ─── OAuth 子配置 ───

export interface McpOAuthConfig {
  readonly clientId?: string;
  readonly callbackPort?: number;
  readonly authServerMetadataUrl?: string;
}

// ─── stdio 配置 ───

export interface McpStdioServerConfig {
  /** 类型标识（可选，默认为 stdio 以向后兼容） */
  readonly type?: 'stdio';
  /** 要执行的命令 */
  readonly command: string;
  /** 命令参数 */
  readonly args?: readonly string[];
  /** 环境变量 */
  readonly env?: Record<string, string>;
}

// ─── SSE 配置 ───

export interface McpSSEServerConfig {
  readonly type: 'sse';
  readonly url: string;
  readonly headers?: Record<string, string>;
  readonly headersHelper?: string;
  readonly oauth?: McpOAuthConfig;
}

// ─── SSE-IDE 配置（IDE内部） ───

export interface McpSSEIDEServerConfig {
  readonly type: 'sse-ide';
  readonly url: string;
  readonly ideName: string;
  readonly ideRunningInWindows?: boolean;
}

// ─── HTTP Streamable 配置 ───

export interface McpHTTPServerConfig {
  readonly type: 'http';
  readonly url: string;
  readonly headers?: Record<string, string>;
  readonly headersHelper?: string;
  readonly oauth?: McpOAuthConfig;
}

// ─── WebSocket 配置 ───

export interface McpWebSocketServerConfig {
  readonly type: 'ws';
  readonly url: string;
  readonly headers?: Record<string, string>;
  readonly headersHelper?: string;
}

// ─── WebSocket-IDE 配置 ───

export interface McpWebSocketIDEServerConfig {
  readonly type: 'ws-ide';
  readonly url: string;
  readonly ideName: string;
  readonly authToken?: string;
  readonly ideRunningInWindows?: boolean;
}

// ─── SDK 配置（进程内） ───

export interface McpSdkServerConfig {
  readonly type: 'sdk';
  readonly name: string;
}

// ─── 联合类型 ───

/** 所有 MCP 服务器配置的联合类型 */
export type McpServerConfig =
  | McpStdioServerConfig
  | McpSSEServerConfig
  | McpSSEIDEServerConfig
  | McpHTTPServerConfig
  | McpWebSocketServerConfig
  | McpWebSocketIDEServerConfig
  | McpSdkServerConfig;

// ─── MCP JSON 文件格式 ───

/** .mcp.json 文件格式 */
export interface McpJsonConfig {
  readonly mcpServers: Record<string, McpServerConfig>;
}

// ─── Zod Schema ───

const McpOAuthConfigSchema = z.object({
  clientId: z.string().optional(),
  callbackPort: z.number().int().positive().optional(),
  authServerMetadataUrl: z.string().url().optional()
});

export const McpStdioServerConfigSchema = z.object({
  type: z.literal('stdio').optional(),
  command: z.string().min(1, 'Command cannot be empty'),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).optional()
});

export const McpSSEServerConfigSchema = z.object({
  type: z.literal('sse'),
  url: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  headersHelper: z.string().optional(),
  oauth: McpOAuthConfigSchema.optional()
});

export const McpSSEIDEServerConfigSchema = z.object({
  type: z.literal('sse-ide'),
  url: z.string(),
  ideName: z.string(),
  ideRunningInWindows: z.boolean().optional()
});

export const McpHTTPServerConfigSchema = z.object({
  type: z.literal('http'),
  url: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  headersHelper: z.string().optional(),
  oauth: McpOAuthConfigSchema.optional()
});

export const McpWebSocketServerConfigSchema = z.object({
  type: z.literal('ws'),
  url: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  headersHelper: z.string().optional()
});

export const McpWebSocketIDEServerConfigSchema = z.object({
  type: z.literal('ws-ide'),
  url: z.string(),
  ideName: z.string(),
  authToken: z.string().optional(),
  ideRunningInWindows: z.boolean().optional()
});

export const McpSdkServerConfigSchema = z.object({
  type: z.literal('sdk'),
  name: z.string()
});

/** MCP 服务器配置联合 Schema */
export const McpServerConfigSchema = z.union([
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpSSEIDEServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpWebSocketIDEServerConfigSchema,
  McpSdkServerConfigSchema
]);

/** .mcp.json 文件 Schema */
export const McpJsonConfigSchema = z.object({
  mcpServers: z.record(z.string(), McpServerConfigSchema)
});
