/**
 * 进程内链接传输对
 *
 * InProcessTransport 实现同一进程内 MCP 客户端↔服务器通信， 不需要 spawn 子进程。send() 的消息通过 queueMicrotask 传递到 peer 的
 * onmessage。
 *
 * 基于 Claude Code services/mcp/InProcessTransport.ts 提取
 */

import type { LinkedTransportPair, McpTransport } from '../types/mcp-transport';

class InProcessTransport implements McpTransport {
  private peer: InProcessTransport | undefined;
  private closed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: unknown) => void;

  /** @internal 设置对端传输 */
  _setPeer(peer: InProcessTransport): void {
    this.peer = peer;
  }

  async start(): Promise<void> {
    // 进程内传输无需启动
  }

  async send(message: unknown): Promise<void> {
    if (this.closed) {
      throw new Error('Transport is closed');
    }
    // 异步传递到对端，避免同步请求/响应的栈深度问题
    queueMicrotask(() => {
      this.peer?.onmessage?.(message);
    });
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.onclose?.();
    // 关闭对端（如果对端尚未关闭）
    if (this.peer && !this.peer.closed) {
      this.peer.closed = true;
      this.peer.onclose?.();
    }
  }
}

/**
 * 创建链接传输对 — 进程内 MCP 客户端↔服务器通信
 *
 * 消息在一端的 send() 传递到另一端的 onmessage。 任一端 close() 会触发两端的 onclose。
 *
 * @returns {undefined} clientTransport, serverTransport
 */
export function createLinkedTransportPair(): LinkedTransportPair {
  const a = new InProcessTransport();
  const b = new InProcessTransport();
  a._setPeer(b);
  b._setPeer(a);
  return { clientTransport: a, serverTransport: b };
}

export { InProcessTransport };
