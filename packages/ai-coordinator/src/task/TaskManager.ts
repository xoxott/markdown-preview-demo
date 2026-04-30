/** TaskManager — Task 状态机管理 */

import type { TaskDefinition, TaskStatus, TaskUpdateOp } from '../types/task';
import { DEFAULT_TASK_ID_PREFIX } from '../constants';

export class TaskManager {
  private readonly tasks = new Map<string, TaskDefinition>();

  /** 创建新 Task */
  create(subject: string, description?: string, owner?: string, blockedBy?: readonly string[]): TaskDefinition {
    const taskId = `${DEFAULT_TASK_ID_PREFIX}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const task: TaskDefinition = {
      taskId,
      subject,
      description,
      status: blockedBy && blockedBy.length > 0 ? 'blocked' : 'pending',
      owner,
      blockedBy: blockedBy ? [...blockedBy] : undefined,
      blocks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.tasks.set(taskId, task);
    // 反向更新: blockedBy tasks 的 blocks 字段
    if (blockedBy) {
      for (const depId of blockedBy) {
        const depTask = this.tasks.get(depId);
        if (depTask) {
          depTask.blocks = [...(depTask.blocks ?? []), taskId];
        }
      }
    }
    return task;
  }

  /** 更新 Task */
  update(update: TaskUpdateOp): TaskDefinition | undefined {
    const task = this.tasks.get(update.taskId);
    if (!task) return undefined;

    if (update.subject) task.subject = update.subject;
    if (update.description) task.description = update.description;
    if (update.status) task.status = update.status;
    if (update.owner) task.owner = update.owner;
    if (update.metadata) task.metadata = update.metadata;

    // 添加依赖关系
    if (update.addBlockedBy) {
      task.blockedBy = [...(task.blockedBy ?? []), ...update.addBlockedBy];
      for (const depId of update.addBlockedBy) {
        const depTask = this.tasks.get(depId);
        if (depTask) {
          depTask.blocks = [...(depTask.blocks ?? []), update.taskId];
        }
      }
    }

    if (update.addBlocks) {
      task.blocks = [...(task.blocks ?? []), ...update.addBlocks];
      for (const blockId of update.addBlocks) {
        const blockTask = this.tasks.get(blockId);
        if (blockTask) {
          blockTask.blockedBy = [...(blockTask.blockedBy ?? []), update.taskId];
        }
      }
    }

    task.updatedAt = Date.now();
    return task;
  }

  /** 查找 Task */
  get(taskId: string): TaskDefinition | undefined {
    return this.tasks.get(taskId);
  }

  /** 按状态过滤列表 */
  list(status?: TaskStatus): TaskDefinition[] {
    const all = Array.from(this.tasks.values());
    if (!status) return all;
    return all.filter(t => t.status === status);
  }

  /** 检查依赖是否全部完成，满足则解除 blocked */
  checkDependencies(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || !task.blockedBy) return true;

    const allCompleted = task.blockedBy.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask?.status === 'completed';
    });

    if (allCompleted && task.status === 'blocked') {
      task.status = 'pending';
      task.updatedAt = Date.now();
    }

    return allCompleted;
  }

  /** 取消 Task */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = 'cancelled';
    task.updatedAt = Date.now();
    return true;
  }
}