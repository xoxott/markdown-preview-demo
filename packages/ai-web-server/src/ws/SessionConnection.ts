/**
 * SessionConnection.ts — 单会话 WebSocket 连接
 *
 * 将 WebSocket 双向通信映射到 QueryEngine/SDKMessage 管线：
 *
 * - 浏览器 → user message → QueryEngine.query() → SDKMessage流 → WebSocket推送
 * - 浏览器 → control_response → PermissionBridge resolve → agent继续执行
 * - 浏览器 → interrupt → QueryEngine.interrupt()
 *
 * 多轮对话：第二条 user message 使用 continueQuery 继续同一会话。
 */

import { WebSocket } from 'ws';
import type { RuntimeConfig, RuntimeSession } from '@suga/ai-runtime';
import { QueryEngine } from '@suga/ai-runtime';
import type { WsClientMessage, WsServerMessage } from '../types/web-server';
import { PermissionBridge } from './PermissionBridge';

/**
 * SessionConnection — 管理 WebSocket → QueryEngine 的桥接
 *
 * 每个 SessionConnection 对应一个 WebSocket 连接和一个 RuntimeSession。 WebSocket 断开时连接关闭，但 RuntimeSession
 * 可保留以支持 reattach。
 */
export class SessionConnection {
  private readonly ws: WebSocket;
  private readonly sessionId: string;
  private readonly runtimeConfig: RuntimeConfig;
  private readonly permissionBridge: PermissionBridge;
  private queryEngine: QueryEngine;
  private session: RuntimeSession | null = null;
  private activeQueryAbort: AbortController | null = null;
  private isQueryRunning = false;

  constructor(ws: WebSocket, sessionId: string, runtimeConfig: RuntimeConfig) {
    this.ws = ws;
    this.sessionId = sessionId;
    this.runtimeConfig = runtimeConfig;
    this.queryEngine = new QueryEngine(runtimeConfig);
    this.permissionBridge = new PermissionBridge(ws);
  }

  /** 处理浏览器发来的消息 */
  handleIncomingMessage(message: WsClientMessage): void {
    switch (message.type) {
      case 'user':
        this.handleUserMessage(message.message);
        break;
      case 'control_response':
        this.permissionBridge.handleResponse(message);
        break;
      case 'control_cancel':
        this.permissionBridge.handleCancel(message.request_id);
        break;
      case 'interrupt':
        this.handleInterrupt();
        break;
      default:
        // 未知消息类型 — 忽略
        break;
    }
  }

  /** 关闭连接 */
  close(): void {
    if (this.activeQueryAbort) {
      this.activeQueryAbort.abort();
    }
    this.permissionBridge.rejectAll('Connection closed');
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CLOSING) {
      this.ws.close();
    }
  }

  // === 内部方法 ===

  /** 处理用户消息 — 启动或继续查询 */
  private handleUserMessage(prompt: string): void {
    if (this.isQueryRunning) {
      this.sendError('Query already running — send interrupt first');
      return;
    }

    if (this.session) {
      // 多轮对话: continueQuery
      this.continueQuery(this.session, prompt);
    } else {
      // 新会话: query
      this.startQuery(prompt);
    }
  }

  /** 启动新查询 */
  private async startQuery(prompt: string): Promise<void> {
    this.isQueryRunning = true;
    this.activeQueryAbort = new AbortController();

    try {
      const sdkStream = this.queryEngine.query(prompt, {
        abort_signal: this.activeQueryAbort.signal
      });

      // 第一条消息创建 session（QueryEngine 内部）
      // 后续消息用 continueQuery
      // 注意: QueryEngine.query() 内部创建 RuntimeSession，但不返回引用
      // 我们需要在外部维护 session 以支持多轮

      for await (const sdkMessage of sdkStream) {
        if (this.ws.readyState !== WebSocket.OPEN) break;
        this.sendWsMessage({ type: 'sdk_message', message: sdkMessage });
      }
    } catch (err) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      this.isQueryRunning = false;
      this.activeQueryAbort = null;
    }
  }

  /** 继续已有会话的查询 */
  private async continueQuery(session: RuntimeSession, prompt: string): Promise<void> {
    this.isQueryRunning = true;
    this.activeQueryAbort = new AbortController();

    try {
      const sdkStream = this.queryEngine.continueQuery(session, prompt, {
        abort_signal: this.activeQueryAbort.signal
      });

      for await (const sdkMessage of sdkStream) {
        if (this.ws.readyState !== WebSocket.OPEN) break;
        this.sendWsMessage({ type: 'sdk_message', message: sdkMessage });
      }
    } catch (err) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      this.isQueryRunning = false;
      this.activeQueryAbort = null;
    }
  }

  /** 中断当前查询 */
  private handleInterrupt(): void {
    if (this.activeQueryAbort) {
      this.activeQueryAbort.abort();
    }
  }

  /** 发送 WebSocket 服务器消息 */
  private sendWsMessage(message: WsServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /** 发送错误消息 */
  private sendError(error: string): void {
    this.sendWsMessage({ type: 'error', error });
  }
}
