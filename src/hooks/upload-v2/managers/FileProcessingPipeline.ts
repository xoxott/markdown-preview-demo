/**
 * 文件处理管道
 * 负责文件添加、验证、处理流程
 */
import type { FileUploadOptions } from '../types';
import { FileService } from '../services/FileService';
import { TaskService } from '../services/TaskService';
import { ProgressManager } from './ProgressManager';
import { TaskStateManager } from './TaskStateManager';
import { QueueManager } from './QueueManager';
import { logger } from '../utils/logger';
import { batchProcess } from '../utils/batch-processor';

/**
 * 文件处理管道
 */
export class FileProcessingPipeline {
  constructor(
    private fileService: FileService,
    private taskService: TaskService,
    private progressManager: ProgressManager,
    private taskStateManager: TaskStateManager,
    private queueManager: QueueManager
  ) {}

  /**
   * 标准化文件输入
   */
  normalizeFiles(files: File[] | FileList | File): File[] {
    if (files instanceof File) return [files];
    if (files instanceof FileList) return Array.from(files);
    if (Array.isArray(files)) return files;
    throw new Error('不支持的文件类型');
  }

  /**
   * 处理文件添加流程
   */
  async processFiles(
    files: File[] | FileList | File,
    options: FileUploadOptions,
    signal?: AbortSignal
  ): Promise<void> {
    const fileArray = this.normalizeFiles(files);
    const existingCount =
      this.taskStateManager.uploadQueue.value.length +
      this.taskStateManager.activeUploads.value.size;

    // 文件验证
    const { valid: validFiles, errors } = this.fileService.validate(fileArray, existingCount);

    if (validFiles.length === 0) {
      if (errors.length > 0) {
        logger.warn('文件验证失败', {
          errors: errors.map(e => ({ name: e.file.name, reason: e.reason }))
        });
      }
      return;
    }

    // 批量处理文件（使用工具函数）
    logger.info('开始批量添加文件', { totalFiles: validFiles.length, batchSize: 5 });

    const { results: tasks } = await batchProcess({
      items: validFiles,
      batchSize: 5,
      signal,
      processor: async (file, index) => {
        // 检查重复
        if (this.taskService.isDuplicate(file, this.taskStateManager.getAllTasks())) {
          logger.debug('跳过重复文件', { fileName: file.name });
          return null;
        }

        try {
          // 处理文件（验证、压缩、预览、MD5）
          const processed = await this.fileService.processFile(file, options);

          // 创建任务
          const task = this.taskService.createTask(
            file,
            processed.file,
            options,
            this.progressManager.getAverageSpeed() / 1024, // 转换为 KB/s
            processed.preview,
            processed.md5
          );

          logger.debug('文件处理完成', {
            fileName: file.name,
            taskId: task.id,
            index: index + 1
          });

          return task;
        } catch (error) {
          logger.error(`处理文件失败: ${file.name}`, { fileName: file.name }, error as Error);
          return null;
        }
      },
      onProgress: (processed, total) => {
        if (processed % 10 === 0 || processed === total) {
          logger.debug('文件处理进度', { processed, total });
        }
      }
    });

    logger.info('文件添加完成', {
      total: validFiles.length,
      success: tasks.length,
      failed: validFiles.length - tasks.length
    });

    // 添加到队列
    tasks.forEach(task => this.taskStateManager.addToQueue(task));

    // 排序
    this.queueManager.sort(this.taskStateManager.uploadQueue.value);
  }
}

