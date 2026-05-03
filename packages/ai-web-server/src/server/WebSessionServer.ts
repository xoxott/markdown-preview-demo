/**
 * WebSessionServer.ts — Web 会话服务器核心
 *
 * 组合 HTTP REST API + WebSocket 桥接，将 QueryEngine/SDKMessage 管线暴露给 web 客户端。
 *
 * 数据流:
 *
 * 浏览器 WebSocket 连接 → SessionConnection 创建 → user message → QueryEngine.query() → SDKMessage 流 →
 * WebSocket frame 推送 → control_request → PermissionBridge → 权限对话框 → 用户选择 → control_response
 *
 * REST API: POST /sessions → 创建会话 → 返回 sessionId + wsUrl GET /sessions → 列出活跃会话 GET /sessions/:id →
 * 获取会话信息 DELETE /sessions/:id → 停止会话
 */

import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import type { WebServerConfig, WebSessionInfo, WsClientMessage } from '../types/web-server';
import {
  DEFAULT_CORS_ORIGIN,
  DEFAULT_MAX_SESSIONS,
  DEFAULT_WEB_HOST,
  DEFAULT_WEB_PORT
} from '../types/web-server';
import { SessionConnection } from '../ws/SessionConnection';

/** 会话注册条目 */
interface SessionEntry {
  readonly sessionId: string;
  readonly createdAt: number;
  updatedAt: number;
  status: 'starting' | 'running' | 'paused' | 'detached' | 'stopped';
  turnCount: number;
  connection: SessionConnection | null;
}

/**
 * WebSessionServer — HTTP + WebSocket 服务器
 *
 * 每个 WebSocket 连接对应一个 agent session。 REST API 用于 session 管理（创建/查询/停止）。
 */
export class WebSessionServer {
  private readonly config: WebServerConfig;
  private readonly httpServer: Server;
  private readonly wss: WebSocketServer;
  private readonly sessions: Map<string, SessionEntry> = new Map();
  private _started = false;

  constructor(config: WebServerConfig) {
    this.config = config;

    // 创建 HTTP 服务器（REST API + WebSocket upgrade）
    this.httpServer = createServer(this.handleHttpRequest.bind(this));

    // 创建 WebSocket 服务器（挂载在 HTTP 服务器上）
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.wss.on('connection', this.handleWsConnection.bind(this));
  }

  readonly isStarted = (): boolean => this._started;

  /** 获取底层 HTTP 服务器地址信息 */
  getAddress(): { port: number; host: string } {
    const addr = this.httpServer.address();
    if (typeof addr === 'object' && addr !== null) {
      return { port: addr.port, host: addr.address };
    }
    return {
      port: this.config.port ?? DEFAULT_WEB_PORT,
      host: this.config.host ?? DEFAULT_WEB_HOST
    };
  }

  /** 启动服务器 — 监听 HTTP + WebSocket */
  start(): Promise<void> {
    if (this._started) return Promise.resolve();
    const port = this.config.port ?? DEFAULT_WEB_PORT;
    const host = this.config.host ?? DEFAULT_WEB_HOST;
    return new Promise<void>((resolve, reject) => {
      this.httpServer.listen(port, host, () => {
        this._started = true;
        resolve();
      });
      this.httpServer.once('error', reject);
    });
  }

  /** 关闭服务器 */
  async shutdown(): Promise<void> {
    // 关闭所有 WebSocket 连接
    for (const entry of this.sessions.values()) {
      if (entry.connection) {
        entry.connection.close();
      }
    }
    this.sessions.clear();

    // 关闭 WebSocket 服务器
    this.wss.close();

    // 关闭 HTTP 服务器
    await new Promise<void>((resolve, reject) => {
      this.httpServer.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });
    this._started = false;
  }

  /** 获取服务器地址 */
  readonly address = (): string => {
    const addr = this.httpServer.address();
    if (typeof addr === 'object' && addr !== null) {
      return `ws://${addr.address}:${addr.port}`;
    }
    return `ws://localhost:${this.config.port ?? DEFAULT_WEB_PORT}`;
  };

