/**
 * MCP 配置范围类型
 *
 * 定义 MCP 服务器配置的来源范围，与 ai-tool-core 的 SettingLayer 概念一致 但 MCP 有独立范围（local/managed/claudeai 等）
 */

import { z } from 'zod/v4';
import type { McpServerConfig } from './mcp-config';

/** MCP 配置来源范围 */
export type McpConfigScope =
  | 'local'
  | 'user'
  | 'project'
  | 'dynamic'
  | 'enterprise'
  | 'claudeai'
  | 'managed';

/** MCP 配置范围枚举 Schema */
export const McpConfigScopeSchema = z.enum([
  'local',
  'user',
  'project',
  'dynamic',
  'enterprise',
  'claudeai',
  'managed'
]);

/** 带范围的 MCP 服务器配置 — 联合类型与 scope 的交叉 */
export type ScopedMcpServerConfig = McpServerConfig & {
  /** 配置来源范围 */
  readonly scope: McpConfigScope;
  /** 插件来源标识（如 plugin:slack@anthropic） */
  readonly pluginSource?: string;
};

/** 配置范围优先级（数字越大优先级越高） */
export const MCP_CONFIG_SCOPE_PRIORITY: Record<McpConfigScope, number> = {
  local: 0,
  project: 1,
  user: 2,
  dynamic: 3,
  enterprise: 4,
  managed: 5,
  claudeai: 6
} as const;

/** 获取配置范围优先级 */
export function getMcpScopePriority(scope: McpConfigScope): number {
  return MCP_CONFIG_SCOPE_PRIORITY[scope];
}
