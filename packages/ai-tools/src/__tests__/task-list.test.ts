/** @suga/ai-tools — TaskListTool测试 */

import { describe, expect, it } from 'vitest';
import { taskListTool } from '../tools/task-list';
import { InMemoryTaskStoreProvider } from '../provider/InMemoryTaskStoreProvider';

describe('TaskListTool', () => {
  const taskStore = new InMemoryTaskStoreProvider();

  it('name → task-list', () => {
    expect(taskListTool.name).toBe('task-list');
  });

  it('isReadOnly → true', () => {
    expect(taskListTool.isReadOnly!({})).toBe(true);
  });

  it('safetyLabel → readonly', () => {
    expect(taskListTool.safetyLabel!({})).toBe('readonly');
  });

  it('call → 列出所有任务', async () => {
    taskStore.reset();
    await taskStore.createTask({ subject: 'Task1', description: 'd1' });
    await taskStore.createTask({ subject: 'Task2', description: 'd2' });

    const result = await taskListTool.call({}, { taskStoreProvider: taskStore } as any);
    expect(result.data.tasks.length).toBe(2);
    expect(result.data.tasks[0].subject).toBe('Task1');
  });

  it('call → 空列表', async () => {
    taskStore.reset();
    const result = await taskListTool.call({}, { taskStoreProvider: taskStore } as any);
    expect(result.data.tasks).toEqual([]);
  });

  it('call → 无Provider返回空列表', async () => {
    const result = await taskListTool.call({}, {} as any);
    expect(result.data.tasks).toEqual([]);
  });

  it('inputSchema → 正确定义', () => {
    expect(taskListTool.inputSchema).toBeDefined();
  });
});
