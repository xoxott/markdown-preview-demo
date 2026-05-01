/**
 * MCP 服务器连接状态类型
 *
 * 5种连接状态 + 状态辅助函数 服务器连接状态机: pending → connected | failed | needs-auth | disabled
 */

import type { ScopedMcpServerConfig } from './mcp-scope';
import type { McpServerCapabilities, McpServerInfo } from './mcp-registry';

// ─── 连接状态类型 ───

export interface ConnectedMcpServer {
  readonly type: 'connected';
  readonly name: string;
  readonly config: ScopedMcpServerConfig;
  readonly capabilities: McpServerCapabilities;
  readonly serverInfo?: McpServerInfo;
  readonly instructions?: string;
}

export interface FailedMcpServer {
  readonly type: 'failed';
  readonly name: string;
  readonly config: ScopedMcpServerConfig;
  readonly error?: string;
}

export interface NeedsAuthMcpServer {
  readonly type: 'needs-auth';
  readonly name: string;
  readonly config: ScopedMcpServerConfig;
}

export interface PendingMcpServer {
  readonly type: 'pending';
  readonly name: string;
  readonly config: ScopedMcpServerConfig;
  readonly reconnectAttempt?: number;
  readonly maxReconnectAttempts?: number;
}

export interface DisabledMcpServer {
  readonly type: 'disabled';
  readonly name: string;
  readonly config: ScopedMcpServerConfig;
}

/** MCP 服务器连接状态联合类型 */
export type McpServerConnection =
  | ConnectedMcpServer
  | FailedMcpServer
  | NeedsAuthMcpServer
  | PendingMcpServer
  | DisabledMcpServer;

// ─── 状态辅助函数 ───

/** 获取连接名称 */
export function getConnectionName(conn: McpServerConnection): string {
  return conn.name;
}

/** 判断连接是否已建立 */
export function isMcpConnected(conn: McpServerConnection): boolean {
  return conn.type === 'connected';
}

/** 获取连接状态类型字符串 */
export function getConnectionStateType(conn: McpServerConnection): McpServerConnection['type'] {
  return conn.type;
}

/** 判断连接是否处于重连状态 */
export function isReconnecting(conn: McpServerConnection): boolean {
  return (
    conn.type === 'pending' && conn.reconnectAttempt !== undefined && conn.reconnectAttempt > 0
  );
}

/** 判断连接是否需要认证 */
export function needsAuthentication(conn: McpServerConnection): boolean {
  return conn.type === 'needs-auth';
}

/** 判断连接是否已失败 */
export function hasFailed(conn: McpServerConnection): boolean {
  return conn.type === 'failed';
}

/** 判断连接是否已禁用 */
export function isDisabled(conn: McpServerConnection): boolean {
  return conn.type === 'disabled';
}
