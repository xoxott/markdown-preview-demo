/**
 * MCP 连接管理器 — 宿主注入接口 + 内存实现
 *
 * 定义 McpConnectionManager 接口（宿主实现具体连接管理） InMemoryMcpConnectionManager 提供简单内存实现
 */

import type { McpServerConnection } from '../types/mcp-connection';
import type { ScopedMcpServerConfig } from '../types/mcp-scope';
import type { McpTransportFactory } from '../types/mcp-transport';
import type { McpElicitationHandler } from '../types/mcp-elicitation';
import type { McpServerCapabilities, McpServerInfo } from '../types/mcp-registry';

/** MCP 连接管理器接口 — 宿主注入 */
export interface McpConnectionManager {
  /** 获取所有服务器连接状态 */
  getConnections(): ReadonlyMap<string, McpServerConnection>;

  /** 连接一个 MCP 服务器 */
  connect(serverName: string, config: ScopedMcpServerConfig): Promise<void>;

  /** 断开一个 MCP 服务器 */
  disconnect(serverName: string): Promise<void>;

  /** 重连失败的服务器 */
  reconnect(serverName: string): Promise<void>;

  /** 标记需要认证 */
  markNeedsAuth(serverName: string): void;

  /** 标记认证完成，尝试重新连接 */
  markAuthComplete(serverName: string): Promise<void>;

  /** 设置传输工厂（依赖注入） */
  setTransportFactory(factory: McpTransportFactory): void;

  /** 设置 Elicitation 处理器（依赖注入） */
  setElicitationHandler(handler: McpElicitationHandler): void;

  /** 监听连接状态变化 */
  onConnectionChange(
    handler: (connections: ReadonlyMap<string, McpServerConnection>) => void
  ): () => void;
}

/** InMemoryMcpConnectionManager — 简单内存实现 */
export class InMemoryMcpConnectionManager implements McpConnectionManager {
  private connections = new Map<string, McpServerConnection>();
  private transportFactory?: McpTransportFactory;
  private elicitationHandler?: McpElicitationHandler;
  private changeHandlers = new Set<
    (connections: ReadonlyMap<string, McpServerConnection>) => void
  >();

  getConnections(): ReadonlyMap<string, McpServerConnection> {
    return this.connections;
  }

  async connect(serverName: string, config: ScopedMcpServerConfig): Promise<void> {
    // 先设为 pending
    this.setConnection(serverName, {
      type: 'pending',
      name: serverName,
      config
    });

    if (!this.transportFactory) {
      // 无传输工厂 → 保持 pending（宿主未注入）
      return;
    }

    try {
      await this.transportFactory.createTransport(serverName, config);
      // 连接成功 → 设为 connected（使用空能力，宿主负责填充）
      this.setConnection(serverName, {
        type: 'connected',
        name: serverName,
        config,
        capabilities: {}
      });
    } catch (error) {
      this.setConnection(serverName, {
        type: 'failed',
        name: serverName,
        config,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async disconnect(serverName: string): Promise<void> {
    this.connections.delete(serverName);
    this.notifyChangeHandlers();
  }

  async reconnect(serverName: string): Promise<void> {
    const current = this.connections.get(serverName);
    if (!current || current.type !== 'failed') {
      return;
    }
    await this.connect(serverName, current.config);
  }

  markNeedsAuth(serverName: string): void {
    const current = this.connections.get(serverName);
    if (!current) return;
    this.setConnection(serverName, {
      type: 'needs-auth',
      name: serverName,
      config: current.config
    });
  }

  async markAuthComplete(serverName: string): Promise<void> {
    const current = this.connections.get(serverName);
    if (!current || current.type !== 'needs-auth') return;
    await this.connect(serverName, current.config);
  }

  setTransportFactory(factory: McpTransportFactory): void {
    this.transportFactory = factory;
  }

  setElicitationHandler(handler: McpElicitationHandler): void {
    this.elicitationHandler = handler;
  }

  onConnectionChange(
    handler: (connections: ReadonlyMap<string, McpServerConnection>) => void
  ): () => void {
    this.changeHandlers.add(handler);
    return () => {
      this.changeHandlers.delete(handler);
    };
  }

  /** 获取 ElicitationHandler（内部使用） */
  getElicitationHandler(): McpElicitationHandler | undefined {
    return this.elicitationHandler;
  }

  /** 更新服务器能力（宿主调用） */
  updateCapabilities(
    serverName: string,
    capabilities: McpServerCapabilities,
    serverInfo?: McpServerInfo,
    instructions?: string
  ): void {
    const current = this.connections.get(serverName);
    if (!current || current.type !== 'connected') return;
    this.setConnection(serverName, {
      ...current,
      capabilities,
      serverInfo,
      instructions
    });
  }

  private setConnection(serverName: string, conn: McpServerConnection): void {
    this.connections.set(serverName, conn);
    this.notifyChangeHandlers();
  }

  private notifyChangeHandlers(): void {
    const snapshot = new Map(this.connections);
    for (const handler of this.changeHandlers) {
      handler(snapshot);
    }
  }
}
