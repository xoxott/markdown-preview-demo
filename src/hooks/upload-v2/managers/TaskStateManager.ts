/**
 * 任务状态管理器
 * 负责管理上传队列、活动上传和已完成上传的状态
 */
import { ref, type Ref } from 'vue';
import type { FileTask } from '../types';
import { UploadStatus } from '../types';
import { getAllTasks, filterTasksByStatus, updateTasksStatus } from '../utils/task-helpers';
import { removeFromArray, existsInArray, findInArrays } from '../utils/array-helpers';

/**
 * 任务状态管理器
 */
export class TaskStateManager {
  // 响应式状态
  public readonly uploadQueue: Ref<FileTask[]>;
  public readonly activeUploads: Ref<Map<string, FileTask>>;
  public readonly completedUploads: Ref<FileTask[]>;

  constructor(
    uploadQueue: Ref<FileTask[]>,
    activeUploads: Ref<Map<string, FileTask>>,
    completedUploads: Ref<FileTask[]>
  ) {
    this.uploadQueue = uploadQueue;
    this.activeUploads = activeUploads;
    this.completedUploads = completedUploads;
  }

  /**
   * 获取任务（使用工具函数优化）
   */
  getTask(taskId: string): FileTask | undefined {
    // 先从 Map 中查找（最快）
    const activeTask = this.activeUploads.value.get(taskId);
    if (activeTask) return activeTask;

    // 然后从数组中查找
    return findInArrays(
      [this.uploadQueue.value, this.completedUploads.value],
      t => t.id === taskId
    );
  }

  /**
   * 获取所有任务（使用工具函数）
   */
  getAllTasks(): FileTask[] {
    return getAllTasks(
      this.uploadQueue.value,
      this.activeUploads.value,
      this.completedUploads.value
    );
  }

  /**
   * 移除文件（使用工具函数优化）
   */
  removeFile(taskId: string): void {
    // 从队列中移除
    removeFromArray(this.uploadQueue.value, t => t.id === taskId);

    // 从活动上传中移除
    this.activeUploads.value.delete(taskId);

    // 从已完成列表中移除
    removeFromArray(this.completedUploads.value, t => t.id === taskId);
  }

  /**
   * 检查任务是否存在
   */
  exists(taskId: string): boolean {
    return (
      this.activeUploads.value.has(taskId) ||
      existsInArray(this.uploadQueue.value, t => t.id === taskId) ||
      existsInArray(this.completedUploads.value, t => t.id === taskId)
    );
  }

  /**
   * 添加到队列
   */
  addToQueue(task: FileTask): void {
    if (!existsInArray(this.uploadQueue.value, t => t.id === task.id)) {
      this.uploadQueue.value.push(task);
    }
  }

  /**
   * 添加到活动上传
   */
  addToActive(task: FileTask): void {
    this.activeUploads.value.set(task.id, task);
  }

  /**
   * 从活动上传移除并添加到已完成
   */
  moveToCompleted(taskId: string): void {
    const task = this.activeUploads.value.get(taskId);
    if (task) {
      this.activeUploads.value.delete(taskId);
      if (!existsInArray(this.completedUploads.value, t => t.id === taskId)) {
        this.completedUploads.value.push(task);
      }
    }
  }

  /**
   * 从已完成移除并添加到队列
   */
  moveToQueue(taskId: string): void {
    const taskIndex = this.completedUploads.value.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = this.completedUploads.value[taskIndex];
      this.completedUploads.value.splice(taskIndex, 1);
      if (!existsInArray(this.uploadQueue.value, t => t.id === taskId)) {
        this.uploadQueue.value.unshift(task);
      }
    }
  }

  /**
   * 清空所有状态
   */
  clear(): void {
    this.uploadQueue.value = [];
    this.activeUploads.value.clear();
    this.completedUploads.value = [];
  }

  /**
   * 获取指定状态的任务
   */
  getTasksByStatus(status: UploadStatus): FileTask[] {
    return filterTasksByStatus(this.getAllTasks(), status);
  }

  /**
   * 更新任务状态
   */
  updateTasksStatus(tasks: FileTask[], status: UploadStatus, extra?: Record<string, unknown>): void {
    updateTasksStatus(tasks, status, extra);
  }
}

