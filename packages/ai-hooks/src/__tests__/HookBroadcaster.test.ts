/** P71 测试 — HookBroadcaster(事件广播+pending缓冲+subscribe+HookExecutionTracker) */

import { describe, expect, it } from 'vitest';
import { HookBroadcaster } from '../executor/HookBroadcaster';
import type {
  HookBroadcastEvent,
  HookCompletedEvent,
  HookProgressEvent,
  HookStartedEvent
} from '../executor/HookBroadcaster';

// ============================================================
// HookBroadcaster — 事件广播
// ============================================================

describe('HookBroadcaster — subscribe + broadcast', () => {
  it('订阅后收到广播事件', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));

    broadcaster.emitHookStarted('testHook', 'PreToolUse');
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('hook_started');
    expect(events[0].hookName).toBe('testHook');
  });

  it('多个监听器同时收到', () => {
    const broadcaster = new HookBroadcaster();
    const events1: HookBroadcastEvent[] = [];
    const events2: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events1.push(event));
    broadcaster.subscribe(event => events2.push(event));

    broadcaster.emitHookStarted('hook1', 'PostToolUse');
    expect(events1.length).toBe(1);
    expect(events2.length).toBe(1);
  });

  it('unsubscribe后不再收到', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    const unsub = broadcaster.subscribe(event => events.push(event));

    broadcaster.emitHookStarted('hook1', 'PreToolUse');
    expect(events.length).toBe(1);

    unsub();
    broadcaster.emitHookProgress('hook1', 'PreToolUse', 'output line');
    expect(events.length).toBe(1); // 不再收到
  });

  it('监听器异常不影响广播', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(() => {
      throw new Error('listener error');
    });
    broadcaster.subscribe(event => events.push(event));

    broadcaster.emitHookStarted('hook1', 'PreToolUse');
    expect(events.length).toBe(1); // 第二个监听器仍收到
  });
});

describe('HookBroadcaster — emitHookStarted', () => {
  it('emitHookStarted → hook_started事件', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));

    broadcaster.emitHookStarted('myHook', 'PreToolUse', { hookType: 'command', matcher: 'Bash' });
    const e = events[0] as HookStartedEvent;
    expect(e.type).toBe('hook_started');
    expect(e.hookName).toBe('myHook');
    expect(e.hookEvent).toBe('PreToolUse');
    expect(e.hookType).toBe('command');
    expect(e.matcher).toBe('Bash');
    expect(e.timestamp).toBeGreaterThan(0);
  });
});

describe('HookBroadcaster — emitHookProgress', () => {
  it('emitHookProgress → hook_progress事件(stdout)', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));

    broadcaster.emitHookProgress('myHook', 'PreToolUse', 'stdout line 1');
    const e = events[0] as HookProgressEvent;
    expect(e.type).toBe('hook_progress');
    expect(e.outputType).toBe('stdout');
    expect(e.line).toBe('stdout line 1');
  });

  it('emitHookProgress → stderr输出', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));

    broadcaster.emitHookProgress('myHook', 'PreToolUse', 'warning!', 'stderr');
    const e = events[0] as HookProgressEvent;
    expect(e.outputType).toBe('stderr');
  });
});

describe('HookBroadcaster — emitHookResponse', () => {
  it('emitHookResponse → hook_completed事件', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));

    broadcaster.emitHookResponse('myHook', 'PreToolUse', 'success', 150);
    const e = events[0] as HookCompletedEvent;
    expect(e.type).toBe('hook_completed');
    expect(e.outcome).toBe('success');
    expect(e.durationMs).toBe(150);
    expect(e.error).toBeUndefined();
  });

  it('emitHookResponse → error事件', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));

    broadcaster.emitHookResponse('myHook', 'PreToolUse', 'non_blocking_error', 3000, {
      error: 'timeout',
      preventContinuation: false
    });
    const e = events[0] as HookCompletedEvent;
    expect(e.error).toBe('timeout');
    expect(e.preventContinuation).toBe(false);
  });
});

// ============================================================
// HookBroadcaster — pending缓冲
// ============================================================

describe('HookBroadcaster — pending缓冲', () => {
  it('无监听器 → 事件暂存', () => {
    const broadcaster = new HookBroadcaster();
    broadcaster.emitHookStarted('hook1', 'PreToolUse');
    expect(broadcaster.pendingBufferSize).toBe(1);
  });

  it('后续订阅 → 一次性推送暂存事件', () => {
    const broadcaster = new HookBroadcaster();
    broadcaster.emitHookStarted('hook1', 'PreToolUse');
    broadcaster.emitHookProgress('hook1', 'PreToolUse', 'output');

    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));

    expect(events.length).toBe(2);
    expect(broadcaster.pendingBufferSize).toBe(0);
  });

  it('暂存超过上限 → 丢弃最早事件', () => {
    const broadcaster = new HookBroadcaster(3);
    broadcaster.emitHookStarted('hook1', 'PreToolUse');
    broadcaster.emitHookStarted('hook2', 'PostToolUse');
    broadcaster.emitHookStarted('hook3', 'Stop');
    broadcaster.emitHookStarted('hook4', 'PreToolUse'); // 超限 → 丢弃

    expect(broadcaster.pendingBufferSize).toBe(3); // 最多3个

    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));
    expect(events.length).toBe(3);
  });

  it('clearPendingBuffer → 清空暂存', () => {
    const broadcaster = new HookBroadcaster();
    broadcaster.emitHookStarted('hook1', 'PreToolUse');
    expect(broadcaster.pendingBufferSize).toBe(1);
    broadcaster.clearPendingBuffer();
    expect(broadcaster.pendingBufferSize).toBe(0);
  });

  it('clearListeners → 清空所有监听器', () => {
    const broadcaster = new HookBroadcaster();
    broadcaster.subscribe(() => {});
    broadcaster.subscribe(() => {});
    expect(broadcaster.listenerCount).toBe(2);
    broadcaster.clearListeners();
    expect(broadcaster.listenerCount).toBe(0);
  });
});

// ============================================================
// HookExecutionTracker
// ============================================================

describe('HookExecutionTracker', () => {
  it('started+progress+completed → 3个事件', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));

    const tracker = broadcaster.trackExecution('myHook', 'PreToolUse');
    tracker.started({ hookType: 'command' });
    tracker.progress('stdout line 1');
    tracker.progress('stderr warning', 'stderr');
    tracker.completed('success');

    expect(events.length).toBe(4); // started + 2 progress + completed
    expect(events[0].type).toBe('hook_started');
    expect(events[1].type).toBe('hook_progress');
    expect(events[2].type).toBe('hook_progress');
    expect(events[3].type).toBe('hook_completed');
    expect((events[3] as HookCompletedEvent).durationMs).toBeGreaterThanOrEqual(0);
  });

  it('completed with error → error字段填充', () => {
    const broadcaster = new HookBroadcaster();
    const events: HookBroadcastEvent[] = [];
    broadcaster.subscribe(event => events.push(event));

    const tracker = broadcaster.trackExecution('failHook', 'PreToolUse');
    tracker.started();
    tracker.completed('blocking', { error: 'denied', preventContinuation: true });

    const e = events[1] as HookCompletedEvent;
    expect(e.error).toBe('denied');
  });
});
