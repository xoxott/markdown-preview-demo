import { FileTask, ChunkInfo, UploadStatus, ChunkStatus, MergeResponse } from '../type';
import { ChunkManager } from '../managers/ChunkManager';
import { UploadController } from '../controllers/UploadController';
import { CallbackManager } from '../managers/CallbackManager';
import { ProgressManager } from '../managers/ProgressManager';
import { delay } from '../utils';
import { CONSTANTS } from '../constants';
import Semaphore from '../Semaphore';
import RetryStrategyManager from '../managers/RetryStrategyManager';
import CacheManager from '../managers/CacheManager';

export class ChunkUploadTask {
  private uploadPromise?: Promise<void>;
  private completed = false;
  private aborted = false;

  constructor(
    private task: FileTask,
    private config: any,
    private chunkManager: ChunkManager,
    private cacheManager: CacheManager,
    private retryStrategy: RetryStrategyManager,
    private callbackManager: CallbackManager,
    private progressManager: ProgressManager,
    private uploadController: UploadController
  ) {}

  async start(): Promise<void> {
    this.uploadPromise = this.upload();
    return this.uploadPromise;
  }

  async wait(): Promise<void> {
    if (this.uploadPromise) {
      await this.uploadPromise;
    }
  }

  isCompleted(): boolean {
    return this.completed;
  }

  isAborted(): boolean {
    return this.aborted;
  }

  private async upload(): Promise<void> {
    try {
      // 检查任务是否已经被取消或暂停
      if (this.checkIfShouldStop()) {
        return;
      }

      // 开始上传
      this.task.status = UploadStatus.UPLOADING;
      this.task.startTime = Date.now();
      await this.callbackManager.emit('onFileStart', this.task);

      // 检查秒传
      const canSkip = await this.checkDeduplication();
      if (canSkip) {
        this.handleSuccess();
        return;
      }

      // 再次检查是否应该停止
      if (this.checkIfShouldStop()) {
        return;
      }

      // 创建分片
      await this.createChunks();

      // 上传分片
      await this.uploadChunks();

      // 上传完成后检查任务状态
      // 注意：此时状态可能已经被外部改变
      if (this.checkIfShouldStop()) {
        console.log(`任务 ${this.task.file.name} 在上传分片后被${this.task.status === UploadStatus.PAUSED ? '暂停' : '取消'}`);
        return;
      }

      // 合并分片
      const mergeResult = await this.mergeChunks();
      this.task.result = mergeResult;

      // 最终检查
      if (!this.checkIfShouldStop()) {
        this.handleSuccess();
      }
    } catch (error) {
      // 检查是否是中止错误
      if (this.isAbortError(error)) {
        console.log(`任务 ${this.task.file.name} 被中止`);
        this.aborted = true;
        return;
      }
      
      await this.handleError(error as Error);
    } finally {
      this.completed = true;
      this.progressManager.updateFileProgress(this.task);
    }
  }

  /**
   * 检查是否应该停止上传
   */
  private checkIfShouldStop(): boolean {
    // 重新获取任务的最新状态
    const currentStatus = this.task.status;
    
    // 检查暂停状态
    if (currentStatus === UploadStatus.PAUSED || this.uploadController.shouldPause(this.task.id)) {
      if (currentStatus !== UploadStatus.PAUSED) {
        this.task.status = UploadStatus.PAUSED;
        this.task.pausedTime = Date.now();
      }
      return true;
    }
    
    // 检查取消状态
    if (currentStatus === UploadStatus.CANCELLED) {
      return true;
    }
    
    return false;
  }

  /**
   * 检查是否是中止错误
   */
  private isAbortError(error: any): boolean {
    return error?.name === 'AbortError' || 
           error?.code === 'ABORT_ERR' ||
           error?.message?.includes('aborted');
  }

