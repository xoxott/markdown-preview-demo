/**
 * MCP 传输工厂 — 按配置类型分派创建传输实例
 *
 * StdioTransportFactory 实现 McpTransportFactory 接口， 根据 McpServerConfig.type 选择对应传输实现：
 *
 * - stdio → StdioTransport
 * - sdk → InProcessTransport (createLinkedTransportPair)
 * - 其他 → throw unsupported error
 */

import type { McpServerConfig, McpStdioServerConfig } from '../types/mcp-config';
import type { McpTransport, McpTransportFactory } from '../types/mcp-transport';
import { isStdioConfig } from '../connection/McpConfigLoader';
import { createLinkedTransportPair } from '../transport/InProcessTransport';
import { StdioTransport } from '../transport/StdioTransport';

/**
 * MCP 传输工厂 — 支持 stdio + sdk 类型
 *
 * 宿主可通过 InMemoryMcpConnectionManager.setTransportFactory() 注入此工厂， 或自行实现 McpTransportFactory
 * 以支持更多传输类型（sse/http/ws）。
 */
export class StdioTransportFactory implements McpTransportFactory {
  async createTransport(serverName: string, config: McpServerConfig): Promise<McpTransport> {
    if (isStdioConfig(config)) {
      return new StdioTransport(config as McpStdioServerConfig);
    }

    if (config.type === 'sdk') {
      const pair = createLinkedTransportPair();
      return pair.clientTransport;
    }

    throw new Error(
      `StdioTransportFactory: unsupported MCP transport type '${config.type}' for server '${serverName}'. Supported types: stdio, sdk`
    );
  }
}
