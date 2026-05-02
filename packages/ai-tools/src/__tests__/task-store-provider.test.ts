/** @suga/ai-tools — InMemoryTaskStoreProvider测试 */

import { describe, expect, it } from 'vitest';
import { InMemoryTaskStoreProvider } from '../provider/InMemoryTaskStoreProvider';

describe('InMemoryTaskStoreProvider', () => {
  const provider = new InMemoryTaskStoreProvider();

  it('createTask → 返回带id的TaskEntry', async () => {
    provider.reset();
    const task = await provider.createTask({ subject: 'Test', description: 'desc' });
    expect(task.id).toBeTruthy();
    expect(task.subject).toBe('Test');
    expect(task.status).toBe('pending');
    expect(task.blockedBy).toEqual([]);
    expect(task.blocks).toEqual([]);
  });

  it('getTask → 获取已创建任务', async () => {
    provider.reset();
    const created = await provider.createTask({ subject: 'Test', description: 'desc' });
    const fetched = await provider.getTask(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it('getTask → 删除后返回null', async () => {
    provider.reset();
    const created = await provider.createTask({ subject: 'Test', description: 'desc' });
    await provider.updateTask(created.id, { status: 'deleted' });
    const fetched = await provider.getTask(created.id);
    expect(fetched).toBeNull();
  });

  it('listTasks → 过滤deleted', async () => {
    provider.reset();
    const t1 = await provider.createTask({ subject: 'T1', description: 'd1' });
    const t2 = await provider.createTask({ subject: 'T2', description: 'd2' });
    await provider.updateTask(t1.id, { status: 'deleted' });
    const list = await provider.listTasks();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(t2.id);
  });

  it('updateTask → 更新字段', async () => {
    provider.reset();
    const created = await provider.createTask({ subject: 'Old', description: 'desc' });
    const result = await provider.updateTask(created.id, { subject: 'New', status: 'in_progress' });
    expect(result.success).toBe(true);
    expect(result.updatedFields).toContain('subject');
    expect(result.updatedFields).toContain('status');
    expect(result.statusChange).toEqual({ from: 'pending', to: 'in_progress' });
  });

  it('updateTask → 任务不存在', async () => {
    provider.reset();
    const result = await provider.updateTask('nonexistent', { subject: 'New' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('deleteTask → 直接删除', async () => {
    provider.reset();
    const created = await provider.createTask({ subject: 'Test', description: 'desc' });
    await provider.deleteTask(created.id);
    const fetched = await provider.getTask(created.id);
    expect(fetched).toBeNull();
  });

  it('reset → 清空所有任务', async () => {
    provider.reset();
    await provider.createTask({ subject: 'T1', description: 'd1' });
    await provider.createTask({ subject: 'T2', description: 'd2' });
    provider.reset();
    const list = await provider.listTasks();
    expect(list).toEqual([]);
  });
});
