/**
 * 任务服务
 * 负责任务的创建、管理和调度
 */
import type { FileTask, FileUploadOptions, UploadConfig } from '../types';
import { UploadStatus } from '../types';
import { generateUUID } from '../utils/id';

/**
 * 任务服务
 */
export class TaskService {
  private priorities = { high: 3, normal: 2, low: 1 } as const;

  constructor(private config: UploadConfig) {}

  /**
   * 创建任务
   */
  createTask(
    file: File,
    processedFile: File,
    options: FileUploadOptions,
    avgSpeed: number,
    preview?: string,
    md5?: string
  ): FileTask {
    // 计算分片大小（简化版，实际应该使用 SmartChunkCalculator）
    const chunkSize = options.chunkSize || this.calculateChunkSize(processedFile.size, avgSpeed);

    // 计算总分片数（但不创建实际分片对象，延迟到上传时创建）
    const totalChunks = processedFile.size > 0 ? Math.ceil(processedFile.size / chunkSize) : 0;

    return {
      id: generateUUID(),
      file: processedFile,
      originalFile: file !== processedFile ? file : undefined,
      status: UploadStatus.PENDING,
      progress: 0,
      speed: 0,
      chunks: [],
      uploadedChunks: 0,
      totalChunks,
      retryCount: 0,
      startTime: null,
      endTime: null,
      pausedTime: 0,
      resumeTime: 0,
      uploadedSize: 0,
      result: null,
      error: null,
      fileMD5: md5 || '',
      options: {
        maxRetries: this.config.maxRetries,
        chunkSize,
        priority: 'normal',
        customParams: {},
        metadata: {
          preview,
          originalSize: file.size,
          compressedSize: processedFile.size,
          compressionRatio: file.size > 0 ? processedFile.size / file.size : 1
        },
        ...options
      }
    };
  }

  /**
   * 对任务队列进行排序
   */
  sort(queue: FileTask[]): void {
    queue.sort((a, b) => {
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

  /**
   * 计算分片大小（简化版）
   */
  private calculateChunkSize(fileSize: number, averageSpeed: number): number {
    // 基础分片大小
    let chunkSize = this.config.chunkSize;

    // 根据文件大小调整
    if (fileSize < 10 * 1024 * 1024) {
      // 小于 10MB，使用较小分片
      chunkSize = Math.min(chunkSize, 512 * 1024);
    } else if (fileSize > 100 * 1024 * 1024) {
      // 大于 100MB，使用较大分片
      chunkSize = Math.min(this.config.maxChunkSize, chunkSize * 2);
    }

    // 根据网络速度调整
    if (averageSpeed > 0) {
      // 网络速度快，可以增大分片
      if (averageSpeed > 5 * 1024 * 1024) {
        // 大于 5MB/s
        chunkSize = Math.min(this.config.maxChunkSize, chunkSize * 1.5);
      } else if (averageSpeed < 100 * 1024) {
        // 小于 100KB/s
        chunkSize = Math.max(this.config.minChunkSize, chunkSize * 0.5);
      }
    }

    return Math.max(this.config.minChunkSize, Math.min(this.config.maxChunkSize, chunkSize));
  }
}

