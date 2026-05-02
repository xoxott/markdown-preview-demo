/** @suga/ai-tools — TaskGetTool测试 */

import { describe, expect, it } from 'vitest';
import { taskGetTool } from '../tools/task-get';
import { InMemoryTaskStoreProvider } from '../provider/InMemoryTaskStoreProvider';

describe('TaskGetTool', () => {
  const taskStore = new InMemoryTaskStoreProvider();

  it('name → task-get', () => {
    expect(taskGetTool.name).toBe('task-get');
  });

  it('isReadOnly → true', () => {
    const input = { taskId: 'task-1' };
    expect(taskGetTool.isReadOnly!(input)).toBe(true);
  });

  it('safetyLabel → readonly', () => {
    const input = { taskId: 'task-1' };
    expect(taskGetTool.safetyLabel!(input)).toBe('readonly');
  });

  it('call → 获取存在的任务', async () => {
    taskStore.reset();
    const created = await taskStore.createTask({ subject: 'Test', description: 'desc' });
    const result = await taskGetTool.call({ taskId: created.id }, {
      taskStoreProvider: taskStore
    } as any);
    expect(result.data.task?.id).toBe(created.id);
    expect(result.data.task?.subject).toBe('Test');
  });

  it('call → 任务不存在返回null', async () => {
    taskStore.reset();
    const result = await taskGetTool.call({ taskId: 'nonexistent' }, {
      taskStoreProvider: taskStore
    } as any);
    expect(result.data.task).toBeNull();
  });

  it('call → 无Provider返回null', async () => {
    const result = await taskGetTool.call({ taskId: 'task-1' }, {} as any);
    expect(result.data.task).toBeNull();
  });

  it('inputSchema → 正确定义', () => {
    expect(taskGetTool.inputSchema).toBeDefined();
  });
});
