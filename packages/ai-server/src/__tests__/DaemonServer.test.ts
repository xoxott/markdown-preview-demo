/** @suga/ai-server — DaemonServer集成测试 */

import { describe, expect, it } from 'vitest';
import { DaemonServer } from '../daemon/DaemonServer';
import type { DaemonConfig } from '../types/server';

const testConfig: DaemonConfig = {
  port: 8765,
  host: 'localhost',
  idleTimeoutMs: 0,
  maxSessions: 3
};

describe('DaemonServer', () => {
  it('start → boot lifecycle', () => {
    const daemon = new DaemonServer(testConfig);
    daemon.start();
    expect(daemon.isStarted()).toBe(true);
    expect(daemon.lifecycle.isBooted()).toBe(true);
  });

  it('createSession → 注册新会话', async () => {
    const daemon = new DaemonServer(testConfig);
    daemon.start();

    const response = await daemon.createSession('/tmp');
    expect(response.sessionId).toContain('daemon_sess_');
    expect(response.workDir).toBe('/tmp');
  });

  it('createSession(容量满) → 抛出错误', async () => {
    const config: DaemonConfig = { ...testConfig, maxSessions: 1 };
    const daemon = new DaemonServer(config);
    daemon.start();

    await daemon.createSession(); // 第1个
    await expect(daemon.createSession()).rejects.toThrow('at capacity');
  });

  it('getSession → 获取会话信息', async () => {
    const daemon = new DaemonServer(testConfig);
    daemon.start();

    const response = await daemon.createSession('/tmp');
    const info = await daemon.getSession(response.sessionId);
    expect(info?.sessionId).toBe(response.sessionId);
  });

  it('listSessions → 列出所有会话', async () => {
    const daemon = new DaemonServer(testConfig);
    daemon.start();

    await daemon.createSession();
    await daemon.createSession();

    const list = await daemon.listSessions();
    expect(list.length).toBe(2);
  });

  it('stopSession → 停止指定会话', async () => {
    const daemon = new DaemonServer(testConfig);
    daemon.start();

    const response = await daemon.createSession();
    await daemon.stopSession(response.sessionId);

    const info = await daemon.getSession(response.sessionId);
    expect(info).toBeNull();
  });

  it('stopAllSessions → 停止所有会话', async () => {
    const daemon = new DaemonServer(testConfig);
    daemon.start();

    await daemon.createSession();
    await daemon.createSession();
    await daemon.stopAllSessions();

    const list = await daemon.listSessions();
    expect(list.length).toBe(0);
  });

  it('shutdown → 优雅关闭daemon', async () => {
    const daemon = new DaemonServer(testConfig);
    daemon.start();

    await daemon.createSession();
    await daemon.shutdown('test shutdown');
    expect(daemon.isStarted()).toBe(false);
    expect(daemon.lifecycle.isShuttingDown()).toBe(true);
  });

  it('sessionManager + lifecycle → 事件联动', async () => {
    const daemon = new DaemonServer(testConfig);
    daemon.start();

    await daemon.createSession();
    expect(daemon.sessionManager.totalCount()).toBe(1);
    expect(daemon.sessionManager.activeCount()).toBe(1);
  });
});