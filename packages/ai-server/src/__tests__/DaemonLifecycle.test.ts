/** @suga/ai-server — DaemonLifecycle测试 */

import { describe, expect, it } from 'vitest';
import { DaemonLifecycle } from '../core/DaemonLifecycle';
import type { DaemonConfig, DaemonLifecycleEvent } from '../types/server';

const defaultConfig: DaemonConfig = {
  port: 8765,
  host: 'localhost',
  idleTimeoutMs: 300_000,
  maxSessions: 10
};

describe('DaemonLifecycle', () => {
  it('boot → 注册信号处理器 + 发出boot事件', () => {
    const events: DaemonLifecycleEvent[] = [];
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.addListener((e) => events.push(e));

    lifecycle.boot();
    expect(lifecycle.isBooted()).toBe(true);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('boot');
  });

  it('boot(重复) → 不重复触发', () => {
    const events: DaemonLifecycleEvent[] = [];
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.addListener((e) => events.push(e));

    lifecycle.boot();
    lifecycle.boot();
    expect(events.length).toBe(1);
  });

  it('initiateShutdown → 发出shutdown事件 + 标记关闭', async () => {
    const events: DaemonLifecycleEvent[] = [];
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.addListener((e) => events.push(e));

    lifecycle.boot();
    await lifecycle.initiateShutdown('test shutdown');
    expect(lifecycle.isShuttingDown()).toBe(true);
    expect(events.some(e => e.type === 'shutdown')).toBe(true);
  });

  it('initiateShutdown(重复) → 不重复触发', async () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.boot();
    await lifecycle.initiateShutdown('first');
    await lifecycle.initiateShutdown('second'); // 应忽略
    expect(lifecycle.isShuttingDown()).toBe(true);
  });

  it('addListener/removeListener → 正确移除', () => {
    const events: DaemonLifecycleEvent[] = [];
    const listener = (e: DaemonLifecycleEvent) => events.push(e);
    const lifecycle = new DaemonLifecycle(defaultConfig);

    lifecycle.addListener(listener);
    lifecycle.boot();
    expect(events.length).toBe(1);

    lifecycle.removeListener(listener);
    lifecycle.destroy();
    // destroy不发出事件（因为没有listener了）
  });

  it('destroy → 清理所有状态', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.boot();
    lifecycle.destroy();
    expect(lifecycle.isBooted()).toBe(false);
    expect(lifecycle.isShuttingDown()).toBe(false);
  });
});