  // === HTTP REST API ===

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const corsOrigin = this.config.corsOrigin ?? DEFAULT_CORS_ORIGIN;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Auth check（如果配置了 authToken）
    if (this.config.authToken) {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${this.config.authToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    // POST /sessions — 创建新会话
    if (url === '/sessions' && method === 'POST') {
      this.handleCreateSession(req, res);
      return;
    }

    // GET /sessions — 列出活跃会话
    if (url === '/sessions' && method === 'GET') {
      this.handleListSessions(req, res);
      return;
    }

    // GET /sessions/:id — 获取会话信息
    const sessionMatch = url.match(/^\/sessions\/([a-zA-Z0-9_-]+)$/);
    if (sessionMatch && method === 'GET') {
      this.handleGetSession(sessionMatch[1], res);
      return;
    }

    // DELETE /sessions/:id — 停止会话
    if (sessionMatch && method === 'DELETE') {
      this.handleStopSession(sessionMatch[1], res);
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private handleCreateSession(_req: IncomingMessage, res: ServerResponse): void {
    if (this.sessions.size >= (this.config.maxSessions ?? DEFAULT_MAX_SESSIONS)) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server at capacity: max sessions reached' }));
      return;
    }

    const sessionId = `web_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const wsUrl = this.address();

    const entry: SessionEntry = {
      sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'starting',
      turnCount: 0,
      connection: null
    };
    this.sessions.set(sessionId, entry);

    const info: WebSessionInfo = {
      sessionId,
      status: 'starting',
      wsUrl,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      turnCount: 0
    };

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info));
  }

  private handleListSessions(_req: IncomingMessage, res: ServerResponse): void {
    const infos: WebSessionInfo[] = Array.from(this.sessions.values()).map(entry => ({
      sessionId: entry.sessionId,
      status: entry.status,
      wsUrl: this.address(),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      turnCount: entry.turnCount
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(infos));
  }

  private handleGetSession(sessionId: string, res: ServerResponse): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }

    const info: WebSessionInfo = {
      sessionId: entry.sessionId,
      status: entry.status,
      wsUrl: this.address(),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      turnCount: entry.turnCount
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info));
  }

  private handleStopSession(sessionId: string, res: ServerResponse): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }

    // 关闭连接并更新状态
    if (entry.connection) {
      entry.connection.close();
    }
    entry.status = 'stopped';
    entry.updatedAt = Date.now();
    this.sessions.delete(sessionId);

    res.writeHead(204);
    res.end();
  }

  // === WebSocket 连接处理 ===

  private handleWsConnection(ws: WebSocket, req: IncomingMessage): void {
    // 从 URL query 或 headers 解析 sessionId
    const url = req.url ?? '/';
    const sessionId = this.extractSessionId(url, req);

    if (!sessionId || !this.sessions.has(sessionId)) {
      // 无 sessionId → 创建新会话
      const newSessionId = `web_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const entry: SessionEntry = {
        sessionId: newSessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'running',
        turnCount: 0,
        connection: null
      };
      this.sessions.set(newSessionId, entry);

      const connection = new SessionConnection(ws, newSessionId, this.config.runtimeConfig);
      entry.connection = connection;

      // 发送 session_info 到客户端
      ws.send(
        JSON.stringify({
          type: 'session_info',
          info: {
            sessionId: newSessionId,
            status: 'running',
            wsUrl: this.address(),
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            turnCount: 0
          }
        })
      );

      ws.on('message', data => {
        try {
          const parsed = JSON.parse(data.toString()) as WsClientMessage;
          connection.handleIncomingMessage(parsed);
          entry.updatedAt = Date.now();
        } catch {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON message' }));
        }
      });

      ws.on('close', () => {
        entry.status = 'detached';
        entry.updatedAt = Date.now();
        entry.connection = null;
      });
      return;
    }

    // 有 sessionId → 关联到已有会话
    const entry = this.sessions.get(sessionId)!;
    const connection = new SessionConnection(ws, sessionId, this.config.runtimeConfig);
    entry.connection = connection;
    entry.status = 'running';
    entry.updatedAt = Date.now();

    // 发送 session_info 到客户端（告知已关联）
    ws.send(
      JSON.stringify({
        type: 'session_info',
        info: {
          sessionId: entry.sessionId,
          status: 'running',
          wsUrl: this.address(),
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          turnCount: entry.turnCount
        }
      })
    );

    ws.on('message', data => {
      try {
        const parsed = JSON.parse(data.toString()) as WsClientMessage;
        connection.handleIncomingMessage(parsed);
        entry.updatedAt = Date.now();
        if (parsed.type === 'user') {
          entry.turnCount++;
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON message' }));
      }
    });

    ws.on('close', () => {
      entry.status = 'detached';
      entry.updatedAt = Date.now();
      entry.connection = null;
    });
  }

  /** 从 URL query 或 headers 提取 sessionId */
  private extractSessionId(url: string, req: IncomingMessage): string | null {
    // 从 URL query: ws://localhost:8765?sessionId=xxx
    const match = url.match(/[?&]sessionId=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    // 从 headers: X-Session-Id
    const headerSessionId = req.headers['x-session-id'];
    if (typeof headerSessionId === 'string') return headerSessionId;

    return null;
  }
}
