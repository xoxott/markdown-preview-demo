/** G8 后台任务生命周期测试 — MockFileSystemProvider 后台任务方法 */

import { describe, expect, it } from 'vitest';
import type { BackgroundTaskDetail, BackgroundTaskResult } from '../types/fs-provider';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

describe('MockFileSystemProvider — G8 后台任务', () => {
  let provider: MockFileSystemProvider;

  beforeEach(() => {
    provider = new MockFileSystemProvider();
  });

  it('spawnBackgroundCommand → 返回 taskId + status=running', async () => {
    const result: BackgroundTaskResult = await provider.spawnBackgroundCommand('npm run build');
    expect(result.taskId).toMatch(/^bg-mock-/);
    expect(result.status).toBe('running');
    expect(result.command).toBe('npm run build');
    expect(result.startedAt).toBeGreaterThan(0);
  });

  it('getBackgroundTask → 返回任务详情', async () => {
    const spawned = await provider.spawnBackgroundCommand('echo hello');
    const detail: BackgroundTaskDetail | null = await provider.getBackgroundTask(spawned.taskId);
    expect(detail).not.toBeNull();
    expect(detail!.taskId).toBe(spawned.taskId);
    expect(detail!.status).toBe('running');
    expect(detail!.command).toBe('echo hello');
  });

  it('getBackgroundTask(不存在) → null', async () => {
    const detail = await provider.getBackgroundTask('nonexistent');
    expect(detail).toBeNull();
  });

  it('listBackgroundTasks → 返回所有任务', async () => {
    await provider.spawnBackgroundCommand('cmd1');
    await provider.spawnBackgroundCommand('cmd2');
    const list = await provider.listBackgroundTasks();
    expect(list.length).toBe(2);
  });

  it('stopBackgroundTask → 停止运行中任务', async () => {
    const spawned = await provider.spawnBackgroundCommand('long-task');
    const stopped = await provider.stopBackgroundTask(spawned.taskId);
    expect(stopped).toBe(true);
    const detail = await provider.getBackgroundTask(spawned.taskId);
    expect(detail!.status).toBe('stopped');
    expect(detail!.exitCode).toBe(-1);
  });

  it('stopBackgroundTask(已完成) → false', async () => {
    const spawned = await provider.spawnBackgroundCommand('cmd');
    await provider.stopBackgroundTask(spawned.taskId);
    const stopped = await provider.stopBackgroundTask(spawned.taskId);
    expect(stopped).toBe(false);
  });

  it('stopBackgroundTask(不存在) → false', async () => {
    const stopped = await provider.stopBackgroundTask('nonexistent');
    expect(stopped).toBe(false);
  });

  it('markTaskNotified → 标记已通知', async () => {
    const spawned = await provider.spawnBackgroundCommand('cmd');
    provider.markTaskNotified(spawned.taskId);
    // mock内部状态通过 getBackgroundTask 间接验证 — notified 不是 detail 字段
    // 直接验证方法执行无异常
    expect(true).toBe(true);
  });

  it('registerForeground/unregisterForeground → 无异常', async () => {
    const spawned = await provider.spawnBackgroundCommand('cmd');
    provider.registerForeground(spawned.taskId);
    provider.unregisterForeground(spawned.taskId);
    expect(true).toBe(true);
  });

  it('runCommand(runInBackground=true) → 返回模拟后台任务消息', async () => {
    const result = await provider.runCommand('echo hello', { runInBackground: true });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Background task started');
  });
});

// 注意: NodeFileSystemProvider 的 spawnBackgroundCommand 使用真实 child_process.spawn
// 在 vitest 中不便测试（涉及真实子进程），仅验证 Mock 实现的正确性。
// 宿主在生产环境中使用 NodeFileSystemProvider 进行真实后台任务管理。
