import { describe, expect, it } from 'vitest';
import { TaskManager } from '../task/TaskManager';

describe('TaskManager', () => {
  it('create 应创建 pending 状态的 Task', () => {
    const tm = new TaskManager();
    const task = tm.create('研究代码结构', '分析项目目录结构');
    expect(task.status).toBe('pending');
    expect(task.subject).toBe('研究代码结构');
    expect(tm.get(task.taskId)).toBeDefined();
  });

  it('create 有 blockedBy 时应为 blocked 状态', () => {
    const tm = new TaskManager();
    const t1 = tm.create('写代码');
    expect(t1.status).toBe('pending');
    const t2 = tm.create('验证', '验证代码', undefined, [t1.taskId]);
    expect(t2.status).toBe('blocked');
    // 反向: t1.blocks 包含 t2
    expect(t1.blocks).toContain(t2.taskId);
  });

  it('checkDependencies 应在所有 blockedBy 完成时解除 blocked', () => {
    const tm = new TaskManager();
    const t1 = tm.create('写代码');
    const t2 = tm.create('验证', undefined, undefined, [t1.taskId]);
    expect(t2.status).toBe('blocked');

    // t1 未完成 → 依赖不满足
    expect(tm.checkDependencies(t2.taskId)).toBe(false);
    expect(t2.status).toBe('blocked');

    // t1 完成 → 依赖满足
    tm.update({ taskId: t1.taskId, status: 'completed' });
    expect(tm.checkDependencies(t2.taskId)).toBe(true);
    expect(t2.status).toBe('pending');
  });
});
