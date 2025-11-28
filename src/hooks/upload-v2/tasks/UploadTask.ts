/**
 * 上传任务类
 * 负责单个文件的完整上传流程
 */
import { CONSTANTS } from '../constants';
import type { UploadController } from '../controllers/UploadController';
import type { CacheManager } from '../managers/CacheManager';
import type { CallbackManager } from '../managers/CallbackManager';
import type { ProgressManager } from '../managers/ProgressManager';
import type { ChunkService } from '../services/ChunkService';
import type { ChunkInfo, FileTask, MergeResponse, UploadConfig } from '../types';
import { ChunkStatus, UploadStatus } from '../types';
import { getPendingChunks } from '../utils/chunk-helpers';
import { buildRequestBody, fetchWithTimeout } from '../utils/fetch-with-timeout';
import { classifyError } from '../utils/retry';
import { Semaphore } from '../utils/semaphore';

/**
 * 上传任务类
 */
export class UploadTask {
  private uploadPromise?: Promise<void>;
  private completed = false;
  private aborted = false;

  constructor(
    private task: FileTask,
    private config: UploadConfig,
    private chunkService: ChunkService,
    private cacheManager: CacheManager,
    private callbackManager: CallbackManager,
    private progressManager: ProgressManager,
    private uploadController: UploadController
  ) {}

  /** 启动上传任务 */
  async start(): Promise<void> {
    this.uploadPromise = this.upload();
    return this.uploadPromise;
  }

  /** 等待上传任务完成 */
  async wait(): Promise<void> {
    if (this.uploadPromise) {
      await this.uploadPromise;
    }
  }

  /** 检查任务是否已完成 */
  isCompleted(): boolean {
    return this.completed;
  }

  /** 检查任务是否被中止 */
  isAborted(): boolean {
    return this.aborted;
  }

  /** 主上传流程 */
  private async upload(): Promise<void> {
    try {
      // 1. 检查任务状态
      if (this.checkIfShouldStop()) {
        return;
      }

      // 2. 初始化上传状态
      this.initializeUpload();

      // 3. 检查秒传
      const canSkip = await this.checkDeduplication();
      if (canSkip) {
        this.handleSuccess();
        return;
      }

      // 4. 再次检查状态
      if (this.checkIfShouldStop()) {
        return;
      }

      // 5. 创建分片
      await this.createChunks();

      // 6. 上传分片
      await this.uploadChunks();

      // 7. 检查上传后的状态
      if (this.checkIfShouldStop()) {
        return;
      }

      // 8. 合并分片
      const mergeResult = await this.mergeChunks();
      this.task.result = mergeResult;

      // 9. 最终成功处理
      if (!this.checkIfShouldStop()) {
        this.handleSuccess();
      }
    } catch (error) {
      // 处理中止错误
      if (this.isAbortError(error)) {
        this.aborted = true;
        return;
      }

      // 处理其他错误
      await this.handleError(error as Error);
    } finally {
      this.completed = true;
      this.progressManager.updateFileProgress(this.task);
      this.cleanup();
    }
  }

  /** 初始化上传状态 */
  private initializeUpload(): void {
    this.task.status = UploadStatus.UPLOADING;
    this.task.startTime = Date.now();
    this.callbackManager.emit('onFileStart', this.task);
  }

  /** 检查是否应该停止上传 */
  private checkIfShouldStop(): boolean {
    const currentStatus = this.task.status;

    if (currentStatus === UploadStatus.PAUSED || this.uploadController.shouldPause(this.task.id)) {
      if (currentStatus !== UploadStatus.PAUSED) {
        this.markAsPaused();
      }
      return true;
    }

    if (currentStatus === UploadStatus.CANCELLED) {
      return true;
    }

    return false;
  }

  /** 标记任务为暂停状态 */
  private markAsPaused(): void {
    this.task.status = UploadStatus.PAUSED;
    this.task.pausedTime = Date.now();

    if (this.config.enableResume && this.config.enableCache) {
      this.saveProgress();
    }
  }

