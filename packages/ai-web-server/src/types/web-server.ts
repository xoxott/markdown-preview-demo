/**
 * web-server.ts — Web Session Server 类型定义
 *
 * 定义 HTTP API 和 WebSocket 桥接的类型。 与 ai-server 的 DaemonConfig/ServerApi 对齐，但面向 web 网络。
 */

import type { RuntimeConfig } from '@suga/ai-runtime';

/** Web 服务器配置 */
export interface WebServerConfig {
  /** HTTP/WebSocket 端口（默认 8765） */
  readonly port?: number;
  /** 绑定主机（默认 'localhost'） */
  readonly host?: string;
  /** 认证 token（可选，用于 WebSocket handshake 验证） */
  readonly authToken?: string;
  /** CORS 允许来源（默认 '*'） */
  readonly corsOrigin?: string;
  /** 最大并发会话数（默认 10） */
  readonly maxSessions?: number;
  /** 空闲超时毫秒（默认 300000 = 5min） */
  readonly idleTimeoutMs?: number;
  /** RuntimeConfig — 创建 QueryEngine/RuntimeSession 所需配置 */
  readonly runtimeConfig: RuntimeConfig;
}

/** Web 会话信息（REST API 返回） */
export interface WebSessionInfo {
  readonly sessionId: string;
  readonly status: 'starting' | 'running' | 'paused' | 'detached' | 'stopped';
  readonly wsUrl: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly turnCount: number;
}

/** WebSocket 客户端→服务器消息类型 */
export type WsClientMessage =
  | { readonly type: 'user'; readonly message: string }
  | { readonly type: 'control_request'; readonly request_id: string; readonly request: unknown }
  | {
      readonly type: 'control_response';
      readonly request_id: string;
      readonly success: boolean;
      readonly response?: unknown;
      readonly error?: string;
    }
  | { readonly type: 'control_cancel'; readonly request_id: string }
  | { readonly type: 'interrupt' };

/** WebSocket 服务器→客户端消息类型 */
export type WsServerMessage =
  | { readonly type: 'sdk_message'; readonly message: unknown }
  | { readonly type: 'control_request'; readonly request_id: string; readonly request: unknown }
  | { readonly type: 'session_info'; readonly info: WebSessionInfo }
  | { readonly type: 'error'; readonly error: string };

/** 默认配置值 */
export const DEFAULT_WEB_PORT = 8765;
export const DEFAULT_WEB_HOST = 'localhost';
export const DEFAULT_CORS_ORIGIN = '*';
export const DEFAULT_MAX_SESSIONS = 10;
export const DEFAULT_IDLE_TIMEOUT_MS = 300_000;
