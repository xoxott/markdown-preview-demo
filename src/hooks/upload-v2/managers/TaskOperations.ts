/**
 * 任务操作管理器
 * 负责处理暂停、恢复、取消、重试等操作
 */
import type { FileTask, ExtendedUploadConfig } from '../types';
import { UploadStatus } from '../types';
import { UploadController } from '../controllers/UploadController';
import { CallbackManager } from './CallbackManager';
import { ProgressPersistence } from './ProgressPersistence';
import { TaskStateManager } from './TaskStateManager';
import { QueueManager } from './QueueManager';
import { ProgressManager } from './ProgressManager';
import { ChunkCalculator } from '../calculators/ChunkCalculator';
import { resetTaskForRetry, filterTasksByStatus, updateTasksStatus, getAllTasks } from '../utils/task-helpers';
import { existsInArray } from '../utils/array-helpers';
import { resetChunkForRetry } from '../utils/chunk-helpers';
import type { ChunkInfo } from '../types';

/**
 * 任务操作管理器
 */
export class TaskOperations {
  constructor(
    private config: ExtendedUploadConfig,
    private uploadController: UploadController,
    private callbackManager: CallbackManager,
    private progressPersistence: ProgressPersistence,
    private taskStateManager: TaskStateManager,
    private queueManager: QueueManager,
    private progressManager: ProgressManager
  ) {}

  /**
   * 暂停单个任务
   */
  pause(taskId: string, isUploading: () => boolean): void {
    const task = this.taskStateManager.getTask(taskId);
    if (!task) return;

    this.uploadController.pause(taskId);

    if (task.status === UploadStatus.UPLOADING) {
      task.status = UploadStatus.PAUSED;
      task.pausedTime = Date.now();

      if (this.config.enableResume && this.config.enableCache) {
        this.progressPersistence.saveTaskProgress(task);
      }

      this.callbackManager.emit('onFilePause', task);
    }
  }

  /**
   * 恢复单个任务
   */
  resume(taskId: string, isUploading: () => boolean, startUpload: () => void): void {
    const task = this.taskStateManager.getTask(taskId);
    if (!task || task.status !== UploadStatus.PAUSED) return;

    if (this.config.enableResume && this.config.enableCache) {
      this.progressPersistence.restoreTaskProgress(task);
    }

    this.uploadController.resume(taskId);
    task.status = UploadStatus.PENDING;
    task.pausedTime = 0;

    this.taskStateManager.completedUploads.value = this.taskStateManager.completedUploads.value.filter(
      t => t.id !== taskId
    );

    if (
      !this.taskStateManager.uploadQueue.value.some(t => t.id === taskId) &&
      !this.taskStateManager.activeUploads.value.has(taskId)
    ) {
      this.taskStateManager.uploadQueue.value.unshift(task);
    }

    this.callbackManager.emit('onFileResume', task);

    if (!isUploading()) {
      startUpload();
    }
  }

  /**
   * 暂停所有上传
   */
  pauseAll(): void {
    // 先设置 isPaused 状态
    this.uploadController.isPaused.value = true;
    
    const allTasks = getAllTasks(
      this.taskStateManager.uploadQueue.value,
      this.taskStateManager.activeUploads.value,
      []
    );

    const tasksToPause = allTasks.filter(
      task => task.status === UploadStatus.UPLOADING || task.status === UploadStatus.PENDING
    );

    // 更新任务状态
    updateTasksStatus(tasksToPause, UploadStatus.PAUSED, { pausedTime: Date.now() });

    // 为每个任务调用 controller 的 pause（会添加到 pausedTasks 并中止任务）
    tasksToPause.forEach(task => {
      this.uploadController.pause(task.id);
      if (this.config.enableResume && this.config.enableCache) {
        this.progressPersistence.saveTaskProgress(task);
      }
      this.callbackManager.emit('onFilePause', task);
    });
  }

