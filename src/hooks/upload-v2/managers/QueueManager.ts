/**
 * 队列管理器
 * 负责任务队列的排序和管理
 */
import type { FileTask } from '../types';

export class QueueManager {
  private priorities = { high: 3, normal: 2, low: 1 } as const;

  /**
   * 对任务队列进行排序
   */
  sort(queue: FileTask[]): void {
    queue.sort((a, b) => {
      // 确保 priority 是有效的键类型
      const aPriorityKey: keyof typeof this.priorities = (a.options.priority || 'normal') as keyof typeof this.priorities;
      const bPriorityKey: keyof typeof this.priorities = (b.options.priority || 'normal') as keyof typeof this.priorities;

      const aPriority = this.priorities[aPriorityKey];
      const bPriority = this.priorities[bPriorityKey];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return a.file.size - b.file.size;
    });
  }

  /**
   * 判断文件是否重复
   */
  isDuplicate(file: File, allTasks: FileTask[]): boolean {
    return allTasks.some(
      task =>
        task.file.name === file.name && task.file.size === file.size && task.file.lastModified === file.lastModified
    );
  }
}

