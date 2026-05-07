/**
 * MCP utils — 工具/Server 名称过滤、路径计算等通用辅助函数
 *
 * 对齐 CC services/mcp/utils.ts 的纯函数部分（不含 React/UI/全局 state 依赖）。
 */

import { normalizeNameForMCP } from '../naming/normalization';

// ============================================================
// 工具过滤
// ============================================================

/**
 * 过滤 — 仅保留属于指定 MCP server 的工具
 *
 * MCP 工具命名约定：mcp__<normalized-server>__<tool>
 */
export function filterToolsByServer<T extends { name?: string }>(
  tools: readonly T[],
  serverName: string
): T[] {
  const prefix = `mcp__${normalizeNameForMCP(serverName)}__`;
  return tools.filter(tool => typeof tool.name === 'string' && tool.name.startsWith(prefix));
}

/**
 * 判断 command 是否属于指定 MCP server
 *
 * - MCP **prompt** 命名：`mcp__<server>__<prompt>`（线协议约束）
 * - MCP **skill** 命名：`<server>:<skill>`（与 plugin/嵌套目录 skill 命名一致）
 *
 * 二者都存在 mcp.commands 中，所以 cleanup/filter 必须同时匹配两种形式。
 */
export function commandBelongsToServer(command: { name?: string }, serverName: string): boolean {
  const normalized = normalizeNameForMCP(serverName);
  const name = command.name;
  if (!name) return false;
  return name.startsWith(`mcp__${normalized}__`) || name.startsWith(`${normalized}:`);
}

// ============================================================
// 配置 hash（用于变更检测）
// ============================================================

/**
 * 计算 MCP server 配置的稳定 hash（基于排序的 JSON 字符串）
 *
 * 用于检测配置变更 — 如配置不变可跳过重连接。
 */
export function hashMcpServerConfig(config: unknown): string {
  const stable = stableStringify(config);
  return simpleHash(stable);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/** djb2 算法（32-bit 输出，hex 编码） */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ============================================================
// Resource URI 解析
// ============================================================

export interface ParsedMcpResourceUri {
  readonly serverName: string;
  readonly resourcePath: string;
}

/**
 * 解析 MCP 资源 URI（格式：`mcp://<server>/<resource-path>`）
 *
 * @returns 解析结果，无效时返回 null
 */
export function parseMcpResourceUri(uri: string): ParsedMcpResourceUri | null {
  if (!uri.startsWith('mcp://')) return null;
  const rest = uri.slice('mcp://'.length);
  const slashIdx = rest.indexOf('/');
  if (slashIdx === -1) {
    return { serverName: rest, resourcePath: '' };
  }
  return {
    serverName: rest.slice(0, slashIdx),
    resourcePath: rest.slice(slashIdx + 1)
  };
}

/** 构造 MCP 资源 URI */
export function buildMcpResourceUri(serverName: string, resourcePath: string): string {
  const normalized = normalizeNameForMCP(serverName);
  const path = resourcePath.startsWith('/') ? resourcePath.slice(1) : resourcePath;
  return `mcp://${normalized}${path ? `/${path}` : ''}`;
}

// ============================================================
// Server 名称去重
// ============================================================

/**
 * 在多个 scope（user/project/local/enterprise）的 MCP server 列表中合并 + 去重
 *
 * @param scopes 按优先级倒序排列（后面的覆盖前面的）
 * @returns 合并后的扁平 server 列表
 */
export function mergeServersByScope<T extends { name: string }>(
  scopes: readonly (readonly T[])[]
): T[] {
  const merged = new Map<string, T>();
  for (const scope of scopes) {
    for (const server of scope) {
      merged.set(server.name, server);
    }
  }
  return [...merged.values()];
}
