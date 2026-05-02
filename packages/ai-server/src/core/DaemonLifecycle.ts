/**
 * DaemonLifecycle.ts — 进程级生命周期管理
 *
 * 处理daemon启动、信号处理、优雅关闭。 对齐Claude Code daemon/main.ts + cli.tsx的信号处理逻辑。
 */

import type {
  DaemonConfig,
  DaemonLifecycleEvent,
  DaemonLifecycleListener,
  GracefulShutdownOptions
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

  constructor(readonly config: DaemonConfig) {}

  /** 是否已启动 */
  readonly isBooted = (): boolean => this._isBooted;

  /** 是否正在关闭 */
  readonly isShuttingDown = (): boolean => this._isShuttingDown;

  /** 启动daemon — 注册信号处理器，发出boot事件 */
  boot(): void {
    if (this._isBooted) return;
    this._isBooted = true;

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

    if (waitForSessions) {
      // 等待外部关闭session（由DaemonSessionManager处理）
      // 这里只是等待超时，实际session关闭在manager层
    }
  }

  /** 销毁 — 清理所有注册 */
  destroy(): void {
    for (const [signal, handler] of this.signalHandlers) {
      process.removeListener(signal, handler);
    }
    this.signalHandlers.clear();
    this.listeners.length = 0;
    this._isBooted = false;
    this._isShuttingDown = false;
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
