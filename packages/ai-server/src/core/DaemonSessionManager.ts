/**
 * DaemonSessionManager.ts — Daemon级会话管理器
 *
 * 基于ai-agent-session的SessionManager扩展，增加：
 *
 * 1. 并发控制（maxSessions限制）
 * 2. 空闲超时清理
 * 3. 会话状态跟踪（DaemonSessionState状态机）
 * 4. 优雅关闭时批量停止所有会话
 */

import type { DaemonConfig, DaemonSessionInfo, DaemonSessionState } from '../types/server';
import { DaemonLifecycle } from './DaemonLifecycle';

/** 会话注册条目 — 内部使用的完整会话记录 */
interface SessionEntry {
  sessionId: string;
  state: DaemonSessionState;
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
  turnCount: number;
  workDir?: string;
  /** 空闲检测计时器 */
  idleTimer?: ReturnType<typeof setTimeout>;
  /** 会话数据的引用（可序列化） */
  sessionData?: unknown;
}

/**
 * DaemonSessionManager — Daemon级会话管理器
 *
 * 不直接依赖ai-agent-session的Session类（因为daemon可能在子进程中运行）， 而是管理"会话注册表" — 记录会话ID/状态/元数据。
 * 实际的Agent执行通过宿主注入的executeSession回调完成。
 */
export class DaemonSessionManager {
  private readonly sessions = new Map<string, SessionEntry>();
  private readonly lifecycle: DaemonLifecycle;

  constructor(
    private readonly config: DaemonConfig,
    lifecycle?: DaemonLifecycle
  ) {
    this.lifecycle = lifecycle ?? new DaemonLifecycle(config);
  }

  /** 当前活跃会话数 */
  readonly activeCount = (): number => {
    let count = 0;
    for (const entry of this.sessions.values()) {
      if (entry.state === 'running' || entry.state === 'starting') count++;
    }
    return count;
  };

  /** 总会话数（含paused/detached） */
  readonly totalCount = (): number => this.sessions.size;

  /** 是否达到最大并发限制 */
  readonly isAtCapacity = (): boolean => {
    const maxSessions = this.config.maxSessions ?? 10;
    return this.activeCount() >= maxSessions;
  };

  /** 注册新会话 — 创建entry并设置空闲计时器 */
  registerSession(sessionId: string, workDir?: string): DaemonSessionInfo {
    const now = Date.now();
    const entry: SessionEntry = {
      sessionId,
      state: 'starting',
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      turnCount: 0,
      workDir
    };

    this.sessions.set(sessionId, entry);
    this.startIdleTimer(sessionId);
    this.lifecycle.emit({ type: 'session_created', sessionId });

    return this.toInfo(entry);
  }

  /** 更新会话状态 */
  updateSessionState(sessionId: string, newState: DaemonSessionState): DaemonSessionInfo | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;

    entry.state = newState;
    entry.updatedAt = Date.now();

    // running状态更新lastActiveAt
    if (newState === 'running') {
      entry.lastActiveAt = Date.now();
      this.restartIdleTimer(sessionId);
    }

    // stopped状态 → 清理计时器
    if (newState === 'stopped') {
      this.clearIdleTimer(sessionId);
    }

    return this.toInfo(entry);
  }

  /** 增加会话轮次计数 */
  incrementTurnCount(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;
    entry.turnCount++;
    entry.lastActiveAt = Date.now();
    entry.updatedAt = Date.now();
    this.restartIdleTimer(sessionId);
  }

  /** 移除会话 — 从注册表中删除 */
  removeSession(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;

    this.clearIdleTimer(sessionId);
    this.sessions.delete(sessionId);
    this.lifecycle.emit({ type: 'session_destroyed', sessionId });
  }

  /** 获取会话信息 */
  getSession(sessionId: string): DaemonSessionInfo | null {
    const entry = this.sessions.get(sessionId);
    return entry ? this.toInfo(entry) : null;
  }

  /** 列出所有会话 */
  listSessions(): DaemonSessionInfo[] {
    return Array.from(this.sessions.values()).map(e => this.toInfo(e));
  }

  /** 停止指定会话 */
  async stopSession(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;

    entry.state = 'stopping';
    entry.updatedAt = Date.now();

    // 标记为stopped（实际Agent停止由宿主处理）
    entry.state = 'stopped';
    this.clearIdleTimer(sessionId);
    this.sessions.delete(sessionId);
    this.lifecycle.emit({ type: 'session_destroyed', sessionId });
  }

  /** 停止所有会话 */
  async stopAllSessions(): Promise<void> {
    const ids = Array.from(this.sessions.keys());
    for (const id of ids) {
      await this.stopSession(id);
    }
  }

  /** 优雅关闭 — 停止所有会话并发出shutdown事件 */
  async gracefulShutdown(reason: string): Promise<void> {
    await this.stopAllSessions();
    this.lifecycle.emit({ type: 'shutdown', reason });
  }

  // === 空闲超时管理 ===

  /** 启动空闲计时器 */
  private startIdleTimer(sessionId: string): void {
    const idleTimeoutMs = this.config.idleTimeoutMs ?? 300_000;
    if (idleTimeoutMs === 0) return; // 不超时

    const entry = this.sessions.get(sessionId);
    if (!entry) return;

    this.clearIdleTimer(sessionId);
    entry.idleTimer = setTimeout(() => {
      this.lifecycle.emit({ type: 'idle_timeout', sessionId });
      entry.state = 'detached';
      entry.updatedAt = Date.now();
    }, idleTimeoutMs);

    // 不阻止进程退出
    entry.idleTimer.unref();
  }

  /** 重启空闲计时器 */
  private restartIdleTimer(sessionId: string): void {
    this.startIdleTimer(sessionId);
  }

  /** 清除空闲计时器 */
  private clearIdleTimer(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry?.idleTimer) return;
    clearTimeout(entry.idleTimer);
    entry.idleTimer = undefined;
  }

  /** 转换为DaemonSessionInfo */
  private toInfo(entry: SessionEntry): DaemonSessionInfo {
    return {
      sessionId: entry.sessionId,
      status: entry.state,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      workDir: entry.workDir,
      lastActiveAt: entry.lastActiveAt,
      turnCount: entry.turnCount
    };
  }
}