  /** 检查是否是中止错误 */
  private isAbortError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as { name?: string; code?: string; message?: string };
    return err.name === 'AbortError' || err.code === 'ABORT_ERR' || err.message?.includes('aborted') === true;
  }

  /** 检查文件秒传 */
  private async checkDeduplication(): Promise<boolean> {
    if (!this.config.enableDeduplication || !this.config.checkFileUrl) {
      return false;
    }

    // 检查本地缓存
    const cacheKey = this.getCacheKey();
    if (this.config.enableCache && this.cacheManager.get(cacheKey) === 'uploaded') {
      return true;
    }

    // 检查服务端是否已存在
    try {
      const requestData = this.config.checkFileTransformer!({
        task: this.task,
        customParams: this.config.customParams
      });

      const signal = this.uploadController.getTaskAbortSignal(this.task.id);
      if (!signal) {
        return false;
      }

      const { body, headers: bodyHeaders } = buildRequestBody(requestData);
      const headers = {
        ...this.config.headers,
        ...bodyHeaders
      };

      const response = await fetchWithTimeout(this.config.checkFileUrl, {
        method: 'POST',
        headers,
        body,
        signal,
        timeout: this.config.timeout || CONSTANTS.UPLOAD.TIMEOUT
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      if (result.exists) {
        // 保存到缓存
        if (this.config.enableCache) {
          this.cacheManager.set(cacheKey, 'uploaded');
        }
        this.task.result = result;
        return true;
      }

      return false;
    } catch (error) {
      if (this.isAbortError(error)) {
        throw error;
      }
      return false;
    }
  }

  /** 创建分片 */
  private async createChunks(): Promise<void> {
    const chunkSize = this.task.options.chunkSize || this.config.chunkSize;
    await this.chunkService.createChunks(this.task, chunkSize);
  }

  /** 上传分片（支持失败分片重试） */
  private async uploadChunks(): Promise<void> {
    // 获取待上传的分片（使用工具函数）
    const pendingChunks = getPendingChunks(this.task.chunks);

    if (pendingChunks.length === 0) {
      return;
    }

    // 使用信号量控制并发
    const semaphore = new Semaphore(this.config.maxConcurrentChunks);

    // 记录失败的分片
    const failedChunks: ChunkInfo[] = [];

    const uploadPromises = pendingChunks.map(async chunk => {
      await semaphore.acquire();
      try {
        if (this.checkIfShouldStop()) {
          return;
        }

        const signal = this.uploadController.getChunkAbortSignal(this.task.id, chunk.index);
        if (!signal) {
          return;
        }

        await this.chunkService.uploadChunk(this.task, chunk, signal);
        this.task.uploadedChunks++;
        this.progressManager.updateFileProgress(this.task);
        this.callbackManager.emit('onChunkSuccess', this.task, chunk);
      } catch (error) {
        if (this.isAbortError(error)) {
          throw error;
        }

        // 记录失败的分片
        chunk.status = ChunkStatus.ERROR;
        chunk.error = error as Error;
        failedChunks.push(chunk);

        const errorInfo = classifyError(error);
        this.callbackManager.emit('onChunkError', this.task, chunk, error as Error);

        // 记录分片级别的错误统计
        if (!this.task.chunkErrors) {
          this.task.chunkErrors = [];
        }
        this.task.chunkErrors.push({
          chunkIndex: chunk.index,
          error: errorInfo.message,
          errorType: errorInfo.type,
          retryCount: chunk.retryCount
        });
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(uploadPromises);

    // 如果有失败的分片且未达到最大重试次数，记录但继续（由重试机制处理）
    if (failedChunks.length > 0) {
      const maxRetries = this.config.maxRetries || CONSTANTS.RETRY.MAX_RETRIES;
      const stillRetryable = failedChunks.filter(c => c.retryCount < maxRetries);

      if (stillRetryable.length > 0) {
        // 使用 logger 记录（动态导入避免循环依赖）
        try {
          const { logger } = await import('../utils/logger');
          logger.warn(`任务 ${this.task.id} 有 ${stillRetryable.length} 个分片失败，将在重试时处理`, {
            taskId: this.task.id,
            failedChunks: stillRetryable.length,
            totalFailed: failedChunks.length
          });
        } catch {
          // logger 不可用时静默处理
        }
      } else {
        // 所有分片都失败且无法重试，任务失败
        // 检查是否所有待上传的分片都失败了（因为只有 pendingChunks 会被上传）
        // 并且确保有分片需要上传（pendingChunks.length > 0）
        const allPendingChunksFailed = failedChunks.length === pendingChunks.length && pendingChunks.length > 0;
        // 如果所有待上传的分片都失败了，抛出错误
        if (allPendingChunksFailed) {
          const error = new Error(`所有分片上传失败，无法继续上传`);
          throw error;
        }
        // 如果失败的分片数量等于总分片数，也认为所有分片都失败了
        // 这适用于第一次上传时所有分片都失败的情况
        if (failedChunks.length === this.task.chunks.length && this.task.chunks.length > 0) {
          const error = new Error(`所有分片上传失败，无法继续上传`);
          throw error;
        }
      }
    }
  }

  /** 合并分片 */
  private async mergeChunks(): Promise<MergeResponse> {
    const signal = this.uploadController.getTaskAbortSignal(this.task.id);
    if (!signal) {
      throw new Error('无法获取 AbortSignal');
    }

    return await this.chunkService.mergeChunks(this.task, signal);
  }

  /** 处理成功 */
  private handleSuccess(): void {
    this.task.status = UploadStatus.SUCCESS;
    this.task.endTime = Date.now();
    this.task.progress = 100;

    // 保存到缓存
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey();
      this.cacheManager.set(cacheKey, 'uploaded');
    }

    this.callbackManager.emit('onFileSuccess', this.task);
  }

  /** 处理错误 */
  private async handleError(error: Error): Promise<void> {
    this.task.status = UploadStatus.ERROR;
    this.task.error = error;
    this.task.endTime = Date.now();

    this.callbackManager.emit('onFileError', this.task, error);
  }

  /** 保存进度 */
  private saveProgress(): void {
    if (this.config.enableCache) {
      const cacheKey = `progress_${this.task.id}`;
      this.cacheManager.set(cacheKey, {
        uploadedChunks: this.task.uploadedChunks,
        chunks: this.task.chunks.map((c: ChunkInfo) => ({
          index: c.index,
          status: c.status,
          etag: c.etag
        }))
      });
    }
  }

  /** 获取缓存键 */
  private getCacheKey(): string {
    return `file_${this.task.fileMD5 || this.task.file.name}_${this.task.file.size}`;
  }

  /** 清理资源 */
  private cleanup(): void {
    // 释放分片 blob 引用以节省内存
    if (this.task.chunks) {
      this.task.chunks.forEach((chunk: ChunkInfo) => {
        // 如果分片已成功上传且不需要断点续传，可以释放 blob
        if (
          chunk.status === ChunkStatus.SUCCESS &&
          chunk.blob &&
          (!this.config.enableResume || !this.config.enableCache)
        ) {
          // 释放 blob 引用以节省内存
          chunk.blob = null;
        }
      });
    }

    this.uploadController.cleanupTask(this.task.id);
  }
}

