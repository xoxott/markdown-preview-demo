/**
 * DaemonServer.ts — Daemon主入口
 *
 * 组合DaemonLifecycle + DaemonSessionManager + HeadlessIO， 提供完整的daemon运行能力。
 */

import type {
  DaemonConfig,
  DaemonSessionInfo,
  ServerApi,
  ServerConnectResponse
} from '../types/server';
import { DaemonLifecycle } from '../core/DaemonLifecycle';
import { DaemonSessionManager } from '../core/DaemonSessionManager';
import { NodeHeadlessIO } from '../io/HeadlessIO';

/**
 * DaemonServer — 完整的daemon服务
 *
 * 使用方式：
 *
 * ```ts
 * const daemon = new DaemonServer({ maxSessions: 5 });
 * daemon.start(); // 注册信号处理器
 * // 通过daemon.sessionManager管理会话
 * // 通过daemon.headlessIO读写消息
 * ```
 */
export class DaemonServer implements ServerApi {
  readonly lifecycle: DaemonLifecycle;
  readonly sessionManager: DaemonSessionManager;
  readonly headlessIO: NodeHeadlessIO;
  private _started = false;

  constructor(config: DaemonConfig) {
    this.lifecycle = new DaemonLifecycle(config);
    this.sessionManager = new DaemonSessionManager(config, this.lifecycle);
    this.headlessIO = new NodeHeadlessIO();

    // 生命周期事件转发到session管理
    this.lifecycle.addListener(event => {
      if (event.type === 'idle_timeout') {
        // 空闲超时 → 自动detach会话
        this.sessionManager.updateSessionState(event.sessionId, 'detached');
      }
    });
  }

  readonly isStarted = (): boolean => this._started;

  /** 启动daemon — boot lifecycle */
  start(): void {
    if (this._started) return;
    this._started = true;
    this.lifecycle.boot();
  }

  /** 优雅关闭daemon */
  async shutdown(reason: string = 'User initiated shutdown'): Promise<void> {
    await this.sessionManager.gracefulShutdown(reason);
    await this.lifecycle.initiateShutdown(reason);
    this.headlessIO.close();
    this._started = false;
  }

  // === ServerApi 实现 ===

  async createSession(
    _cwd?: string,
    _dangerouslySkipPermissions?: boolean
  ): Promise<ServerConnectResponse> {
    if (this.sessionManager.isAtCapacity()) {
      throw new Error('Daemon at capacity: max sessions reached');
    }

    const sessionId = `daemon_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const info = this.sessionManager.registerSession(sessionId, _cwd);
    this.sessionManager.updateSessionState(sessionId, 'running');

    return {
      sessionId: info.sessionId,
      wsUrl: `ws://localhost:${this.lifecycle.config.port ?? 8765}`,
      authToken: this.lifecycle.config.authToken ?? '',
      workDir: _cwd ?? process.cwd()
    };
  }

  async getSession(sessionId: string): Promise<DaemonSessionInfo | null> {
    return this.sessionManager.getSession(sessionId);
  }

  async listSessions(): Promise<DaemonSessionInfo[]> {
    return this.sessionManager.listSessions();
  }

  async stopSession(sessionId: string): Promise<void> {
    await this.sessionManager.stopSession(sessionId);
  }

  async stopAllSessions(): Promise<void> {
    await this.sessionManager.stopAllSessions();
  }
}
