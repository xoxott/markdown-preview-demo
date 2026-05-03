/**
 * StreamableHTTP Transport Adapter — 将 @modelcontextprotocol/sdk 的 StreamableHTTPClientTransport
 * 适配为 @suga McpTransport
 *
 * P40: StreamableHTTP传输是MCP协议的新标准传输方式（替代SSE）。通信模式:
 *
 * - 发送: HTTP POST 请求（JSON-RPC message body）
 * - 接收: HTTP GET SSE stream（长连接接收服务器推送）或 POST response body
 * - 会话管理: Mcp-Session-Id header
 * - 重连: 支持 resumption token + backoff reconnection
 *
 * 设计原则:
 *
 * - 适配器模式: 与 SSETransportAdapter 一致的薄层桥接
 * - 会话管理: sessionId getter + terminateSession() 方法
 * - 重连策略: 默认 exponential backoff (1s→30s, factor 1.5, max 2 retries)
 */

import {
  StreamableHTTPClientTransport,
  type StreamableHTTPClientTransportOptions,
  type StreamableHTTPReconnectionOptions
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { FetchLike } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpHTTPServerConfig } from '../types/mcp-config';
import type { McpTransport } from '../types/mcp-transport';

/** 默认重连策略 */
const DEFAULT_RECONNECTION_OPTIONS: StreamableHTTPReconnectionOptions = {
  maxReconnectionDelay: 30000,
  initialReconnectionDelay: 1000,
  reconnectionDelayGrowFactor: 1.5,
  maxRetries: 2
};

/**
 * StreamableHTTP Transport Adapter — SDK StreamableHTTPClientTransport → @suga McpTransport
 *
 * 与 SSETransportAdapter 类似，但额外支持:
 *
 * - sessionId 管理
 * - terminateSession() (HTTP DELETE终止会话)
 * - reconnectionOptions (exponential backoff)
 */
export class StreamableHTTPTransportAdapter implements McpTransport {
  private sdkTransport: StreamableHTTPClientTransport;

  onmessage?: (message: unknown) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;

  constructor(config: McpHTTPServerConfig, fetchOverride?: FetchLike) {
    const url = new URL(config.url);

    const options: StreamableHTTPClientTransportOptions = {
      requestInit: {
        headers: {
          ...(config.headers ?? {})
        }
      },
      reconnectionOptions: DEFAULT_RECONNECTION_OPTIONS
    };

    // 自定义fetch注入
    if (fetchOverride) {
      options.fetch = fetchOverride;
    }

    this.sdkTransport = new StreamableHTTPClientTransport(url, options);

    // 桥接回调 — SDK → @suga
    this.sdkTransport.onmessage = msg => {
      this.onmessage?.(msg);
    };

    this.sdkTransport.onerror = err => {
      this.onerror?.(err);
    };

    this.sdkTransport.onclose = () => {
      this.onclose?.();
    };
  }

  async start(): Promise<void> {
    return this.sdkTransport.start();
  }

  async send(message: unknown): Promise<void> {
    return this.sdkTransport.send(message as Parameters<StreamableHTTPClientTransport['send']>[0]);
  }

  async close(): Promise<void> {
    return this.sdkTransport.close();
  }

  /** 获取当前会话ID */
  get sessionId(): string | undefined {
    return this.sdkTransport.sessionId;
  }

  /**
   * 终止当前会话 — 发送 HTTP DELETE 到服务器
   *
   * 客户端不再需要某会话时应发送 DELETE 以显式终止。 服务器可能返回 405 (不支持会话终止)。
   */
  async terminateSession(): Promise<void> {
    return this.sdkTransport.terminateSession();
  }
}
