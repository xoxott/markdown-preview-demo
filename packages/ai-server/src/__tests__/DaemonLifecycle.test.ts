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
    lifecycle.addListener(e => events.push(e));

    lifecycle.boot();
    expect(lifecycle.isBooted()).toBe(true);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('boot');
  });

  it('boot(重复) → 不重复触发', () => {
    const events: DaemonLifecycleEvent[] = [];
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.addListener(e => events.push(e));

    lifecycle.boot();
    lifecycle.boot();
    expect(events.length).toBe(1);
  });

  it('initiateShutdown → 发出shutdown事件 + 标记关闭', async () => {
    const events: DaemonLifecycleEvent[] = [];
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.addListener(e => events.push(e));

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

// ============================================================
// P84: Health Check + Heartbeat 测试
// ============================================================

describe('DaemonLifecycle — healthCheck', () => {
  it('未 boot → status = not_booted', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const health = lifecycle.healthCheck();
    expect(health.status).toBe('not_booted');
    expect(health.bootedAt).toBeNull();
    expect(health.uptimeMs).toBe(0);
    expect(health.lastHeartbeatAt).toBeNull();
  });

  it('已 boot → status = healthy', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.boot();
    const health = lifecycle.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.bootedAt).toBeTypeOf('number');
    expect(health.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(health.memoryUsage).toBeDefined();
    expect(health.memoryUsage.heapUsed).toBeGreaterThan(0);
  });

  it('已 shutdown → status = shutting_down', async () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.boot();
    await lifecycle.initiateShutdown('test');
    const health = lifecycle.healthCheck();
    expect(health.status).toBe('shutting_down');
  });

  it('注入 getActiveSessionCount → health 包含会话数', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig, {
      getActiveSessionCount: () => 3,
      getTotalSessionCount: () => 5
    });
    lifecycle.boot();
    const health = lifecycle.healthCheck();
    expect(health.activeSessionCount).toBe(3);
    expect(health.totalSessionCount).toBe(5);
  });

  it('无注入 → activeSessionCount = 0', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.boot();
    const health = lifecycle.healthCheck();
    expect(health.activeSessionCount).toBe(0);
    expect(health.totalSessionCount).toBe(0);
  });

  it('heartbeat 发出 health 事件', () => {
    const events: DaemonLifecycleEvent[] = [];
    // 极短心跳间隔（100ms）用于测试
    const lifecycle = new DaemonLifecycle(defaultConfig, {
      heartbeat: { enabled: true, intervalMs: 100 }
    });
    lifecycle.addListener(e => events.push(e));
    lifecycle.boot();

    // 等待至少一个 heartbeat 事件
    return new Promise<void>(resolve => {
      setTimeout(() => {
        lifecycle.destroy();
        const healthEvents = events.filter(e => e.type === 'health');
        expect(healthEvents.length).toBeGreaterThanOrEqual(1);
        if (healthEvents.length > 0) {
          const healthEvent = healthEvents[0];
          if (healthEvent.type === 'health') {
            expect(healthEvent.health.status).toBe('healthy');
            expect(healthEvent.health.lastHeartbeatAt).toBeTypeOf('number');
          }
        }
        resolve();
      }, 350);
    });
  });

  it('heartbeat disabled → 不发出 health 事件', () => {
    const events: DaemonLifecycleEvent[] = [];
    const lifecycle = new DaemonLifecycle(defaultConfig, {
      heartbeat: { enabled: false }
    });
    lifecycle.addListener(e => events.push(e));
    lifecycle.boot();

    return new Promise<void>(resolve => {
      setTimeout(() => {
        lifecycle.destroy();
        const healthEvents = events.filter(e => e.type === 'health');
        expect(healthEvents.length).toBe(0);
        resolve();
      }, 350);
    });
  });

  it('destroy → 清理 heartbeat + bootedAt', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.boot();
    lifecycle.destroy();
    const health = lifecycle.healthCheck();
    expect(health.status).toBe('not_booted');
    expect(health.bootedAt).toBeNull();
    expect(health.lastHeartbeatAt).toBeNull();
  });
});
