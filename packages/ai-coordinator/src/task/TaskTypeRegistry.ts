/** TaskTypeRegistry — 任务类型注册表 */

import type { TaskType, TaskTypeIdentifier } from '../types/task-executor';

/** 任务类型注册表 — 管理6种TaskType策略 */
export class TaskTypeRegistry {
  private readonly types = new Map<TaskTypeIdentifier, TaskType>();

  /** 注册 TaskType */
  register(type: TaskType): void {
    if (this.types.has(type.identifier)) {
      throw new Error(`TaskTypeRegistry: "${type.identifier}" 已注册`);
    }
    this.types.set(type.identifier, type);
  }

  /** 按 identifier 查找 */
  get(identifier: TaskTypeIdentifier): TaskType | undefined {
    return this.types.get(identifier);
  }

  /** 获取所有已注册类型 */
  getAll(): TaskType[] {
    return Array.from(this.types.values());
  }

  /** 移除指定类型 */
  remove(identifier: TaskTypeIdentifier): boolean {
    return this.types.delete(identifier);
  }

  /** 清空所有类型 */
  clear(): void {
    this.types.clear();
  }
}
