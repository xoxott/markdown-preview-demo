import type { ChunkInfo, FileTask, MergeResponse } from '../type';
import { ChunkStatus, UploadStatus } from '../type';
import type { ChunkManager } from '../managers/ChunkManager';
import type { UploadController } from '../controllers/UploadController';
import type { CallbackManager } from '../managers/CallbackManager';
import type { ProgressManager } from '../managers/ProgressManager';
import { delay } from '../utils';
import { CONSTANTS } from '../constants';
import Semaphore from '../Semaphore';
import type RetryStrategyManager from '../managers/RetryStrategyManager';
import type CacheManager from '../managers/CacheManager';

/** 分片上传任务类 负责单个文件的完整上传流程:秒传检查、分片创建、分片上传、分片合并 */
export class ChunkUploadTask {
  private uploadPromise?: Promise<void>;
  private completed = false;
  private aborted = false;
  private isPausing = false; // 新增:标记任务是否正在暂停

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

      // 6. 上传分片(核心流程)
      await this.uploadChunks();

      // 7. 检查上传后的状态
      if (this.checkIfShouldStop()) {
        console.log(`⏸️ 任务 ${this.task.file.name} 在上传分片后处于${this.task.status}状态`);
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
        console.log(`🛑 任务 ${this.task.file.name} 被中止`);
        this.aborted = true;
        return;
      }

