/**
 * MCP 工具/服务器名称字符串工具函数
 *
 * 解析和构建 MCP 工具名、命令名、显示名 基于 Claude Code services/mcp/mcpStringUtils.ts 提取
 */

import { normalizeNameForMCP } from './normalization';

/**
 * 从工具名字符串提取 MCP 服务器信息
 *
 * @param toolString 格式: "mcp__serverName__toolName"
 * @returns 服务器名和可选工具名，或 null（如果不是有效的 MCP 工具名）
 *
 *   已知限制：如果服务器名包含 "__"，解析会不正确。 例如 "mcp__my__server__tool" 会解析为 server="my" 和 tool="server__tool"
 */
export function mcpInfoFromString(toolString: string): {
  serverName: string;
  toolName: string | undefined;
} | null {
  const parts = toolString.split('__');
  const [mcpPart, serverName, ...toolNameParts] = parts;
  if (mcpPart !== 'mcp' || !serverName) {
    return null;
  }
  // 合并服务器名之后的所有部分，保留工具名中的双下划线
  const toolName = toolNameParts.length > 0 ? toolNameParts.join('__') : undefined;
  return { serverName, toolName };
}

/**
 * 生成 MCP 工具/命令名前缀
 *
 * @param serverName MCP 服务器名
 * @returns 前缀字符串，如 "mcp__server__"
 */
export function getMcpPrefix(serverName: string): string {
  return `mcp__${normalizeNameForMCP(serverName)}__`;
}

/**
 * 构建完整的 MCP 工具名
 *
 * mcpInfoFromString() 的逆操作
 *
 * @param serverName MCP 服务器名（未规范化）
 * @param toolName 工具名（未规范化）
 * @returns 完整工具名，如 "mcp__server__tool"
 */
export function buildMcpToolName(serverName: string, toolName: string): string {
  return `${getMcpPrefix(serverName)}${normalizeNameForMCP(toolName)}`;
}

/**
 * 从 MCP 工具/命令名获取显示名
 *
 * @param fullName 完整 MCP 工具名，如 "mcp__server_name__tool_name"
 * @param serverName 服务器名（用于去除前缀）
 * @returns 不含 MCP 前缀的显示名
 */
export function getMcpDisplayName(fullName: string, serverName: string): string {
  const prefix = `mcp__${normalizeNameForMCP(serverName)}__`;
  return fullName.replace(prefix, '');
}

/**
 * 从用户面向名提取工具/命令显示名
 *
 * @param userFacingName 用户面向名，如 "github - Add comment to issue (MCP)"
 * @returns 不含服务器前缀和 (MCP) 后缀的显示名
 */
export function extractMcpToolDisplayName(userFacingName: string): string {
  // 移除 (MCP) 后缀
  let withoutSuffix = userFacingName.replace(/\s*\(MCP\)\s*$/, '');
  withoutSuffix = withoutSuffix.trim();

  // 移除服务器前缀（" - " 之前的所有内容）
  const dashIndex = withoutSuffix.indexOf(' - ');
  if (dashIndex !== -1) {
    return withoutSuffix.substring(dashIndex + 3).trim();
  }

  return withoutSuffix;
}

/**
 * 获取用于权限检查的工具名
 *
 * 对于 MCP 工具，使用完整的 mcp__server__tool 名称， 防止 deny 规则（如 "Write"）误匹配同名 MCP 替代工具。
 */
export function getToolNameForPermissionCheck(tool: {
  name: string;
  mcpInfo?: { serverName: string; toolName: string };
}): string {
  return tool.mcpInfo
    ? buildMcpToolName(tool.mcpInfo.serverName, tool.mcpInfo.toolName)
    : tool.name;
}