  private async checkDeduplication(): Promise<boolean> {
    if (!this.config.enableDeduplication || !this.config.checkFileUrl) {
      return false;
    }

    const cacheKey = this.getCacheKey();
    if (this.config.enableCache && this.cacheManager.get(cacheKey) === 'uploaded') {
      console.log(`文件 ${this.task.file.name} 命中缓存，跳过上传`);
      return true;
    }

    try {
      const requestData = this.config.checkFileTransformer({
        task: this.task,
        customParams: this.config.customParams
      });

      const signal = this.uploadController.getTaskAbortSignal(this.task.id);
      if (!signal) {
        console.warn('无法获取 AbortSignal，跳过秒传检查');
        return false;
      }
      
      const response = await fetch(this.config.checkFileUrl, {
        method: 'POST',
        headers: this.getHeaders(requestData),
        body: this.getRequestBody(requestData),
        signal
      });

      if (!response.ok) {
        console.warn(`秒传检查失败: ${response.status}`);
        return false;
      }

      const result = await response.json();
      if (result?.exists === true || result?.uploaded === true) {
        console.log(`文件 ${this.task.file.name} 已存在，启用秒传`);
        if (this.config.enableCache) {
          this.cacheManager.set(cacheKey, 'uploaded');
        }
        // 如果服务端返回了文件信息，保存到任务中
        if (result.fileInfo) {
          this.task.result = result.fileInfo;
        }
        return true;
      }
    } catch (error) {
      if (!this.isAbortError(error)) {
        console.warn('秒传检查失败:', error);
      }
    }

    return false;
  }

  private getCacheKey(): string {
    return `file_${this.task.file.name}_${this.task.file.size}_${this.task.file.lastModified}`;
  }

  private async createChunks(): Promise<void> {
    if (this.task.chunks && this.task.chunks.length > 0) {
      console.log(`任务 ${this.task.file.name} 已有分片，跳过创建`);
      return;
    }

    const chunkSize = this.config.enableNetworkAdaptation
      ? this.chunkManager.calculateOptimalChunkSize(
          this.task.file.size,
          this.progressManager.getAverageSpeed()
        )
      : (this.task.options.chunkSize || this.config.chunkSize);

    await this.chunkManager.createChunks(this.task, chunkSize);
    console.log(`任务 ${this.task.file.name} 创建了 ${this.task.totalChunks} 个分片`);
  }

  private async uploadChunks(): Promise<void> {
    const maxConcurrent = this.config.maxConcurrentChunks;
    const semaphore = new Semaphore(maxConcurrent);
    const uploadPromises: Promise<void>[] = [];
    let shouldStop = false;

    for (let i = 0; i < this.task.chunks.length; i++) {
      const chunk = this.task.chunks[i];
      
      // 检查是否应该停止
      if (this.checkIfShouldStop()) {
        console.log(`⏸️ 任务 ${this.task.file.name} 停止创建新的分片上传`);
        shouldStop = true;
        break;
      }

      // 跳过已成功的分片（断点续传）
      if (chunk.status === ChunkStatus.SUCCESS) {
        this.task.uploadedChunks++;
        this.progressManager.updateFileProgress(this.task);
        continue;
      }

      const uploadPromise = this.uploadSingleChunk(chunk, semaphore);
      uploadPromises.push(uploadPromise);
    }

    // 等待所有已启动的分片上传完成或被中止
    try {
      await Promise.all(uploadPromises);
    } catch (error) {
      if (!this.isAbortError(error)) {
        throw error;
      }
    }

    // 如果是因为暂停而停止，保存进度
    if (shouldStop && this.config.enableResume && this.config.enableCache) {
      this.saveProgress();
    }
  }

