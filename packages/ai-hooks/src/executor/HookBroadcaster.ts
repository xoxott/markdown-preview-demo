/**
 * HookBroadcaster — Hook事件广播系统
 *
 * 对齐 Claude Code HookBroadcastService:
 *
 * 1. emitHookStarted — Hook开始执行时广播通知
 * 2. emitHookProgress — Hook执行过程中广播进度（command runner的stdout/stderr行）
 * 3. emitHookResponse — Hook执行完成后广播结果
 * 4. pending event缓冲 — 异步消费者未连接时的事件暂存
 *
 * 使用场景:
 *
 * - CLI 进度条更新（Hook执行中显示 "Running hook: xxx"）
 * - IDE 扩展实时显示Hook执行状态
 * - 日志系统捕获Hook执行事件
 *
 * 参考 Claude Code src/utils/hooks/broadcast.ts
 */

import type { HookEvent, HookOutcome } from '../types/hooks';

// ============================================================
// 广播事件类型
// ============================================================

/** Hook广播事件 — Hook执行过程中的状态通知 */
export type HookBroadcastEventType = 'hook_started' | 'hook_progress' | 'hook_completed';

/** Hook开始事件 */
export interface HookStartedEvent {
  readonly type: 'hook_started';
  readonly hookName: string;
  readonly hookEvent: HookEvent;
  readonly hookType?: string;
  readonly matcher?: string;
  readonly timestamp: number;
}

/** Hook进度事件 — command runner 的 stdout/stderr 行输出 */
export interface HookProgressEvent {
  readonly type: 'hook_progress';
  readonly hookName: string;
  readonly hookEvent: HookEvent;
  readonly outputType: 'stdout' | 'stderr';
  readonly line: string;
  readonly timestamp: number;
}

/** Hook完成事件 */
export interface HookCompletedEvent {
  readonly type: 'hook_completed';
  readonly hookName: string;
  readonly hookEvent: HookEvent;
  readonly outcome: HookOutcome;
  readonly durationMs: number;
  readonly error?: string;
  readonly preventContinuation?: boolean;
  readonly timestamp: number;
}

/** 所有广播事件联合 */
export type HookBroadcastEvent = HookStartedEvent | HookProgressEvent | HookCompletedEvent;

/** 广播事件监听器 */
export type HookBroadcastListener = (event: HookBroadcastEvent) => void;

// ============================================================
// HookBroadcaster
// ============================================================

/**
 * HookBroadcaster — Hook执行事件广播器
 *
 * 特性:
 *
 * - 多监听器订阅 — 多个消费者可同时监听
 * - pending缓冲 — 消费者未连接时暂存事件，连接后一次性推送
 * - unsubscribe — 监听器可随时取消订阅
 * - 无监听器时快速路径 — 事件直接丢弃（零开销）
 */
export class HookBroadcaster {
  private readonly listeners: Set<HookBroadcastListener> = new Set();
  private readonly pendingBuffer: HookBroadcastEvent[] = [];
  private readonly maxPendingBufferSize: number;

  constructor(maxPendingBufferSize = 100) {
    this.maxPendingBufferSize = maxPendingBufferSize;
  }

  // === 订阅管理 ===

