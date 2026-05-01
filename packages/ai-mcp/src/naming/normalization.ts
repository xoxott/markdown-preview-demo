/**
 * MCP 名称规范化
 *
 * 将服务器名称规范化为 API 兼容格式 ^[a-zA-Z0-9_-]{1,64}$ 替换无效字符（包括点和空格）为下划线
 *
 * 基于 Claude Code services/mcp/normalization.ts 提取
 */

// Claude.ai 服务器名前缀
const CLAUDEAI_SERVER_PREFIX = 'claude.ai ';

/**
 * 规范化服务器名称为 MCP API 兼容格式
 *
 * 替换任何非 [a-zA-Z0-9_-] 字符为下划线。 对于 claude.ai 服务器（名称以 "claude.ai " 开头）， 还会合并连续下划线并去除首尾下划线， 以防止干扰 MCP
 * 工具名中使用的 __ 分隔符。
 */
export function normalizeNameForMCP(name: string): string {
  let normalized = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (name.startsWith(CLAUDEAI_SERVER_PREFIX)) {
    normalized = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '');
  }
  return normalized;
}
