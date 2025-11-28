/**
 * 进度持久化管理器
 * 负责保存和恢复任务进度
 */
import type { FileTask, ChunkInfo } from '../types';
import { ChunkStatus } from '../types';
import { CacheManager } from './CacheManager';
import { logger } from '../utils/logger';

/**
 * 缓存的进度数据接口
 */
export interface CachedProgressData {
  taskId?: string;
  fileName?: string;
  fileSize?: number;
  uploadedChunks?: number;
  totalChunks?: number;
  uploadedSize?: number;
  progress?: number;
  status?: string;
  pausedTime?: number;
  chunks?: Array<{
    index: number;
    start: number;
    end: number;
    size: number;
    status: string;
    etag?: string;
    hash?: string;
  }>;
}

/**
 * 进度持久化管理器
 */
export class ProgressPersistence {
  constructor(private cacheManager: CacheManager) {}

  /**
   * 保存任务进度
   */
  saveTaskProgress(task: FileTask): void {
    const progressKey = `progress_${task.id}`;
    const progressData: CachedProgressData = {
      taskId: task.id,
      fileName: task.file.name,
      fileSize: task.file.size,
      uploadedChunks: task.uploadedChunks,
      totalChunks: task.totalChunks,
      uploadedSize: task.uploadedSize,
      progress: task.progress,
      status: task.status,
      pausedTime: task.pausedTime,
      chunks:
        task.chunks?.map((chunk: ChunkInfo) => ({
          index: chunk.index,
          start: chunk.start,
          end: chunk.end,
          size: chunk.size,
          status: chunk.status,
          etag: chunk.etag,
          hash: chunk.hash
        })) || []
    };

    this.cacheManager.set(progressKey, progressData);
  }

  /**
   * 恢复任务进度（优化：验证分片有效性）
   */
  restoreTaskProgress(task: FileTask): void {
    const progressKey = `progress_${task.id}`;
    const cachedData = this.cacheManager.get<CachedProgressData>(progressKey);

    if (!cachedData) {
      logger.debug('未找到任务进度缓存', { taskId: task.id });
      return;
    }

    // 验证缓存数据的有效性
    if (cachedData.fileName !== task.file.name || cachedData.fileSize !== task.file.size) {
      logger.warn('任务进度缓存数据不匹配，忽略缓存', {
        taskId: task.id,
        cachedFileName: cachedData.fileName,
        currentFileName: task.file.name,
        cachedFileSize: cachedData.fileSize,
        currentFileSize: task.file.size
      });
      return;
    }

    task.uploadedChunks = cachedData.uploadedChunks || 0;
    task.uploadedSize = cachedData.uploadedSize || 0;
    task.progress = cachedData.progress || 0;

    if (cachedData.chunks && task.chunks) {
      let restoredCount = 0;
      cachedData.chunks.forEach((cachedChunk) => {
        const chunk = task.chunks.find((c: ChunkInfo) => c.index === cachedChunk.index);
        if (chunk) {
          // 验证分片范围是否匹配
          if (chunk.start === cachedChunk.start && chunk.end === cachedChunk.end) {
            chunk.status = cachedChunk.status as ChunkStatus;
            chunk.etag = cachedChunk.etag;
            chunk.hash = cachedChunk.hash;
            restoredCount++;
          } else {
            logger.warn('分片范围不匹配，忽略该分片缓存', {
              taskId: task.id,
              chunkIndex: chunk.index,
              cachedRange: { start: cachedChunk.start, end: cachedChunk.end },
              currentRange: { start: chunk.start, end: chunk.end }
            });
          }
        }
      });

      logger.info('任务进度恢复完成', {
        taskId: task.id,
        restoredChunks: restoredCount,
        totalChunks: task.totalChunks,
        progress: task.progress
      });
    }
  }

  /**
   * 清除任务进度
   */
  clearTaskProgress(taskId: string): void {
    const progressKey = `progress_${taskId}`;
    this.cacheManager.delete(progressKey);
  }
}

