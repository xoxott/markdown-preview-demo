/**
 * server.ts — Server/Daemon核心类型定义
 *
 * 定义daemon配置、会话状态机、headless IO接口、生命周期管理类型。
 * 对齐Claude Code server/types.ts的核心结构，但独立设计@suga特有字段。
 */

import { z } from 'zod/v4';

// === Daemon配置 ===

/** Daemon配置 — 进程级启动参数 */
export interface DaemonConfig {
  /** 监听端口（HTTP server模式） */
  readonly port?: number;
  /** 绑定主机 */
  readonly host?: string;
  /** 认证token（自动生成或宿主提供） */
  readonly authToken?: string;
  /** Unix socket路径（替代HTTP端口） */
  readonly unixSocket?: string;
  /** 空闲超时（ms，0=不超时） */
  readonly idleTimeoutMs?: number;
  /** 最大并发会话数 */
  readonly maxSessions?: number;
  /** 工作目录 */
  readonly workspace?: string;
  /** LLM Provider配置（可序列化） */
  readonly providerConfig?: unknown;
  /** 权限模式 */
  readonly permissionMode?: string;
}

/** Daemon默认配置 */
export const DEFAULT_DAEMON_CONFIG: Required<Pick<DaemonConfig, 'port' | 'host' | 'idleTimeoutMs' | 'maxSessions'>> = {
  port: 8765,
  host: 'localhost',
  idleTimeoutMs: 300_000, // 5min
  maxSessions: 10
};

// === 会话状态机 ===

/** Daemon会话生命周期状态 */
export type DaemonSessionState =
  | 'starting'    // 会话正在创建
  | 'running'     // 会话活跃执行中
  | 'paused'      // 会话暂停（等待恢复）
  | 'detached'    // 客户端断开，会话保留
  | 'stopping'    // 正在优雅关闭
  | 'stopped';    // 已完全停止

/** Daemon会话信息 — 会话注册表中的摘要 */
export interface DaemonSessionInfo {
  readonly sessionId: string;
  readonly status: DaemonSessionState;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly workDir?: string;
  readonly lastActiveAt: number;
  readonly turnCount: number;
}

// === Server配置 ===

/** Server连接配置 — 客户端连接到daemon时使用 */
export interface ServerConnectConfig {
  readonly serverUrl: string;
  readonly wsUrl?: string;
  readonly authToken?: string;
  readonly sessionId?: string;
  readonly cwd?: string;
}

/** Server连接响应 — daemon返回给客户端 */
export interface ServerConnectResponse {
  readonly sessionId: string;
  readonly wsUrl: string;
  readonly authToken: string;
  readonly workDir: string;
}

// === IO接口 ===

/** Headless IO接口 — stdin/stdout JSON流通信 */
export interface HeadlessIO {
  /** 读取stdin的下一行JSON消息 */
  readMessage(): Promise<unknown>;
  /** 写入stdout的JSON消息 */
  writeMessage(message: unknown): void;
  /** 写入stderr */
  writeError(error: string): void;
  /** 关闭IO通道 */
  close(): void;
  /** 是否已关闭 */
  readonly closed: boolean;
}

/** Headless IO选项 */
export interface HeadlessIOOptions {
  /** 输入流（默认process.stdin） */
  readonly inputStream?: NodeJS.ReadableStream;
  /** 输出流（默认process.stdout） */
  readonly outputStream?: NodeJS.WritableStream;
  /** 错误流（默认process.stderr） */
  readonly errorStream?: NodeJS.WritableStream;
  /** 输入格式（默认stream-json） */
  readonly inputFormat?: 'stream-json' | 'json';
  /** 输出格式（默认stream-json） */
  readonly outputFormat?: 'stream-json' | 'json' | 'text';
}

// === 生命周期 ===

/** Daemon生命周期事件 */
export type DaemonLifecycleEvent =
  | { type: 'boot'; config: DaemonConfig }
  | { type: 'session_created'; sessionId: string }
  | { type: 'session_destroyed'; sessionId: string }
  | { type: 'idle_timeout'; sessionId: string }
  | { type: 'shutdown'; reason: string }
  | { type: 'error'; error: string; sessionId?: string };

/** Daemon生命周期监听器 */
export type DaemonLifecycleListener = (event: DaemonLifecycleEvent) => void;

/** 优雅关闭选项 */
export interface GracefulShutdownOptions {
  /** 关闭超时（ms，超过后强制退出） */
  readonly timeoutMs?: number;
  /** 是否等待所有session完成 */
  readonly waitForSessions?: boolean;
  /** 关闭原因 */
  readonly reason?: string;
}

// === Server API ===

/** Server API接口 — HTTP/WebSocket端的请求处理 */
export interface ServerApi {
  /** 创建新会话 */
  createSession(cwd?: string, dangerouslySkipPermissions?: boolean): Promise<ServerConnectResponse>;
  /** 获取会话信息 */
  getSession(sessionId: string): Promise<DaemonSessionInfo | null>;
  /** 列出所有活跃会话 */
  listSessions(): Promise<DaemonSessionInfo[]>;
  /** 停止指定会话 */
  stopSession(sessionId: string): Promise<void>;
  /** 停止所有会话 */
  stopAllSessions(): Promise<void>;
}

// === Zod Schema ===

/** Daemon配置schema */
export const DaemonConfigSchema = z.object({
  port: z.number().optional(),
  host: z.string().optional(),
  authToken: z.string().optional(),
  unixSocket: z.string().optional(),
  idleTimeoutMs: z.number().optional(),
  maxSessions: z.number().optional(),
  workspace: z.string().optional(),
  permissionMode: z.string().optional()
});

/** Server连接响应schema */
export const ServerConnectResponseSchema = z.object({
  sessionId: z.string(),
  wsUrl: z.string(),
  authToken: z.string(),
  workDir: z.string()
});