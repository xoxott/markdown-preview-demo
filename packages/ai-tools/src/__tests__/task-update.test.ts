/** @suga/ai-tools — TaskUpdateTool测试 */

import { describe, expect, it } from 'vitest';
import { taskUpdateTool } from '../tools/task-update';
import { InMemoryTaskStoreProvider } from '../provider/InMemoryTaskStoreProvider';

describe('TaskUpdateTool', () => {
  const taskStore = new InMemoryTaskStoreProvider();

  it('name → task-update', () => {
    expect(taskUpdateTool.name).toBe('task-update');
  });

  it('safetyLabel → readonly(正常更新)', () => {
    const input = { taskId: 't1', status: 'in_progress' as const };
    expect(taskUpdateTool.safetyLabel!(input)).toBe('readonly');
  });

  it('safetyLabel → destructive(删除)', () => {
    const input = { taskId: 't1', status: 'deleted' as const };
    expect(taskUpdateTool.safetyLabel!(input)).toBe('destructive');
  });

  it('isDestructive → true(删除)', () => {
    const input = { taskId: 't1', status: 'deleted' as const };
    expect(taskUpdateTool.isDestructive!(input)).toBe(true);
  });

  it('call → 更新subject', async () => {
    taskStore.reset();
    const created = await taskStore.createTask({ subject: 'Old', description: 'desc' });
    const result = await taskUpdateTool.call({ taskId: created.id, subject: 'New' }, {
      taskStoreProvider: taskStore
    } as any);
    expect(result.data.success).toBe(true);
    expect(result.data.updatedFields).toContain('subject');
    const task = await taskStore.getTask(created.id);
    expect(task?.subject).toBe('New');
  });

  it('call → 更新status带statusChange', async () => {
    taskStore.reset();
    const created = await taskStore.createTask({ subject: 'Test', description: 'desc' });
    const result = await taskUpdateTool.call(
      { taskId: created.id, status: 'in_progress' as const },
      { taskStoreProvider: taskStore } as any
    );
    expect(result.data.success).toBe(true);
    expect(result.data.statusChange).toEqual({ from: 'pending', to: 'in_progress' });
  });

  it('call → 添加依赖关系', async () => {
    taskStore.reset();
    const task1 = await taskStore.createTask({ subject: 'T1', description: 'd1' });
    const task2 = await taskStore.createTask({ subject: 'T2', description: 'd2' });
    const result = await taskUpdateTool.call({ taskId: task1.id, addBlockedBy: [task2.id] }, {
      taskStoreProvider: taskStore
    } as any);
    expect(result.data.success).toBe(true);
    expect(result.data.updatedFields).toContain('blockedBy');
    const updated = await taskStore.getTask(task1.id);
    expect(updated?.blockedBy).toContain(task2.id);
  });

  it('call → 删除任务', async () => {
    taskStore.reset();
    const created = await taskStore.createTask({ subject: 'ToDelete', description: 'desc' });
    const result = await taskUpdateTool.call({ taskId: created.id, status: 'deleted' as const }, {
      taskStoreProvider: taskStore
    } as any);
    expect(result.data.success).toBe(true);
    expect(result.data.statusChange?.to).toBe('deleted');
    const task = await taskStore.getTask(created.id);
    expect(task).toBeNull();
  });

  it('call → 任务不存在返回error', async () => {
    taskStore.reset();
    const result = await taskUpdateTool.call({ taskId: 'nonexistent', subject: 'New' }, {
      taskStoreProvider: taskStore
    } as any);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('not found');
  });

  it('call → metadata合并+null删除', async () => {
    taskStore.reset();
    const created = await taskStore.createTask({
      subject: 'Test',
      description: 'desc',
      metadata: { priority: 'high', tag: 'bug' }
    });
    const result = await taskUpdateTool.call(
      { taskId: created.id, metadata: { priority: 'low', tag: null } },
      { taskStoreProvider: taskStore } as any
    );
    expect(result.data.success).toBe(true);
    const task = await taskStore.getTask(created.id);
    expect(task?.metadata?.priority).toBe('low');
    expect(task?.metadata?.tag).toBeUndefined();
  });

  it('call → 无Provider返回error', async () => {
    const result = await taskUpdateTool.call({ taskId: 't1', subject: 'New' }, {} as any);
    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('No TaskStoreProvider');
  });

  it('inputSchema → 正确定义', () => {
    expect(taskUpdateTool.inputSchema).toBeDefined();
  });
});
