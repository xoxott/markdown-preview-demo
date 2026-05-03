/**
 * MCP 传输接口抽象
 *
 * 定义 McpTransport 接口（宿主实现具体传输）， 传输工厂接口（依赖注入），SDK 控制回调类型
 */

import type { McpServerConfig } from './mcp-config';

/** MCP 传输接口 — 宿主实现具体传输 */
export interface McpTransport {
  /** 启动传输 */
  start(): Promise<void>;
  /** 发送消息 */
  send(message: unknown): Promise<void>;
  /** 关闭传输 */
  close(): Promise<void>;
  /** 消息接收回调 */
  onmessage?: (message: unknown) => void;
  /** 错误回调 */
  onerror?: (error: Error) => void;
  /** 关闭回调 */
  onclose?: () => void;
}

/** 传输配置到传输实例的工厂接口 — 宿主注入 */
export interface McpTransportFactory {
  /** 为指定服务器创建传输实例 */
  createTransport(serverName: string, config: McpServerConfig): Promise<McpTransport>;
}

/** P40: 远程传输选项 — SSE/HTTP传输的自定义配置 */
export interface RemoteTransportOptions {
  /** 自定义fetch实现（可选，宿主注入用于代理/超时/Auth） */
  readonly fetchOverride?: (url: string | URL, init?: RequestInit) => Promise<Response>;
}

/** SDK 控制传输回调类型 — CLI进程↔SDK进程间通信 */
export type SdkControlMessageCallback = (serverName: string, message: unknown) => Promise<unknown>;

/** 链接传输对结果 — 进程内客户端↔服务器通信 */
export interface LinkedTransportPair {
  readonly clientTransport: McpTransport;
  readonly serverTransport: McpTransport;
}

/** SDK 控制传输 — CLI侧 */
export interface SdkControlClientTransportOptions {
  readonly serverName: string;
  readonly sendMcpMessage: SdkControlMessageCallback;
}

/** SDK 控制传输 — SDK侧 */
export interface SdkControlServerTransportOptions {
  readonly sendMcpMessage: (message: unknown) => void;
}