  private async uploadSingleChunk(chunk: ChunkInfo, semaphore: Semaphore): Promise<void> {
    await semaphore.acquire();
    
    try {
      // 获取之前再次检查
      if (this.checkIfShouldStop()) {
        console.log(`⏸️ 分片 ${chunk.index} 不开始上传，任务已停止`);
        return;
      }

      const maxRetries = this.task.options.maxRetries || this.config.maxRetries;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // 创建分片专用的 AbortController
          const controller = this.uploadController.createChunkAbortController(this.task.id, chunk.index);
          const signal = controller.signal;

          // 开始上传前最后检查
          if (this.checkIfShouldStop()) {
            return;
          }

          await this.chunkManager.uploadChunk(this.task, chunk, signal);
          
          // 上传成功
          this.task.uploadedChunks++;
          this.progressManager.updateFileProgress(this.task);
          await this.callbackManager.emit('onFileProgress', this.task);
          await this.callbackManager.emit('onChunkSuccess', this.task, chunk);
          
          return;
        } catch (error: any) {
          lastError = error;
          
          // 如果是中止错误，直接返回
          if (this.isAbortError(error)) {
            console.log(`🛑 分片 ${chunk.index} 上传被中止`);
            chunk.status = ChunkStatus.PENDING; // 重置为待上传，以便恢复时重新上传
            return;
          }

          // 记录错误
          chunk.error = error;
          console.error(`分片 ${chunk.index} 上传失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`, error);
          
          // 检查是否需要重试
          if (attempt < maxRetries && this.retryStrategy.shouldRetry(this.task, error)) {
            const retryDelay = this.retryStrategy.calculateDelay(attempt, true);
            console.log(`分片 ${chunk.index} 将在 ${retryDelay}ms 后重试`);
            await delay(retryDelay);
            chunk.status = ChunkStatus.RETRYING;
            continue;
          }

          // 重试次数用尽
          chunk.status = ChunkStatus.ERROR;
          await this.callbackManager.emit('onChunkError', this.task, chunk, error);
          throw error;
        }
      }

      // 不应该到达这里
      if (lastError) {
        throw lastError;
      }
    } finally {
      semaphore.release();
    }
  }

  private async mergeChunks(): Promise<MergeResponse> {
    this.task.progress = CONSTANTS.PROGRESS.MERGE_START;
    await this.callbackManager.emit('onFileProgress', this.task);

    const signal = this.uploadController.getTaskAbortSignal(this.task.id);
    if (!signal) {
      throw new Error('无法创建 AbortSignal');
    }

    try {
      const result = await this.chunkManager.mergeChunks(this.task, signal);
      
      this.task.progress = CONSTANTS.PROGRESS.MERGE_END;
      await this.callbackManager.emit('onFileProgress', this.task);
      
      return result;
    } catch (error) {
      if (this.isAbortError(error)) {
        throw new Error('合并操作被中止');
      }
      throw error;
    }
  }

  private handleSuccess(): void {
    this.task.status = UploadStatus.SUCCESS;
    this.task.progress = 100;
    this.task.endTime = Date.now();
    
    // 清除缓存的进度信息
    if (this.config.enableCache) {
      this.cacheManager.remove(`progress_${this.task.id}`);
    }
    
    this.callbackManager.emit('onFileSuccess', this.task);
  }

  private async handleError(error: Error): Promise<void> {
    // 只有在任务还在上传中时才设置为错误状态
    if (this.task.status === UploadStatus.UPLOADING) {
      this.task.status = UploadStatus.ERROR;
      this.task.error = error;
      this.task.endTime = Date.now();
      await this.callbackManager.emit('onFileError', this.task, error);
    }
  }

  private saveProgress(): void {
    const progressKey = `progress_${this.task.id}`;
    const progressData = {
      taskId: this.task.id,
      fileName: this.task.file.name,
      fileSize: this.task.file.size,
      uploadedChunks: this.task.uploadedChunks,
      totalChunks: this.task.totalChunks,
      chunks: this.task.chunks.map(chunk => ({
        index: chunk.index,
        status: chunk.status,
        etag: chunk.etag
      }))
    };
    
    this.cacheManager.set(progressKey, progressData);
    console.log(`保存任务 ${this.task.file.name} 的进度`);
  }

  private getHeaders(requestData: any): HeadersInit {
    const isFormData = requestData instanceof FormData;
    return {
      ...this.config.headers,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' })
    };
  }

  private getRequestBody(requestData: any): BodyInit {
    return requestData instanceof FormData 
      ? requestData 
      : JSON.stringify(requestData);
  }
}
