/**
 * DaemonLifecycle.ts — 进程级生命周期管理
 *
 * 处理daemon启动、信号处理、优雅关闭。 对齐Claude Code daemon/main.ts + cli.tsx的信号处理逻辑。
 */

import type {
  DaemonConfig,
  DaemonHealthCheck,
  DaemonLifecycleEvent,
  DaemonLifecycleListener,
  GracefulShutdownOptions,
  HeartbeatConfig
} from '../types/server';

/** 进程信号常量 */
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

/**
 * DaemonLifecycle — 进程级生命周期管理器
 *
 * 负责：
 *
 * 1. 启动时初始化（注册信号处理器）
 * 2. 信号处理（SIGINT/SIGTERM触发优雅关闭）
 * 3. 优雅关闭流程（超时保护）
 * 4. 生命周期事件通知
 */
export class DaemonLifecycle {
  private readonly listeners: DaemonLifecycleListener[] = [];
  private readonly signalHandlers: Map<string, () => void> = new Map();
  private _isShuttingDown = false;
  private _isBooted = false;
  private _bootedAt: number | null = null;
  private _lastHeartbeatAt: number | null = null;
  private heartbeatTimer?: ReturnType<typeof setTimeout>;
  private readonly heartbeatConfig: HeartbeatConfig;
  /** 外部注入的活跃会话计数函数 */
  private getActiveSessionCount?: () => number;
  private getTotalSessionCount?: () => number;

  constructor(
    readonly config: DaemonConfig,
    options?: {
      heartbeat?: HeartbeatConfig;
      getActiveSessionCount?: () => number;
      getTotalSessionCount?: () => number;
    }
  ) {
    this.heartbeatConfig = options?.heartbeat ?? { enabled: true, intervalMs: 30_000 };
    this.getActiveSessionCount = options?.getActiveSessionCount;
    this.getTotalSessionCount = options?.getTotalSessionCount;
  }

  /** 是否已启动 */
  readonly isBooted = (): boolean => this._isBooted;

  /** 是否正在关闭 */
  readonly isShuttingDown = (): boolean => this._isShuttingDown;

  /** 启动daemon — 注册信号处理器，发出boot事件 */
  boot(): void {
    if (this._isBooted) return;
    this._isBooted = true;
    this._bootedAt = Date.now();

    // 注册信号处理器
    for (const signal of SHUTDOWN_SIGNALS) {
      const handler = () => this.initiateShutdown(`Received ${signal}`);
      this.signalHandlers.set(signal, handler);
      process.on(signal, handler);
    }

    // 防止进程被意外退出
    process.on('exit', () => {
      if (!this._isShuttingDown) {
        this.emit({ type: 'shutdown', reason: 'process.exit called unexpectedly' });
      }
    });

    // 启动心跳定时器
    if (this.heartbeatConfig.enabled !== false) {
      this.startHeartbeat();
    }

    this.emit({ type: 'boot', config: this.config });
  }

  /** 添加生命周期监听器 */
  addListener(listener: DaemonLifecycleListener): void {
    this.listeners.push(listener);
  }

  /** 移除生命周期监听器 */
  removeListener(listener: DaemonLifecycleListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx >= 0) this.listeners.splice(idx, 1);
  }

  /** 发起优雅关闭 */
  async initiateShutdown(reason: string, options?: GracefulShutdownOptions): Promise<void> {
    if (this._isShuttingDown) return;
    this._isShuttingDown = true;

    const timeoutMs = options?.timeoutMs ?? 10_000;
    const waitForSessions = options?.waitForSessions ?? false;

    this.emit({ type: 'shutdown', reason });

    // 解除信号处理器（防止重复触发）
    for (const [signal, handler] of this.signalHandlers) {
      process.removeListener(signal, handler);
    }
    this.signalHandlers.clear();

    // 超时保护 — 强制退出
    const forceExitTimer = setTimeout(() => {
      process.exit(1);
    }, timeoutMs);

    // 不阻止进程退出
    forceExitTimer.unref();

    if (waitForSessions && options?.getActiveSessionCount) {
      // 轮询等待所有 session 关闭
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        const count = await options.getActiveSessionCount();
        if (count === 0) {
          clearTimeout(forceExitTimer);
          this.emit({ type: 'shutdown_complete', reason });
          return;
        }
        // 等待200ms再检查
        await new Promise<void>(resolve => {
          setTimeout(resolve, 200);
        });
      }
      // 超时 — 由 forceExitTimer 处理强制退出
    }
  }

  /** 销毁 — 清理所有注册 */
  destroy(): void {
    this.stopHeartbeat();
    for (const [signal, handler] of this.signalHandlers) {
      process.removeListener(signal, handler);
    }
    this.signalHandlers.clear();
    this.listeners.length = 0;
    this._isBooted = false;
    this._isShuttingDown = false;
    this._bootedAt = null;
    this._lastHeartbeatAt = null;
  }

  /** 获取健康检查结果 */
  healthCheck(): DaemonHealthCheck {
    const status: DaemonHealthCheck['status'] = !this._isBooted
      ? 'not_booted'
      : this._isShuttingDown
        ? 'shutting_down'
        : 'healthy';

    const uptimeMs = this._bootedAt ? Date.now() - this._bootedAt : 0;
    const activeSessions = this.getActiveSessionCount?.() ?? 0;
    const totalSessions = this.getTotalSessionCount?.() ?? 0;

    return {
      status,
      bootedAt: this._bootedAt,
      uptimeMs,
      activeSessionCount: activeSessions,
      totalSessionCount: totalSessions,
      memoryUsage: process.memoryUsage(),
      lastHeartbeatAt: this._lastHeartbeatAt
    };
  }

  /** 启动心跳定时器 — 定期 emit health 事件 */
  private startHeartbeat(): void {
    const intervalMs = this.heartbeatConfig.intervalMs ?? 30_000;
    this.heartbeatTimer = setInterval(() => {
      this._lastHeartbeatAt = Date.now();
      this.emit({ type: 'health', health: this.healthCheck() });
    }, intervalMs);
    this.heartbeatTimer.unref();
  }

  /** 停止心跳定时器 */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /** 发出生命周期事件（公开 — DaemonSessionManager需要调用） */
  emit(event: DaemonLifecycleEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // 监听器错误不影响daemon运行
      }
    }
  }
}
