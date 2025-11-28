/**
 * 上传引擎
 * 负责核心上传流程的执行
 */
import { CONSTANTS } from '../constants';
import type { UploadController } from '../controllers/UploadController';
import type { CacheManager } from '../managers/CacheManager';
import type { CallbackManager } from '../managers/CallbackManager';
import type { ProgressManager } from '../managers/ProgressManager';
import type { StatsManager } from '../managers/StatsManager';
import type { ChunkService } from '../services/ChunkService';
import { UploadTask } from '../tasks/UploadTask';
import type { FileTask, UploadConfig } from '../types';
import { UploadStatus } from '../types';
import { delay } from '../utils/delay';
import { logger } from '../utils/logger';
import { filterTasksByStatus } from '../utils/task-helpers';

/**
 * 上传引擎
 * 负责执行核心上传流程
 */
export class UploadEngine {
  constructor(
    private config: UploadConfig,
    private chunkService: ChunkService,
    private cacheManager: CacheManager,
    private callbackManager: CallbackManager,
    private progressManager: ProgressManager,
    private uploadController: UploadController,
    private statsManager?: StatsManager
  ) {}

  /**
   * 处理上传队列
   */
  async processQueue(
    uploadQueue: FileTask[],
    activeUploads: Map<string, FileTask>,
    completedUploads: FileTask[]
  ): Promise<void> {
    const uploadTasks: UploadTask[] = [];

    while (uploadQueue.length > 0 || activeUploads.size > 0) {
      // 检查是否暂停
      if (this.uploadController.isPaused.value) {
        await Promise.allSettled(uploadTasks.map(t => t.wait()));
        return;
      }

      // 启动新任务
      while (
        uploadQueue.length > 0 &&
        activeUploads.size < this.config.maxConcurrentFiles &&
        !this.uploadController.isPaused.value
      ) {
        const task = uploadQueue.shift()!;

        // 创建 AbortController
        this.uploadController.createAbortController(task.id);

        // 创建上传任务
        const uploadTask = new UploadTask(
          task,
          this.config,
          this.chunkService,
          this.cacheManager,
          this.callbackManager,
          this.progressManager,
          this.uploadController
        );

        activeUploads.set(task.id, task);
        uploadTasks.push(uploadTask);

        // 异步启动任务
        uploadTask.start().then(() => {
          activeUploads.delete(task.id);

          if (!completedUploads.some(t => t.id === task.id)) {
            completedUploads.push(task);
          }

          // 记录统计信息
          if (this.statsManager && task.startTime) {
            const uploadTime = (Date.now() - task.startTime) / 1000; // 转换为秒
            this.statsManager.recordTaskCompletion(task, uploadTime);
          }

          this.uploadController.cleanupTask(task.id);

          logger.debug('任务完成', {
            taskId: task.id,
            fileName: task.file.name,
            status: task.status,
            uploadTime: task.startTime ? (Date.now() - task.startTime) / 1000 : 0
          });
        });
      }

      // 等待至少一个任务完成（优化：避免不必要的过滤）
      if (activeUploads.size > 0) {
        const incompleteTasks = uploadTasks.filter(t => !t.isCompleted());
        if (incompleteTasks.length > 0) {
          await Promise.race(incompleteTasks.map(t => t.wait()));
        } else {
          // 如果没有未完成的任务，等待一小段时间后继续
          await delay(CONSTANTS.NETWORK.POLL_INTERVAL);
        }
      }

      // 短暂延迟
      await delay(CONSTANTS.NETWORK.POLL_INTERVAL);
    }

    // 等待所有任务完成
    await Promise.allSettled(uploadTasks.map(t => t.wait()));
  }

  /**
   * 处理上传完成（使用工具函数优化）
   */
  async handleUploadComplete(completedUploads: FileTask[]): Promise<void> {
    const successTasks = filterTasksByStatus(completedUploads, UploadStatus.SUCCESS);
    const errorTasks = filterTasksByStatus(completedUploads, UploadStatus.ERROR);
    const pausedTasks = filterTasksByStatus(completedUploads, UploadStatus.PAUSED);

    if (errorTasks.length > 0) {
      await this.callbackManager.emit(
        'onAllError',
        new Error(`${errorTasks.length}/${completedUploads.length} 个文件上传失败`)
      );
    } else if (pausedTasks.length === 0) {
      await this.callbackManager.emit('onAllComplete', successTasks);
    }
  }
}

