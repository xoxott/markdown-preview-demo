/** @suga/ai-tools — TaskCreateTool测试 */

import { describe, expect, it } from 'vitest';
import { taskCreateTool } from '../tools/task-create';
import { InMemoryTaskStoreProvider } from '../provider/InMemoryTaskStoreProvider';

describe('TaskCreateTool', () => {
  const taskStore = new InMemoryTaskStoreProvider();

  it('name → task-create', () => {
    expect(taskCreateTool.name).toBe('task-create');
  });

  it('isReadOnly → true', () => {
    const input = { subject: 'Test', description: 'desc' };
    expect(taskCreateTool.isReadOnly!(input)).toBe(true);
  });

  it('safetyLabel → readonly', () => {
    const input = { subject: 'Test', description: 'desc' };
    expect(taskCreateTool.safetyLabel!(input)).toBe('readonly');
  });

  it('isConcurrencySafe → true', () => {
    const input = { subject: 'Test', description: 'desc' };
    expect(taskCreateTool.isConcurrencySafe!(input)).toBe(true);
  });

  it('call → 创建任务', async () => {
    taskStore.reset();
    const result = await taskCreateTool.call(
      { subject: 'Fix bug', description: 'Fix the login bug' },
      { taskStoreProvider: taskStore } as any
    );
    expect(result.data.task.subject).toBe('Fix bug');
    expect(result.data.task.id).toBeTruthy();
  });

  it('call → 带metadata', async () => {
    taskStore.reset();
    const result = await taskCreateTool.call(
      { subject: 'Test', description: 'desc', metadata: { priority: 'high' } },
      { taskStoreProvider: taskStore } as any
    );
    expect(result.data.task.subject).toBe('Test');
    const task = await taskStore.getTask(result.data.task.id);
    expect(task?.metadata?.priority).toBe('high');
  });

  it('call → 无Provider返回空', async () => {
    const result = await taskCreateTool.call({ subject: 'Test', description: 'desc' }, {} as any);
    expect(result.data.task.id).toBe('');
  });

  it('inputSchema → 正确定义', () => {
    expect(taskCreateTool.inputSchema).toBeDefined();
  });
});
