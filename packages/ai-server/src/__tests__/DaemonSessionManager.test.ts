/** @suga/ai-server — DaemonSessionManager测试 */

import { describe, expect, it } from 'vitest';
import { DaemonSessionManager } from '../core/DaemonSessionManager';
import { DaemonLifecycle } from '../core/DaemonLifecycle';
import type { DaemonConfig, DaemonLifecycleEvent } from '../types/server';

const defaultConfig: DaemonConfig = {
  port: 8765,
  host: 'localhost',
  idleTimeoutMs: 0, // 不超时（测试中）
  maxSessions: 5
};

describe('DaemonSessionManager', () => {
  it('registerSession → 创建会话entry', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    const info = manager.registerSession('sess_001', '/tmp');
    expect(info.sessionId).toBe('sess_001');
    expect(info.status).toBe('starting');
    expect(info.workDir).toBe('/tmp');
  });

  it('updateSessionState → 更新状态', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    manager.registerSession('sess_002');
    const updated = manager.updateSessionState('sess_002', 'running');
    expect(updated?.status).toBe('running');
  });

  it('updateSessionState(不存在) → null', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    const result = manager.updateSessionState('nonexistent', 'running');
    expect(result).toBeNull();
  });

  it('incrementTurnCount → 增加轮次', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    manager.registerSession('sess_003');
    manager.updateSessionState('sess_003', 'running');
    manager.incrementTurnCount('sess_003');
    manager.incrementTurnCount('sess_003');

    const info = manager.getSession('sess_003');
    expect(info?.turnCount).toBe(2);
  });

  it('activeCount → 只计算starting/running', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    manager.registerSession('sess_a');
    manager.registerSession('sess_b');
    manager.updateSessionState('sess_a', 'running');
    manager.updateSessionState('sess_b', 'paused');

    expect(manager.activeCount()).toBe(1);
    expect(manager.totalCount()).toBe(2);
  });

  it('isAtCapacity → 达到最大并发限制', () => {
    const config: DaemonConfig = { ...defaultConfig, maxSessions: 2, idleTimeoutMs: 0 };
    const lifecycle = new DaemonLifecycle(config);
    const manager = new DaemonSessionManager(config, lifecycle);

    manager.registerSession('sess_1');
    manager.updateSessionState('sess_1', 'running');
    manager.registerSession('sess_2');
    manager.updateSessionState('sess_2', 'running');

    expect(manager.isAtCapacity()).toBe(true);
  });

  it('removeSession → 从注册表删除', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    manager.registerSession('sess_del');
    manager.removeSession('sess_del');
    expect(manager.getSession('sess_del')).toBeNull();
    expect(manager.totalCount()).toBe(0);
  });

  it('listSessions → 返回所有会话', () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    manager.registerSession('sess_1');
    manager.registerSession('sess_2');

    const list = manager.listSessions();
    expect(list.length).toBe(2);
  });

  it('stopSession → 停止并删除会话', async () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    manager.registerSession('sess_stop');
    await manager.stopSession('sess_stop');
    expect(manager.getSession('sess_stop')).toBeNull();
  });

  it('stopAllSessions → 批量停止', async () => {
    const lifecycle = new DaemonLifecycle(defaultConfig);
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    manager.registerSession('s1');
    manager.registerSession('s2');
    manager.registerSession('s3');

    await manager.stopAllSessions();
    expect(manager.totalCount()).toBe(0);
  });

  it('lifecycle事件 → session_created/session_destroyed', () => {
    const events: DaemonLifecycleEvent[] = [];
    const lifecycle = new DaemonLifecycle(defaultConfig);
    lifecycle.addListener(e => events.push(e));
    const manager = new DaemonSessionManager(defaultConfig, lifecycle);

    manager.registerSession('sess_ev');
    expect(events.some(e => e.type === 'session_created')).toBe(true);

    manager.removeSession('sess_ev');
    expect(events.some(e => e.type === 'session_destroyed')).toBe(true);
  });
});
