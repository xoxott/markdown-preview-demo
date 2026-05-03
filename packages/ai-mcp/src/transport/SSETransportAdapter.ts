/**
 * SSE Transport Adapter — 将 @modelcontextprotocol/sdk 的 SSEClientTransport 适配为 @suga McpTransport
 *
 * P40: SSE传输用于连接远程 MCP 服务器。通信模式:
 *
 * - 接收: EventSource 长连接（SSE stream）
 * - 发送: HTTP POST 请求
 *
 * 注意: SSEClientTransport 在 MCP SDK v1.12+ 已标记为 @deprecated， 推荐使用
 * StreamableHTTPClientTransport。但大量现有服务器仍使用 SSE， 客户端必须同时支持两种传输以兼容迁移期。
 *
 * 设计原则:
 *
 * - 适配器模式: McpTransport接口 → SDK Transport接口的薄层桥接
 * - 回调桥接: SDK onmessage/onerror/onclose → @suga 对应回调
 * - fetch注入: 支持自定义fetch（宿主用于代理/超时/Auth）
 */

import {
  SSEClientTransport,
  type SSEClientTransportOptions
} from '@modelcontextprotocol/sdk/client/sse.js';
import type { FetchLike } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpSSEServerConfig } from '../types/mcp-config';
import type { McpTransport } from '../types/mcp-transport';

/**
 * SSE Transport Adapter — SDK SSEClientTransport → @suga McpTransport
 *
 * 桥接两层接口:
 *
 * - @suga McpTransport: start/send/close/onmessage(unknown)/onerror/onclose
 * - SDK Transport: start/send(JSONRPCMessage)/close/onmessage(JSONRPCMessage)/onerror/onclose
 *
 * 消息类型转换: unknown ↔ JSONRPCMessage — SDK内部已做JSON-RPC解析，直接传递。
 */
export class SSETransportAdapter implements McpTransport {
  private sdkTransport: SSEClientTransport;

  onmessage?: (message: unknown) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;

  constructor(config: McpSSEServerConfig, fetchOverride?: FetchLike) {
    const url = new URL(config.url);

    const options: SSEClientTransportOptions = {
      requestInit: {
        headers: {
          ...(config.headers ?? {})
        }
      }
    };

    // 自定义fetch注入（宿主用于代理/超时/Auth）
    if (fetchOverride) {
      options.fetch = fetchOverride;
    }

    this.sdkTransport = new SSEClientTransport(url, options);

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
    // SDK的send接受JSONRPCMessage，@suga的send接受unknown
    // 适配器直接传递，SDK内部会做JSON-RPC验证
    return this.sdkTransport.send(message as Parameters<SSEClientTransport['send']>[0]);
  }

  async close(): Promise<void> {
    return this.sdkTransport.close();
  }
}
