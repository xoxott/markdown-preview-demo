/**
 * G18: initializeAgentMcpServers — 为子代理初始化 agent-scoped MCP 服务器连接
 *
 * 对齐 Claude Code 的 per-agent MCP 机制:
 *
 * 1. 根据 SubagentDefinition.mcpServers 列表创建 agent-scoped 连接
 * 2. 创建 ScopedMcpResourceProvider 过滤到只暴露声明的服务器
 * 3. 在 SubagentSpawner.spawn() 中注入 scoped provider
 *
 * 如果 mcpServers 未声明 → 继承父的全局 McpResourceProvider
 */

import type { McpResourceContent, McpResourceEntry, McpResourceProvider } from '@suga/ai-tools';
import type { SubagentDefinition } from '../types/subagent';

/** Agent-scoped MCP 初始化结果 */
export interface AgentMcpInitResult {
  /** Agent-scoped MCP 资源提供者 */
  readonly scopedProvider: McpResourceProvider;
  /** 可访问的 MCP 服务器列表 */
  readonly accessibleServers: readonly string[];
  /** 是否为 scoped（而非继承全局） */
  readonly isScoped: boolean;
}

/**
 * ScopedMcpResourceProvider — 过滤只暴露指定服务器列表的 MCP 资源
 *
 * 包装全局 McpResourceProvider，在 listResources 和 readResource 中 只允许声明的服务器名称。
 */
export class ScopedMcpResourceProvider implements McpResourceProvider {
  private readonly inner: McpResourceProvider;
  private readonly allowedServers: ReadonlySet<string>;

  constructor(inner: McpResourceProvider, allowedServers: readonly string[]) {
    this.inner = inner;
    this.allowedServers = new Set(allowedServers);
  }

  async listResources(server?: string): Promise<McpResourceEntry[]> {
    if (server && !this.allowedServers.has(server)) {
      return []; // 不允许的服务器 → 返回空列表
    }
    const all = await this.inner.listResources(server);
    // 过滤只返回允许的服务器
    return all.filter(entry => this.allowedServers.has(entry.server));
  }

  async readResource(server: string, uri: string): Promise<McpResourceContent> {
    if (!this.allowedServers.has(server)) {
      throw new Error(`MCP server '${server}' is not accessible for this agent`);
    }
    return this.inner.readResource(server, uri);
  }
}

/**
 * initializeAgentMcpServers — 根据 SubagentDefinition 创建 scoped MCP provider
 *
 * @param definition 子代理定义（含 mcpServers 字段）
 * @param parentProvider 父的全局 McpResourceProvider
 * @returns Agent-scoped 初始化结果
 */
export function initializeAgentMcpServers(
  definition: SubagentDefinition,
  parentProvider: McpResourceProvider
): AgentMcpInitResult {
  const mcpServers = definition.mcpServers;

  // 无 mcpServers → 继承全局 provider
  if (!mcpServers || mcpServers.length === 0) {
    return {
      scopedProvider: parentProvider,
      accessibleServers: [],
      isScoped: false
    };
  }

  // 有 mcpServers → 创建 scoped provider
  const scopedProvider = new ScopedMcpResourceProvider(parentProvider, mcpServers);

  return {
    scopedProvider,
    accessibleServers: mcpServers,
    isScoped: true
  };
}
