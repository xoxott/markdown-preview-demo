/**
 * MCP ClaudeAI 代理服务器类型
 *
 * 对齐 Claude Code claudeai-proxy 服务器类型:
 *
 * claudeai-proxy 是一种特殊的 MCP 服务器类型，它代理 Claude.ai 上可用的 MCP 服务器，使本地客户端也能访问这些远程资源。
 *
 * 配置格式: { type: 'claudeai-proxy', claudeaiServerId: 'server-id-on-claudeai', scope: 'claudeai' }
 *
 * 注: 这是类型层，代理实现由宿主注入 transport。
 */

import { z } from 'zod/v4';

/** ClaudeAI Proxy 服务器配置 */
export interface McpClaudeAIProxyConfig {
  /** 类型标识 */
  readonly type: 'claudeai-proxy';
  /** Claude.ai 上的服务器 ID */
  readonly claudeaiServerId: string;
  /** 是否自动启用 */
  readonly autoEnable?: boolean;
  /** 自定义名称（覆盖默认） */
  readonly displayName?: string;
}

/** ClaudeAI Proxy Zod Schema */
export const McpClaudeAIProxyConfigSchema = z.object({
  type: z.literal('claudeai-proxy'),
  claudeaiServerId: z.string().min(1, 'Server ID is required'),
  autoEnable: z.boolean().default(true),
  displayName: z.string().optional()
});

/** isClaudeAIProxyConfig — 判断是否为 claudeai-proxy 配置 */
export function isClaudeAIProxyConfig(config: unknown): config is McpClaudeAIProxyConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    (config as Record<string, unknown>).type === 'claudeai-proxy'
  );
}

/**
 * getClaudeAIProxyDisplayName — 获取 claudeai-proxy 显示名称
 *
 * 优先使用 displayName，否则使用 `claudeai-proxy:{claudeaiServerId}`
 */
export function getClaudeAIProxyDisplayName(config: McpClaudeAIProxyConfig): string {
  return config.displayName ?? `claudeai-proxy:${config.claudeaiServerId}`;
}