  /**
   * 恢复所有上传
   */
  resumeAll(isUploading: () => boolean, startUpload: () => void): void {
    const allPausedTasks = [
      ...filterTasksByStatus(this.taskStateManager.completedUploads.value, UploadStatus.PAUSED),
      ...filterTasksByStatus(this.taskStateManager.uploadQueue.value, UploadStatus.PAUSED)
    ];

    if (allPausedTasks.length === 0) {
      return;
    }

    if (this.config.enableResume && this.config.enableCache) {
      allPausedTasks.forEach(task => this.progressPersistence.restoreTaskProgress(task));
    }

    updateTasksStatus(allPausedTasks, UploadStatus.PENDING, { pausedTime: 0 });
    allPausedTasks.forEach(task => this.uploadController.resume(task.id));

    // 从已完成列表中移除
    this.taskStateManager.completedUploads.value = this.taskStateManager.completedUploads.value.filter(
      t => !allPausedTasks.some(pt => pt.id === t.id)
    );

    // 添加到队列
    allPausedTasks.forEach(task => {
      if (
        !existsInArray(this.taskStateManager.uploadQueue.value, t => t.id === task.id) &&
        !this.taskStateManager.activeUploads.value.has(task.id)
      ) {
        this.taskStateManager.uploadQueue.value.push(task);
      }
    });

    this.uploadController.resumeAll();
    this.queueManager.sort(this.taskStateManager.uploadQueue.value);

    allPausedTasks.forEach(task => {
      this.callbackManager.emit('onFileResume', task);
    });

    if (!isUploading()) {
      startUpload();
    }
  }

  /**
   * 取消单个任务
   */
  cancel(taskId: string): void {
    const task = this.taskStateManager.getTask(taskId);
    if (!task) return;

    this.uploadController.cancel(taskId);
    task.status = UploadStatus.CANCELLED;
    task.endTime = Date.now();

    this.taskStateManager.removeFile(taskId);
    this.callbackManager.emit('onFileCancel', task);
  }

  /**
   * 取消所有任务
   */
  cancelAll(): void {
    this.uploadController.cancelAll();

    const allTasks = this.taskStateManager.getAllTasks();
    updateTasksStatus(allTasks, UploadStatus.CANCELLED, { endTime: Date.now() });

    this.taskStateManager.clear();
  }

  /**
   * 重试单个失败的文件
   */
  retrySingleFile(taskId: string, isUploading: () => boolean, startUpload: () => void): void {
    const taskIndex = this.taskStateManager.completedUploads.value.findIndex(
      t => t.id === taskId && t.status === UploadStatus.ERROR
    );

    if (taskIndex === -1) {
      return;
    }

    const task = this.taskStateManager.completedUploads.value[taskIndex];
    this.resetTaskForRetry(task);
    this.taskStateManager.completedUploads.value.splice(taskIndex, 1);

    if (!existsInArray(this.taskStateManager.uploadQueue.value, t => t.id === taskId)) {
      this.taskStateManager.uploadQueue.value.unshift(task);
      this.queueManager.sort(this.taskStateManager.uploadQueue.value);
    }

    if (!isUploading()) {
      startUpload();
    }
  }

  /**
   * 重试所有失败的文件
   */
  retryFailed(isUploading: () => boolean, startUpload: () => void): void {
    const failedTasks = filterTasksByStatus(
      this.taskStateManager.completedUploads.value,
      UploadStatus.ERROR
    );

    if (failedTasks.length === 0) {
      return;
    }

    failedTasks.forEach(task => {
      this.resetTaskForRetry(task);
      this.taskStateManager.uploadQueue.value.push(task);
    });

    this.taskStateManager.completedUploads.value = this.taskStateManager.completedUploads.value.filter(
      t => t.status !== UploadStatus.PENDING
    );

    this.queueManager.sort(this.taskStateManager.uploadQueue.value);

    if (!isUploading() && this.taskStateManager.uploadQueue.value.length > 0) {
      startUpload();
    }
  }

  /**
   * 重置任务状态用于重试（使用工具函数）
   */
  private resetTaskForRetry(task: FileTask): void {
    resetTaskForRetry(task);

    if (this.config.enableNetworkAdaptation) {
      task.options.chunkSize = ChunkCalculator.calculateOptimalChunkSize(
        task.file.size,
        this.progressManager.getAverageSpeed() / 1024,
        this.config
      );
    }

    if (task.chunks) {
      task.chunks.forEach((chunk: ChunkInfo) => {
        resetChunkForRetry(chunk, this.config.enableResume);
      });
    }

    task.options.priority = 'high';
  }
}

