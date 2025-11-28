/**
 * 上传控制器
 * 负责控制上传任务的暂停、恢复和取消
 */
import { ref } from 'vue';
import type { FileTask, IUploadController } from '../types';
import { UploadStatus } from '../types';
import { logger } from '../utils/logger';
import { safeAbort, abortAll, combineAbortSignals } from '../utils/abort-controller';

export class UploadController implements IUploadController {
  private taskAbortControllers = new Map<string, AbortController>();
  private chunkAbortControllers = new Map<string, Map<number, AbortController>>();

  public readonly isPaused = ref(false);
  public readonly pausedTasks = new Set<string>();

  private getTask: (taskId: string) => FileTask | undefined = () => undefined;

  setTaskGetter(getter: (taskId: string) => FileTask | undefined): void {
    this.getTask = getter;
  }

  pause(taskId: string): void {
    const task = this.getTask(taskId);
    if (!this.canPause(task, taskId) || !task) return;

    // 如果任务还没有 AbortController，创建一个（用于后续中止）
    if (!this.taskAbortControllers.has(taskId)) {
      this.createAbortController(taskId);
    }

    this.abortTask(taskId);
    this.updateTaskStatus(task, UploadStatus.PAUSED, { pausedTime: Date.now() });
    this.pausedTasks.add(taskId);
    this.isPaused.value = this.pausedTasks.size > 0;

    logger.info('任务已暂停', { taskId, fileName: task.file.name });
  }

  /**
   * 检查是否可以暂停
   */
  private canPause(task: FileTask | undefined, taskId: string): boolean {
    // 允许暂停正在上传或待上传的任务
    if (!task || (task.status !== UploadStatus.UPLOADING && task.status !== UploadStatus.PENDING)) {
      logger.debug('暂停任务失败：任务不存在或不在上传中', { taskId, status: task?.status });
      return false;
    }
    return true;
  }

  /**
   * 更新任务状态（统一方法）
   */
  private updateTaskStatus(
    task: FileTask,
    status: UploadStatus,
    updates: Partial<Pick<FileTask, 'pausedTime' | 'resumeTime' | 'endTime'>>
  ): void {
    task.status = status;
    if (updates.pausedTime !== undefined) task.pausedTime = updates.pausedTime;
    if (updates.resumeTime !== undefined) task.resumeTime = updates.resumeTime;
    if (updates.endTime !== undefined) task.endTime = updates.endTime;
  }

  resume(taskId: string): void {
    const task = this.getTask(taskId);
    if (!this.canResume(task, taskId) || !task) return;

    this.createAbortController(taskId);
    this.updateTaskStatus(task, UploadStatus.PENDING, { resumeTime: Date.now() });
    this.pausedTasks.delete(taskId);
    this.isPaused.value = this.pausedTasks.size > 0;

    logger.info('任务已恢复', { taskId, fileName: task.file.name });
  }

  /**
   * 检查是否可以恢复
   */
  private canResume(task: FileTask | undefined, taskId: string): boolean {
    if (!task || task.status !== UploadStatus.PAUSED) {
      logger.debug('恢复任务失败：任务不存在或未暂停', { taskId, status: task?.status });
      return false;
    }
    return true;
  }

  cancel(taskId: string): void {
    const task = this.getTask(taskId);
    if (!task) {
      logger.debug('取消任务失败：任务不存在', { taskId });
      return;
    }

    this.abortTask(taskId);
    this.updateTaskStatus(task, UploadStatus.CANCELLED, { endTime: Date.now() });
    this.pausedTasks.delete(taskId);

    logger.info('任务已取消', { taskId, fileName: task.file.name });
  }

  pauseAll(): void {
    this.isPaused.value = true;
    const taskIds = Array.from(this.taskAbortControllers.keys());
    taskIds.forEach(taskId => this.pause(taskId));
  }

  resumeAll(): void {
    this.isPaused.value = false;
    const pausedTaskIds = Array.from(this.pausedTasks);
    pausedTaskIds.forEach(taskId => this.resume(taskId));
  }

  cancelAll(): void {
    const taskIds = Array.from(this.taskAbortControllers.keys());
    taskIds.forEach(taskId => this.cancel(taskId));
    this.clearAll();
  }

  /**
   * 清空所有控制器
   */
  private clearAll(): void {
    this.taskAbortControllers.clear();
    this.chunkAbortControllers.clear();
    this.pausedTasks.clear();
  }

  // 创建任务的 AbortController
  createAbortController(taskId: string): AbortController {
    const controller = new AbortController();
    this.taskAbortControllers.set(taskId, controller);
    return controller;
  }

  // 创建分片的 AbortController
  createChunkAbortController(taskId: string, chunkIndex: number): AbortController {
    const controller = new AbortController();

    if (!this.chunkAbortControllers.has(taskId)) {
      this.chunkAbortControllers.set(taskId, new Map());
    }

    this.chunkAbortControllers.get(taskId)!.set(chunkIndex, controller);
    return controller;
  }

  // 获取任务的 AbortSignal
  getTaskAbortSignal(taskId: string): AbortSignal | undefined {
    return this.taskAbortControllers.get(taskId)?.signal;
  }

  // 获取分片的 AbortSignal（使用工具函数）
  getChunkAbortSignal(taskId: string, chunkIndex: number): AbortSignal | undefined {
    const taskSignal = this.taskAbortControllers.get(taskId)?.signal;
    const chunkSignal = this.chunkAbortControllers.get(taskId)?.get(chunkIndex)?.signal;

    return combineAbortSignals(taskSignal, chunkSignal);
  }

  // 中止任务（完善资源清理）
  private abortTask(taskId: string): void {
    const taskController = this.taskAbortControllers.get(taskId);
    safeAbort(taskController);
    if (taskController) {
      this.taskAbortControllers.delete(taskId);
    }

    const chunkControllers = this.chunkAbortControllers.get(taskId);
    if (chunkControllers) {
      abortAll(Array.from(chunkControllers.values()));
      this.chunkAbortControllers.delete(taskId);
    }

    logger.debug('任务中止完成', { taskId });
  }

  // 清理已完成任务的控制器（完善资源清理）
  cleanupTask(taskId: string): void {
    // 安全中止所有相关控制器
    const taskController = this.taskAbortControllers.get(taskId);
    safeAbort(taskController);
    this.taskAbortControllers.delete(taskId);

    const chunkControllers = this.chunkAbortControllers.get(taskId);
    if (chunkControllers) {
      abortAll(Array.from(chunkControllers.values()));
      this.chunkAbortControllers.delete(taskId);
    }

    this.pausedTasks.delete(taskId);
    logger.debug('任务资源清理完成', { taskId });
  }

  // 检查是否应该暂停
  shouldPause(taskId: string): boolean {
    return this.isPaused.value || this.pausedTasks.has(taskId);
  }
}

