/**
 * MCP Auth 工具类型定义
 *
 * 对齐 Claude Code McpAuthTool:
 *
 * McpAuthTool 是一个内置工具，用于处理 MCP 服务器认证。 当 MCP 服务器需要 OAuth 认证时，用户可调用此工具启动认证流程。
 *
 * 功能:
 *
 * 1. 启动 OAuth 认证流程（PKCE）
 * 2. 处理认证回调
 * 3. 刷新过期 token
 * 4. 撤销认证
 */

// ============================================================
// Auth 工具输入/输出类型
// ============================================================

/** McpAuth 工具操作类型 */
// ============================================================
// Zod Schema
// ============================================================

import { z } from 'zod/v4';

export type McpAuthAction = 'authenticate' | 'refresh' | 'revoke' | 'status';

/** McpAuth 工具输入 */
export interface McpAuthInput {
  /** 操作类型 */
  readonly action: McpAuthAction;
  /** MCP 服务器名称 */
  readonly serverName: string;
}

/** McpAuth 认证结果 */
export interface McpAuthOutput {
  /** 操作结果 */
  readonly success: boolean;
  /** 结果描述 */
  readonly message: string;
  /** 认证状态（status 操作时） */
  readonly authState?: McpAuthStatus;
  /** 错误信息（失败时） */
  readonly error?: string;
}

/** MCP 认证状态 */
export interface McpAuthStatus {
  readonly serverName: string;
  readonly isAuthenticated: boolean;
  readonly authMethod?: 'oauth' | 'token' | 'none';
  readonly tokenExpiry?: number;
  readonly scope?: readonly string[];
}

// ============================================================
// McpAuthProvider 接口（宿主注入）
// ============================================================

/** McpAuthProvider — MCP 认证操作宿主注入接口 */
export interface McpAuthProvider {
  /** 启动认证流程 */
  authenticate(serverName: string): Promise<McpAuthOutput>;
  /** 刷新认证 token */
  refresh(serverName: string): Promise<McpAuthOutput>;
  /** 撤销认证 */
  revoke(serverName: string): Promise<McpAuthOutput>;
  /** 查询认证状态 */
  status(serverName: string): Promise<McpAuthStatus>;
}

export const McpAuthActionSchema = z.enum(['authenticate', 'refresh', 'revoke', 'status']);

export const McpAuthInputSchema = z.strictObject({
  action: McpAuthActionSchema,
  serverName: z.string().min(1, 'Server name is required')
});
