/**
 * PermissionBridge.ts — 权限请求双向桥接
 *
 * Claude Code 的权限流: agent 内部 canUseTool() → SDKControlPermissionRequest → SDKControlResponse
 *
 * Web 模式: PermissionBridge 将权限请求通过 WebSocket 发送到浏览器， 浏览器渲染权限对话框，用户选择后返回 control_response。 Agent
 * 等待浏览器响应后继续执行。
 *
 * 超时保护: 权限请求默认 30s 超时，超时后自动 deny。
 */

import { WebSocket } from 'ws';
import type { WsClientMessage } from '../types/web-server';

/** pending 权限请求的 Promise 控制器 */
interface PendingRequest {
  resolve: (response: WsClientMessage & { type: 'control_response' }) => void;
  reject: (reason: string) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** 默认权限请求超时（ms） */
const DEFAULT_PERMISSION_TIMEOUT = 30_000;

/**
 * PermissionBridge — WebSocket 权限请求桥接
 *
 * agent侧: requestPermission() → 发到 ws → await Promise 浏览器侧: handleResponse() → resolve Promise →
 * agent继续
 */
export class PermissionBridge {
  private readonly ws: WebSocket;
  private readonly timeout: number;
  private readonly pendingRequests: Map<string, PendingRequest> = new Map();

  constructor(ws: WebSocket, timeout: number = DEFAULT_PERMISSION_TIMEOUT) {
    this.ws = ws;
    this.timeout = timeout;
  }

  /**
   * agent侧: 发出权限请求 → 等待浏览器响应
   *
   * @param requestId 请求 ID
   * @param request 权限请求载荷
   * @returns 浏览器用户的权限响应
   */
  async requestPermission(
    requestId: string,
    request: unknown
  ): Promise<WsClientMessage & { type: 'control_response' }> {
    // 发送权限请求到浏览器
    this.sendToWs({
      type: 'control_request',
      request_id: requestId,
      request
    });

    // 创建 pending Promise
    return new Promise<WsClientMessage & { type: 'control_response' }>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        // 超时 → 自动 deny
        resolve({
          type: 'control_response',
          request_id: requestId,
          success: false,
          error: 'Permission request timed out'
        });
      }, this.timeout);

      this.pendingRequests.set(requestId, { resolve, reject, timer });
    });
  }

  /** 浏览器侧: 收到权限响应 → resolve 对应的 pending Promise */
  handleResponse(message: WsClientMessage & { type: 'control_response' }): void {
    const pending = this.pendingRequests.get(message.request_id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(message.request_id);
      pending.resolve(message);
    }
  }

  /** 浏览器侧: 取消权限请求 → reject pending Promise */
  handleCancel(requestId: string): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(requestId);
      pending.resolve({
        type: 'control_response',
        request_id: requestId,
        success: false,
        error: 'Permission request cancelled'
      });
    }
  }

  /** 关闭连接时 reject 所有 pending 请求 */
  rejectAll(reason: string): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.resolve({
        type: 'control_response',
        request_id: id,
        success: false,
        error: reason
      });
    }
    this.pendingRequests.clear();
  }

  /** 发送消息到 WebSocket */
  private sendToWs(message: unknown): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
