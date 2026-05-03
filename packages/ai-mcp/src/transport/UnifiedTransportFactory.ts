/**
 * UnifiedTransportFactory — 统一传输工厂，支持所有7种MCP传输类型
 *
 * P40: 替代 StdioTransportFactory，新增 SSE/HTTP/StreamableHTTP 传输类型。 使用 SDK 的 SSEClientTransport 和
 * StreamableHTTPClientTransport 作为底层传输， 通过 SSETransportAdapter 和 StreamableHTTPTransportAdapter
 * 适配为
 *
 * @suga McpTransport。
 *
 * 支持的传输类型:
 *
 * - stdio → StdioTransport (spawn子进程)
 * - sse → SSETransportAdapter → SDK SSEClientTransport
 * - sse-ide → SSETransportAdapter → SDK SSEClientTransport (IDE模式)
 * - http → StreamableHTTPTransportAdapter → SDK StreamableHTTPClientTransport
 * - sdk → InProcessTransport (进程内链接)
 * - ws → throw unsupported (后续P补全)
 * - ws-ide → throw unsupported (后续P补全)
 */

import type {
  McpHTTPServerConfig,
  McpSSEServerConfig,
  McpServerConfig,
  McpStdioServerConfig
} from '../types/mcp-config';
import type {
  McpTransport,
  McpTransportFactory,
  RemoteTransportOptions
} from '../types/mcp-transport';
import { isStdioConfig } from '../connection/McpConfigLoader';
import { StdioTransport } from '../transport/StdioTransport';
import { createLinkedTransportPair } from '../transport/InProcessTransport';
import { SSETransportAdapter } from '../transport/SSETransportAdapter';
import { StreamableHTTPTransportAdapter } from '../transport/StreamableHTTPTransportAdapter';

/**
 * 统一传输工厂 — 支持 stdio + sse + sse-ide + http + sdk
 *
 * 宿主可通过 InMemoryMcpConnectionManager.setTransportFactory() 注入此工厂。 remoteOptions 支持自定义
 * fetch（用于代理/超时/Auth注入）。
 */
export class UnifiedTransportFactory implements McpTransportFactory {
  constructor(private readonly remoteOptions?: RemoteTransportOptions) {}

  async createTransport(serverName: string, config: McpServerConfig): Promise<McpTransport> {
    // stdio → StdioTransport
    if (isStdioConfig(config)) {
      return new StdioTransport(config as McpStdioServerConfig);
    }

    // sdk → InProcessTransport
    if (config.type === 'sdk') {
      const pair = createLinkedTransportPair();
      return pair.clientTransport;
    }

    // sse → SSETransportAdapter
    if (config.type === 'sse') {
      return new SSETransportAdapter(
        config as McpSSEServerConfig,
        this.remoteOptions?.fetchOverride
      );
    }

    // sse-ide → SSETransportAdapter (IDE模式 — 共用url/headers字段)
    if (config.type === 'sse-ide') {
      // sse-ide config与sse config共享url字段，但type不同
      // SSETransportAdapter接受McpSSEServerConfig，我们需要构造兼容对象
      const sseIdeConfig = config as {
        type: string;
        url: string;
        ideName: string;
        ideRunningInWindows?: boolean;
      };
      const adaptedConfig: McpSSEServerConfig = {
        type: 'sse',
        url: sseIdeConfig.url
      };
      return new SSETransportAdapter(adaptedConfig, this.remoteOptions?.fetchOverride);
    }

    // http → StreamableHTTPTransportAdapter
    if (config.type === 'http') {
      return new StreamableHTTPTransportAdapter(
        config as McpHTTPServerConfig,
        this.remoteOptions?.fetchOverride
      );
    }

    // ws/ws-ide → 后续P补全
    throw new Error(
      `UnifiedTransportFactory: unsupported MCP transport type '${config.type}' for server '${serverName}'. Currently supported: stdio, sse, sse-ide, http, sdk`
    );
  }
}
