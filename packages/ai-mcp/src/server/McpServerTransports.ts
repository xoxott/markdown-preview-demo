/**
 * MCP Server Transport 适配器 — 封装 SDK 的 Stdio/SSE/StreamableHTTP Server Transport
 *
 * 提供统一的服务端传输创建接口，简化宿主使用。
 */

import type { Readable, Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  SSEServerTransport,
  type SSEServerTransportOptions
} from '@modelcontextprotocol/sdk/server/sse.js';
import {
  StreamableHTTPServerTransport,
  type StreamableHTTPServerTransportOptions
} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

/** Stdio Server Transport 创建选项 */
export interface McpStdioServerTransportOptions {
  /** 自定义 stdin（默认 process.stdin） */
  readonly stdin?: Readable;
  /** 自定义 stdout（默认 process.stdout） */
  readonly stdout?: Writable;
}

/** SSE Server Transport 创建选项 */
export interface McpSseServerTransportOptions {
  /** SSE 端点路径（如 /sse） */
  readonly endpoint: string;
  /** HTTP ServerResponse（用于 SSE 连接） */
  readonly response: ServerResponse;
  /** 安全选项 */
  readonly securityOptions?: SSEServerTransportOptions;
}

/** StreamableHTTP Server Transport 创建选项 */
export interface McpStreamableHttpServerTransportOptions {
  /** StreamableHTTP 选项 */
  readonly options?: StreamableHTTPServerTransportOptions;
}

/**
 * 创建 Stdio Server Transport
 *
 * 适用于 CLI 工具模式：通过 stdin/stdout 与客户端通信
 *
 * @param options 自定义 stdin/stdout
 * @returns StdioServerTransport
 */
export function createStdioServerTransport(
  options?: McpStdioServerTransportOptions
): StdioServerTransport {
  return new StdioServerTransport(options?.stdin, options?.stdout);
}

/**
 * 创建 SSE Server Transport
 *
 * 适用于 HTTP 服务器模式：通过 SSE 推送 + POST 接收与客户端通信
 *
 * @deprecated 推荐使用 createStreamableHttpServerTransport（MCP 新标准）
 * @param options SSE 创建选项
 * @returns SSEServerTransport
 */
export function createSseServerTransport(
  options: McpSseServerTransportOptions
): SSEServerTransport {
  return new SSEServerTransport(options.endpoint, options.response, options.securityOptions);
}

/**
 * 创建 StreamableHTTP Server Transport
 *
 * MCP 协议新标准传输方式（替代 SSE）：
 *
 * - POST 请求发送消息
 * - GET SSE stream 接收推送
 * - 会话管理（Mcp-Session-Id header）
 *
 * @param options StreamableHTTP 创建选项
 * @returns StreamableHTTPServerTransport
 */
export function createStreamableHttpServerTransport(
  options?: McpStreamableHttpServerTransportOptions
): StreamableHTTPServerTransport {
  return new StreamableHTTPServerTransport(options?.options);
}

/**
 * 处理 SSE POST 请求 — 将 HTTP POST 消息路由到 SSEServerTransport
 *
 * @param transport SSEServerTransport 实例
 * @param req Node.js IncomingMessage
 * @param res Node.js ServerResponse
 * @param parsedBody 预解析请求体（可选）
 */
export async function handleSsePostMessage(
  transport: SSEServerTransport,
  req: IncomingMessage & { auth?: AuthInfo },
  res: ServerResponse,
  parsedBody?: unknown
): Promise<void> {
  await transport.handlePostMessage(req, res, parsedBody);
}

/**
 * 处理 StreamableHTTP 请求 — 将 HTTP 请求路由到 StreamableHTTPServerTransport
 *
 * @param transport StreamableHTTPServerTransport 实例
 * @param req Node.js IncomingMessage（可含 auth）
 * @param res Node.js ServerResponse
 * @param parsedBody 预解析请求体（可选）
 */
export async function handleStreamableHttpRequest(
  transport: StreamableHTTPServerTransport,
  req: IncomingMessage & { auth?: AuthInfo },
  res: ServerResponse,
  parsedBody?: unknown
): Promise<void> {
  await transport.handleRequest(req, res, parsedBody);
}

/** 从 SSEServerTransport 获取 sessionId */
export function getSseSessionId(transport: SSEServerTransport): string {
  return transport.sessionId;
}

/** 从 StreamableHTTPServerTransport 获取 sessionId */
export function getStreamableHttpSessionId(
  transport: StreamableHTTPServerTransport
): string | undefined {
  return transport.sessionId;
}

/**
 * 创建简化 HTTP Server（Stdio 模式）
 *
 * 创建一个 HTTP Server，通过 Stdio 传输连接 MCP Server Host。 适用于 CLI 工具场景。
 *
 * @param host McpServerHost 实例
 * @returns 已连接的 host
 */
export async function connectStdioServer(
  host: import('./McpServerHost').McpServerHost
): Promise<import('./McpServerHost').McpServerHost> {
  const transport = createStdioServerTransport();
  await host.connect(transport);
  return host;
}