      // 处理其他错误
      await this.handleError(error as Error);
    } finally {
      // 确保任务完成标记
      this.completed = true;

      // 更新最终进度
      this.progressManager.updateFileProgress(this.task);

      // 清理资源
      this.cleanup();
    }
  }

  /** 初始化上传状态 */
  private initializeUpload(): void {
    this.task.status = UploadStatus.UPLOADING;
    this.task.startTime = Date.now();
    this.callbackManager.emit('onFileStart', this.task);
  }

  /**
   * 检查是否应该停止上传
   *
   * @returns true表示应该停止,false表示可以继续
   */
  private checkIfShouldStop(): boolean {
    const currentStatus = this.task.status;

    // 检查暂停状态
    if (currentStatus === UploadStatus.PAUSED || this.uploadController.shouldPause(this.task.id)) {
      if (currentStatus !== UploadStatus.PAUSED) {
        this.markAsPaused();
      }
      return true;
    }

    // 检查取消状态
    if (currentStatus === UploadStatus.CANCELLED) {
      return true;
    }

    return false;
  }

  /** 标记任务为暂停状态 */
  private markAsPaused(): void {
    this.task.status = UploadStatus.PAUSED;
    this.task.pausedTime = Date.now();
    this.isPausing = true;

    // 保存断点进度
    if (this.config.enableResume && this.config.enableCache) {
      this.saveProgress();
    }
  }

  /** 检查是否是中止错误 */
  private isAbortError(error: any): boolean {
    return error?.name === 'AbortError' || error?.code === 'ABORT_ERR' || error?.message?.includes('aborted');
  }

  /**
   * 检查文件秒传
   *
   * @returns true表示可以秒传,false表示需要正常上传
   */
  private async checkDeduplication(): Promise<boolean> {
    if (!this.config.enableDeduplication || !this.config.checkFileUrl) {
      return false;
    }

    // 检查本地缓存
    const cacheKey = this.getCacheKey();
    if (this.config.enableCache && this.cacheManager.get(cacheKey) === 'uploaded') {
      console.log(`✅ 文件 ${this.task.file.name} 命中本地缓存,跳过上传`);
      return true;
    }

    // 检查服务端是否已存在
    try {
      const requestData = this.config.checkFileTransformer({
        task: this.task,
        customParams: this.config.customParams
      });

      const signal = this.uploadController.getTaskAbortSignal(this.task.id);
      if (!signal) {
        console.warn('⚠️ 无法获取 AbortSignal,跳过秒传检查');
        return false;
      }

      const response = await fetch(this.config.checkFileUrl, {
        method: 'POST',
        headers: this.getHeaders(requestData),
        body: this.getRequestBody(requestData),
        signal
      });

      if (!response.ok) {
        console.warn(`⚠️ 秒传检查失败: ${response.status}`);
        return false;
      }

      const result = await response.json();
      if (result?.exists === true || result?.uploaded === true) {
        console.log(`✅ 文件 ${this.task.file.name} 已存在于服务端,启用秒传`);

        // 缓存秒传结果
        if (this.config.enableCache) {
          this.cacheManager.set(cacheKey, 'uploaded');
        }

        // 保存服务端返回的文件信息
        if (result.fileInfo) {
          this.task.result = result.fileInfo;
        }

        return true;
      }
    } catch (error) {
      if (!this.isAbortError(error)) {
        console.warn('⚠️ 秒传检查失败:', error);
      }
    }

    return false;
  }

  /** 生成缓存键 */
  private getCacheKey(): string {
    return `file_${this.task.file.name}_${this.task.file.size}_${this.task.file.lastModified}`;
  }

  /** 创建文件分片 */
  private async createChunks(): Promise<void> {
    // 如果已有分片(断点续传场景),跳过创建
    if (this.task.chunks && this.task.chunks.length > 0) {
      console.log(`ℹ️ 任务 ${this.task.file.name} 已有${this.task.chunks.length}个分片,跳过创建`);
      return;
    }

    // 计算最优分片大小
    const chunkSize = this.config.enableNetworkAdaptation
      ? this.chunkManager.calculateOptimalChunkSize(this.task.file.size, this.progressManager.getAverageSpeed())
      : this.task.options.chunkSize || this.config.chunkSize;

    await this.chunkManager.createChunks(this.task, chunkSize);
    console.log(
      `📦 任务 ${this.task.file.name} 创建了 ${this.task.totalChunks} 个分片,每片${(chunkSize / 1024 / 1024).toFixed(2)}MB`
    );
  }

  /** 上传所有分片(核心方法) */
  private async uploadChunks(): Promise<void> {
    const maxConcurrent = this.config.maxConcurrentChunks;
    const semaphore = new Semaphore(maxConcurrent);
    const uploadPromises: Promise<void>[] = [];

    console.log(`🚀 开始上传 ${this.task.chunks.length} 个分片,并发数: ${maxConcurrent}`);

    for (let i = 0; i < this.task.chunks.length; i++) {
      const chunk = this.task.chunks[i];

      // 检查是否应该停止创建新的上传任务
      if (this.checkIfShouldStop()) {
        console.log(`⏸️ 任务 ${this.task.file.name} 停止创建新的分片上传任务`);
        break;
      }

      // 跳过已成功的分片(断点续传)
      if (chunk.status === ChunkStatus.SUCCESS) {
        console.log(`✓ 分片 ${chunk.index} 已上传成功,跳过`);
        continue;
      }

      // 创建分片上传任务
      const uploadPromise = this.uploadSingleChunk(chunk, semaphore);
      uploadPromises.push(uploadPromise);
    }

    // 等待所有已启动的分片上传完成
    console.log(`⏳ 等待 ${uploadPromises.length} 个分片上传任务完成...`);
    await Promise.allSettled(uploadPromises);

    // 统计上传结果
    const successCount = this.task.chunks.filter(c => c.status === ChunkStatus.SUCCESS).length;
    const pendingCount = this.task.chunks.filter(c => c.status === ChunkStatus.PENDING).length;
    const errorCount = this.task.chunks.filter(c => c.status === ChunkStatus.ERROR).length;

    console.log(
      `📊 分片上传结果: 成功${successCount}/${this.task.totalChunks}, 待上传${pendingCount}, 失败${errorCount}`
    );

    // 如果是暂停导致的中断,保存进度
    if (this.isPausing && this.config.enableResume && this.config.enableCache) {
      this.saveProgress();
      console.log(`💾 任务 ${this.task.file.name} 进度已保存`);
    }
  }

  /** 上传单个分片(带重试机制) */
  private async uploadSingleChunk(chunk: ChunkInfo, semaphore: Semaphore): Promise<void> {
    // 获取信号量
    await semaphore.acquire();

    try {
      // 开始上传前最后检查
      if (this.checkIfShouldStop()) {
        console.log(`⏸️ 分片 ${chunk.index} 不开始上传,任务已停止`);
        return;
      }

      const maxRetries = this.task.options.maxRetries || this.config.maxRetries;
      let lastError: Error | null = null;

      // 重试循环
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // 上传前再次检查(可能在等待期间状态发生变化)
          if (this.checkIfShouldStop()) {
            console.log(`⏸️ 分片 ${chunk.index} 在第${attempt + 1}次尝试前检测到任务暂停`);
            // 重置为待上传状态,以便恢复时重新上传
            if (chunk.status !== ChunkStatus.SUCCESS) {
              chunk.status = ChunkStatus.PENDING;
            }
            return;
          }

          // 创建分片专用的 AbortController
          const controller = this.uploadController.createChunkAbortController(this.task.id, chunk.index);
          const signal = controller.signal;

          // 执行分片上传
          console.log(
            `⬆️ 开始上传分片 ${chunk.index}/${this.task.totalChunks} (尝试 ${attempt + 1}/${maxRetries + 1})`
          );
          await this.chunkManager.uploadChunk(this.task, chunk, signal);

          // 上传成功处理
          this.task.uploadedChunks++;
          this.progressManager.updateFileProgress(this.task);
          await this.callbackManager.emit('onFileProgress', this.task);
          await this.callbackManager.emit('onChunkSuccess', this.task, chunk);

          console.log(`✅ 分片 ${chunk.index} 上传成功 (${this.task.uploadedChunks}/${this.task.totalChunks})`);
          return;
        } catch (error: any) {
          lastError = error;

          // 处理中止错误(暂停或取消)
          if (this.isAbortError(error)) {
            console.log(`🛑 分片 ${chunk.index} 上传被中止`);
            // 重置为待上传状态,以便恢复时重新上传
            if (chunk.status !== ChunkStatus.SUCCESS) {
              chunk.status = ChunkStatus.PENDING;
            }
            return;
          }

          // 记录错误信息
          chunk.error = error;
          console.error(`❌ 分片 ${chunk.index} 上传失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`, error.message);

          // 判断是否需要重试
          if (attempt < maxRetries && this.retryStrategy.shouldRetry(this.task, error)) {
            const retryDelay = this.retryStrategy.calculateDelay(attempt, true);
            console.log(`🔄 分片 ${chunk.index} 将在 ${retryDelay}ms 后重试`);

            // 设置重试状态
            chunk.status = ChunkStatus.RETRYING;

            // 等待重试延迟
            await delay(retryDelay);

            // 重试前检查任务状态
            if (this.checkIfShouldStop()) {
              console.log(`⏸️ 分片 ${chunk.index} 重试前检测到任务暂停`);
              chunk.status = ChunkStatus.PENDING;
              return;
            }

            continue; // 继续下一次重试
          }

          // 重试次数用尽,标记为错误
          chunk.status = ChunkStatus.ERROR;
          await this.callbackManager.emit('onChunkError', this.task, chunk, error);
          throw error;
        }
      }

      // 理论上不应该到达这里
      if (lastError) {
        throw lastError;
      }
    } finally {
      // 释放信号量
      semaphore.release();
    }
  }

  /** 合并所有分片 - 带渐进式进度更新 */
  private async mergeChunks(): Promise<MergeResponse> {
    console.log(`🔗 开始合并 ${this.task.totalChunks} 个分片...`);

    // 保存当前进度,确保只增不减
    const currentProgress = this.task.progress;

    // 阶段1: 准备合并 (95% 或当前进度,取较大值)
    const mergeStartProgress = Math.max(currentProgress, CONSTANTS.PROGRESS.MERGE_START);
    if (this.task.progress < mergeStartProgress) {
      this.task.progress = mergeStartProgress;
      await this.callbackManager.emit('onFileProgress', this.task);
      console.log(`📊 合并阶段开始: ${this.task.progress.toFixed(2)}%`);
    }

    const signal = this.uploadController.getTaskAbortSignal(this.task.id);
    if (!signal) {
      throw new Error('无法创建 AbortSignal');
    }

    try {
      // 阶段2: 发送合并请求 (97%)
      const mergeInProgressValue = Math.max(
        this.task.progress,
        CONSTANTS.PROGRESS.MERGE_START + (CONSTANTS.PROGRESS.MERGE_END - CONSTANTS.PROGRESS.MERGE_START) * 0.4
      );
      if (this.task.progress < mergeInProgressValue) {
        this.task.progress = mergeInProgressValue;
        await this.callbackManager.emit('onFileProgress', this.task);
        console.log(`📊 合并请求中: ${this.task.progress.toFixed(2)}%`);
      }

      // 执行合并
      const result = await this.chunkManager.mergeChunks(this.task, signal);

      // 阶段3: 合并完成 (99%)
      const mergeEndProgress = Math.max(this.task.progress, CONSTANTS.PROGRESS.MERGE_END);
      if (this.task.progress < mergeEndProgress) {
        this.task.progress = mergeEndProgress;
        await this.callbackManager.emit('onFileProgress', this.task);
        console.log(`📊 合并即将完成: ${this.task.progress.toFixed(2)}%`);
      }

      console.log(`✅ 分片合并成功`);
      return result;
    } catch (error) {
      if (this.isAbortError(error)) {
        throw new Error('合并操作被中止');
      }
      console.error(`❌ 分片合并失败:`, error);
      throw error;
    }
  }

  /** 处理上传成功 */
  private handleSuccess(): void {
    // 确保进度到达100%
    this.task.progress = CONSTANTS.PROGRESS.COMPLETE || 100;
    this.task.status = UploadStatus.SUCCESS;
    this.task.endTime = Date.now();

    // 计算总耗时
    const duration = this.task.endTime - (this.task.startTime || this.task.endTime);
    const fileSize = (this.task.file.size / 1024 / 1024).toFixed(2);
    const avgSpeed = duration > 0 ? (this.task.file.size / 1024 / (duration / 1000)).toFixed(2) : '0';

    console.log(`✅ 任务 ${this.task.file.name} 上传成功 (100%)`);
    console.log(`   - 文件大小: ${fileSize}MB`);
    console.log(`   - 总耗时: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   - 平均速度: ${avgSpeed}KB/s`);

    // 清除缓存的进度信息
    if (this.config.enableCache) {
      this.cacheManager.remove(`progress_${this.task.id}`);
    }

    this.callbackManager.emit('onFileSuccess', this.task);
  }

  /** 处理上传错误 */
  private async handleError(error: Error): Promise<void> {
    // 只有在任务还在上传中时才设置为错误状态
    if (this.task.status === UploadStatus.UPLOADING) {
      this.task.status = UploadStatus.ERROR;
      this.task.error = error;
      this.task.endTime = Date.now();

      console.error(`❌ 任务 ${this.task.file.name} 上传失败:`, error.message);
      await this.callbackManager.emit('onFileError', this.task, error);
    }
  }

  /** 保存上传进度(用于断点续传) */
  private saveProgress(): void {
    const progressKey = `progress_${this.task.id}`;
    const progressData = {
      taskId: this.task.id,
      fileName: this.task.file.name,
      fileSize: this.task.file.size,
      uploadedChunks: this.task.uploadedChunks,
      totalChunks: this.task.totalChunks,
      uploadedSize: this.task.uploadedSize,
      progress: this.task.progress,
      status: this.task.status,
      pausedTime: this.task.pausedTime,
      chunks: this.task.chunks.map(chunk => ({
        index: chunk.index,
        start: chunk.start,
        end: chunk.end,
        size: chunk.size,
        status: chunk.status,
        etag: chunk.etag,
        hash: chunk.hash
      }))
    };

    this.cacheManager.set(progressKey, progressData);
    console.log(
      `💾 保存任务 ${this.task.file.name} 的进度: ${this.task.uploadedChunks}/${this.task.totalChunks} 个分片`
    );
  }

  /** 清理任务资源 */
  private cleanup(): void {
    // 清理 AbortController
    this.uploadController.cleanupTask(this.task.id);
  }

  /** 获取请求头 */
  private getHeaders(requestData: any): HeadersInit {
    const isFormData = requestData instanceof FormData;
    return {
      ...this.config.headers,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' })
    };
  }

  /** 获取请求体 */
  private getRequestBody(requestData: any): BodyInit {
    return requestData instanceof FormData ? requestData : JSON.stringify(requestData);
  }
}