  /** 订阅广播事件 — 返回 unsubscribe 函数 */
  subscribe(listener: HookBroadcastListener): () => void {
    this.listeners.add(listener);

    // 推送暂存事件
    for (const event of this.pendingBuffer) {
      try {
        listener(event);
      } catch {
        // 监听器异常不影响广播
      }
    }
    // 清空暂存
    this.pendingBuffer.length = 0;

    // 返回 unsubscribe 函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 取消所有订阅 */
  clearListeners(): void {
    this.listeners.clear();
  }

  /** 获取当前监听器数量 */
  get listenerCount(): number {
    return this.listeners.size;
  }

  // === 广播方法 ===

  /** emitHookStarted — 广播Hook开始执行事件 */
  emitHookStarted(
    hookName: string,
    hookEvent: HookEvent,
    options?: { hookType?: string; matcher?: string }
  ): void {
    const event: HookStartedEvent = {
      type: 'hook_started',
      hookName,
      hookEvent,
      hookType: options?.hookType,
      matcher: options?.matcher,
      timestamp: Date.now()
    };
    this.broadcast(event);
  }

  /** emitHookProgress — 广播Hook执行进度（stdout/stderr行） */
  emitHookProgress(
    hookName: string,
    hookEvent: HookEvent,
    line: string,
    outputType: 'stdout' | 'stderr' = 'stdout'
  ): void {
    const event: HookProgressEvent = {
      type: 'hook_progress',
      hookName,
      hookEvent,
      outputType,
      line,
      timestamp: Date.now()
    };
    this.broadcast(event);
  }

  /** emitHookResponse — 广播Hook执行完成事件 */
  emitHookResponse(
    hookName: string,
    hookEvent: HookEvent,
    outcome: HookOutcome,
    durationMs: number,
    options?: { error?: string; preventContinuation?: boolean }
  ): void {
    const event: HookCompletedEvent = {
      type: 'hook_completed',
      hookName,
      hookEvent,
      outcome,
      durationMs,
      error: options?.error,
      preventContinuation: options?.preventContinuation,
      timestamp: Date.now()
    };
    this.broadcast(event);
  }

  // === 内部广播 ===

  /** 广播事件到所有监听器 — 无监听器时暂存或丢弃 */
  private broadcast(event: HookBroadcastEvent): void {
    if (this.listeners.size === 0) {
      // 暂存进度事件（started和completed也暂存，消费者可能稍后连接）
      if (this.pendingBuffer.length < this.maxPendingBufferSize) {
        this.pendingBuffer.push(event);
      }
      return;
    }

    // 推送到所有监听器
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // 监听器异常不影响其他监听器
      }
    }
  }

  // === 工具方法 ===

  /** 清空暂存缓冲区 */
  clearPendingBuffer(): void {
    this.pendingBuffer.length = 0;
  }

  /** 获取暂存缓冲区大小 */
  get pendingBufferSize(): number {
    return this.pendingBuffer.length;
  }

  /** 创建执行跟踪器 — 为单个Hook执行提供便捷的进度跟踪 */
  trackExecution(hookName: string, hookEvent: HookEvent): HookExecutionTracker {
    return new HookExecutionTracker(this, hookName, hookEvent);
  }
}

// ============================================================
// HookExecutionTracker — 单个Hook执行的进度跟踪器
// ============================================================

/**
 * HookExecutionTracker — 为单个Hook执行提供便捷的进度跟踪
 *
 * 使用方式:
 *
 *     const tracker = broadcaster.trackExecution('myHook', 'PreToolUse');
 *     tracker.started();
 *     tracker.progress('stdout line 1');
 *     tracker.progress('stderr warning', 'stderr');
 *     tracker.completed('success', 150);
 */
export class HookExecutionTracker {
  private readonly broadcaster: HookBroadcaster;
  private readonly hookName: string;
  private readonly hookEvent: HookEvent;
  private readonly startTime: number;

  constructor(broadcaster: HookBroadcaster, hookName: string, hookEvent: HookEvent) {
    this.broadcaster = broadcaster;
    this.hookName = hookName;
    this.hookEvent = hookEvent;
    this.startTime = Date.now();
  }

  /** 标记Hook开始执行 */
  started(options?: { hookType?: string; matcher?: string }): void {
    this.broadcaster.emitHookStarted(this.hookName, this.hookEvent, options);
  }

  /** 发送进度行（stdout/stderr） */
  progress(line: string, outputType: 'stdout' | 'stderr' = 'stdout'): void {
    this.broadcaster.emitHookProgress(this.hookName, this.hookEvent, line, outputType);
  }

  /** 标记Hook执行完成 */
  completed(
    outcome: HookOutcome,
    options?: { error?: string; preventContinuation?: boolean }
  ): void {
    const durationMs = Date.now() - this.startTime;
    this.broadcaster.emitHookResponse(this.hookName, this.hookEvent, outcome, durationMs, options);
  }
}
