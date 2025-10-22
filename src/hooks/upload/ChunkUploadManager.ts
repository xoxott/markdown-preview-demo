/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-11 10:36:56
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:20:00
 * @FilePath: \markdown-preview-demo\src\hooks\upload\ChunkUploadManager.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { computed, ref, watch } from "vue";
import CacheManager from "./CacheManager";
import { CONSTANTS } from "./constants";
import EnhancedSpeedCalculator from "./EnhancedSpeedCalculator";
import FileCompressor from "./FileCompressor";
import FileValidator from "./FileValidator";
import NetworkAdapter from "./NetworkAdapter";
import PreviewGenerator from './PreviewGenerator';
import RetryStrategyManager from "./RetryStrategyManager";
import Semaphore from "./Semaphore";
import SmartChunkCalculator from "./SmartChunkCalculator";
import TaskQueueManager from "./TaskQueueManager";
import { 
    ChunkInfo,
    ChunkStatus, 
    ChunkUploadResponse,
    FileTask, 
    FileUploadOptions, 
    MergeResponse, 
    UploadCallbacks, 
    UploadConfig, 
    UploadStats, 
    UploadStatus 
  } from "./type";
import UploadWorkerManager from "./UploadWorkerManager";
import { calculateFileMD5, delay } from "./utils";

// ==================== 主类：分片上传管理器 ====================
export class ChunkUploadManager {
  private config: UploadConfig;
  private callbacks: UploadCallbacks = {};
  private cacheManager: CacheManager;
  private networkAdapter: NetworkAdapter;
  private fileValidator: FileValidator;
  private taskQueueManager: TaskQueueManager;
  private retryStrategy: RetryStrategyManager;
  private workerManager?: UploadWorkerManager;

  // 响应式状态
  public readonly uploadQueue = ref<FileTask[]>([]);
  public readonly activeUploads = ref<Map<string, FileTask>>(new Map());
  public readonly completedUploads = ref<FileTask[]>([]);
  public readonly totalProgress = ref(0);
  public readonly uploadSpeed = ref(0);
  public readonly isUploading = ref(false);
  public readonly isPaused = ref(false);
  public readonly networkQuality = ref<'good' | 'fair' | 'poor'>('good');

  // 计算属性
  public readonly uploadStats = computed<UploadStats>(() => this.calculateStats());

  private speedCalculator = new EnhancedSpeedCalculator();
  private abortController = new AbortController();
  private adaptiveConfig = {
    lastAdjustTime: 0,
    adjustInterval: CONSTANTS.NETWORK.ADJUST_INTERVAL,
  };

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.cacheManager = new CacheManager();
    this.networkAdapter = new NetworkAdapter(this.config);
    this.fileValidator = new FileValidator(this.config);
    this.taskQueueManager = new TaskQueueManager();
    this.retryStrategy = new RetryStrategyManager(this.config);
    
    // 初始化 Worker
    if (this.config.useWorker) {
      this.workerManager = new UploadWorkerManager();
    }

    this.setupWatchers();
    this.setupNetworkMonitoring();
  }

  // ==================== 配置管理 ====================
  private mergeConfig(config: Partial<UploadConfig>): UploadConfig {
    return {
       // 并发控制
      maxConcurrentFiles: CONSTANTS.CONCURRENT.DEFAULT_FILES, // 文件最大数量
      maxConcurrentChunks: CONSTANTS.CONCURRENT.DEFAULT_CHUNKS, // 切块最大数量

      // 分片配置
      chunkSize: CONSTANTS.UPLOAD.CHUNK_SIZE,
      minChunkSize: CONSTANTS.UPLOAD.MIN_CHUNK_SIZE,
      maxChunkSize: CONSTANTS.UPLOAD.MAX_CHUNK_SIZE,
      
      // 重试配置
      maxRetries: CONSTANTS.RETRY.MAX_RETRIES,
      retryDelay: CONSTANTS.RETRY.BASE_DELAY,
      retryBackoff: CONSTANTS.RETRY.BACKOFF_MULTIPLIER,

      uploadChunkUrl: '',
      mergeChunksUrl: '',
      checkFileUrl: '',

      headers: {},  //请求头配置
      timeout: CONSTANTS.UPLOAD.TIMEOUT, // 超时时间
      customParams: {}, // 自定参数

      // 文件限制
      maxFileSize:CONSTANTS.UPLOAD.MAX_FILESIZE,
      maxFiles: CONSTANTS.UPLOAD.MAX_FILES,
      // accept: ['.jpg', '.png', '.pdf', 'image/*', 'video/*'],

      // 功能开关
      enableResume: false,  // 断点续传
      enableDeduplication: true, // 秒传
  
     
      useWorker: false,  // Web Worker
      enableCache: true, // 缓存
      enableNetworkAdaptation: true, // 网络自适应
      enableSmartRetry: true,  // 智能重试

      // 图片压缩配置
      enableCompression: CONSTANTS.COMPRESSION.ENABLE_COMPRESSION, // 图片压缩
      compressionQuality: CONSTANTS.COMPRESSION.COMPRESSION_QUALITY,  // 压缩质量 80%

      enablePreview: CONSTANTS.PREVIEW.ENABLE_PREVIEW,  // 预览图
      previewMaxWidth: CONSTANTS.PREVIEW.PREVIEW_MAX_WIDTH, // 预览图宽度 200px
      previewMaxHeight: CONSTANTS.PREVIEW.PREVIEW_MAX_HEIGHT, // 预览图高度 200px
      ...config
    };
  }

  // ==================== 监听器设置 ====================
  private setupWatchers(): void {
    watch(
      [this.uploadQueue, this.activeUploads, this.completedUploads],
      () => {
        this.callbacks.onQueueChange?.(this.uploadStats.value);
        this.adjustPerformance();
      },
      { deep: true }
    );

    watch(this.uploadSpeed, speed => {
      this.callbacks.onSpeedChange?.(speed);
      this.networkQuality.value = this.networkAdapter.getNetworkQuality(speed);
    });
  }

  private setupNetworkMonitoring(): void {
    if (!this.config.enableNetworkAdaptation || !('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    const updateNetworkInfo = () => this.networkAdapter.adaptToConnection(connection);

    connection?.addEventListener('change', updateNetworkInfo);
    updateNetworkInfo();
  }

  private adjustPerformance(): void {
    if (!this.config.enableNetworkAdaptation) return;
    
    const now = Date.now();
    if (now - this.adaptiveConfig.lastAdjustTime < this.adaptiveConfig.adjustInterval) return;
    
    this.adaptiveConfig.lastAdjustTime = now;
    const speed = this.uploadSpeed.value;
    const activeCount = this.activeUploads.value.size;

    if (speed < 50 && activeCount > 1) {
      this.config.maxConcurrentFiles = Math.max(1, this.config.maxConcurrentFiles - 1);
      this.config.maxConcurrentChunks = Math.max(2, this.config.maxConcurrentChunks - 1);
    } else if (speed > 500 && activeCount === this.config.maxConcurrentFiles) {
      this.config.maxConcurrentFiles = Math.min(6, this.config.maxConcurrentFiles + 1);
      this.config.maxConcurrentChunks = Math.min(12, this.config.maxConcurrentChunks + 1);
    }
  }

  // ==================== 统计计算 ====================
  private calculateStats(): UploadStats {
    const active = this.activeUploads.value.size;
    const pending = this.uploadQueue.value.length;
    const completed = this.completedUploads.value.filter(t => t.status === UploadStatus.SUCCESS).length;
    const failed = this.completedUploads.value.filter(t => t.status === UploadStatus.ERROR).length;
    const paused = this.completedUploads.value.filter(t => t.status === UploadStatus.PAUSED).length;
    const cancelled = this.completedUploads.value.filter(t => t.status === UploadStatus.CANCELLED).length;
    const total = active + pending + completed + failed + paused + cancelled;

    const allTasks = this.getAllTasks();
    const totalSize = allTasks.reduce((sum, task) => sum + task.file.size, 0);
    const uploadedSize = allTasks.reduce(
      (sum, task) => sum + (task.file.size * task.progress) / 100,
      0
    );

    return {
      completed,
      active,
      pending,
      failed,
      paused,
      cancelled,
      total,
      totalSize,
      uploadedSize,
      averageSpeed: this.speedCalculator.getAverageSpeed(),
      instantSpeed: this.uploadSpeed.value,
      estimatedTime: this.uploadSpeed.value > 0 ? (totalSize - uploadedSize) / (this.uploadSpeed.value * 1024) : 0,
      networkQuality: this.networkQuality.value
    };
  }

  private getAllTasks(): FileTask[] {
    return [
      ...this.uploadQueue.value,
      ...Array.from(this.activeUploads.value.values()),
      ...this.completedUploads.value
    ];
  }

  // ==================== 链式回调 ====================
  public onFileStart(callback: UploadCallbacks['onFileStart']): this {
    this.callbacks.onFileStart = callback;
    return this;
  }

  public onFileProgress(callback: UploadCallbacks['onFileProgress']): this {
    this.callbacks.onFileProgress = callback;
    return this;
  }

  public onFileSuccess(callback: UploadCallbacks['onFileSuccess']): this {
    this.callbacks.onFileSuccess = callback;
    return this;
  }

  public onFileError(callback: UploadCallbacks['onFileError']): this {
    this.callbacks.onFileError = callback;
    return this;
  }

  public onFilePause(callback: UploadCallbacks['onFilePause']): this {
    this.callbacks.onFilePause = callback;
    return this;
  }

  public onFileResume(callback: UploadCallbacks['onFileResume']): this {
    this.callbacks.onFileResume = callback;
    return this;
  }

  public onFileCancel(callback: UploadCallbacks['onFileCancel']): this {
    this.callbacks.onFileCancel = callback;
    return this;
  }

  public onTotalProgress(callback: UploadCallbacks['onTotalProgress']): this {
    this.callbacks.onTotalProgress = callback;
    return this;
  }

  public onAllComplete(callback: UploadCallbacks['onAllComplete']): this {
    this.callbacks.onAllComplete = callback;
    return this;
  }

  public onAllError(callback: UploadCallbacks['onAllError']): this {
    this.callbacks.onAllError = callback;
    return this;
  }

  public onSpeedChange(callback: UploadCallbacks['onSpeedChange']): this {
    this.callbacks.onSpeedChange = callback;
    return this;
  }

  public onQueueChange(callback: UploadCallbacks['onQueueChange']): this {
    this.callbacks.onQueueChange = callback;
    return this;
  }

  public onChunkSuccess(callback: UploadCallbacks['onChunkSuccess']): this {
    this.callbacks.onChunkSuccess = callback;
    return this;
  }

  public onChunkError(callback: UploadCallbacks['onChunkError']): this {
    this.callbacks.onChunkError = callback;
    return this;
  }

  // ==================== 文件管理 ====================
  public async addFiles(files: File[] | FileList | File, options: FileUploadOptions = {}): Promise<this> {
    const fileArray = this.normalizeFiles(files);
    const { valid: validFiles } = this.fileValidator.validate(fileArray);

    // 如果启用 Worker 且文件较多，使用批量处理
    if (this.config.useWorker && this.workerManager && validFiles.length > 5) {
      await this.addFilesWithWorker(validFiles, options);
    } else {
      await this.addFilesInMainThread(validFiles, options);
    }

    this.taskQueueManager.sort(this.uploadQueue.value);
    return this;
  }

  private async addFilesWithWorker(files: File[], options: FileUploadOptions): Promise<void> {
    try {
      // 使用 Worker 批量处理文件信息
      const results = await this.workerManager!.batchProcess(files, {
        calculateMD5: this.config.enableDeduplication,
        generateChunks: false, // 暂不生成切片，上传时再生成
        onProgress: (progress) => {
          console.log(`文件预处理进度: ${progress}%`);
        }
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processResult = results[i];

        if (processResult.error) {
          console.warn(`文件处理失败: ${file.name}`, processResult.error);
          continue;
        }

        if (this.taskQueueManager.isDuplicate(file, this.getAllTasks())) {
          console.warn(`文件已存在: ${file.name}`);
          continue;
        }

        const processedFile = await this.processFile(file);
        const preview = await this.generatePreview(processedFile);
        
        const task = this.taskQueueManager.createTask(
          file,
          processedFile,
          options,
          this.config,
          this.speedCalculator.getAverageSpeed(),
          preview
        );

        // 如果已经计算了 MD5，保存到任务中
        if (processResult.md5) {
          task.options.metadata = {
            ...task.options.metadata,
            md5: processResult.md5
          };
        }

        this.uploadQueue.value.push(task);
      }
    } catch (error) {
      console.warn('Worker 批量处理失败，回退到主线程:', error);
      await this.addFilesInMainThread(files, options);
    }
  }

  private async addFilesInMainThread(files: File[], options: FileUploadOptions): Promise<void> {
    for (const file of files) {
      if (this.taskQueueManager.isDuplicate(file, this.getAllTasks())) {
        console.warn(`文件已存在: ${file.name}`);
        // throw new Error(`文件已存在: ${file.name}`)
        continue;
      }

      const processedFile = await this.processFile(file);
      const preview = await this.generatePreview(processedFile);
      
      const task = this.taskQueueManager.createTask(
        file,
        processedFile,
        options,
        this.config,
        this.speedCalculator.getAverageSpeed(),
        preview
      );

      this.uploadQueue.value.push(task);
    }
  }

  private normalizeFiles(files: File[] | FileList | File): File[] {
    if (files instanceof File) return [files];
    if (files instanceof FileList) return Array.from(files);
    if (Array.isArray(files)) return files;
    throw new Error('不支持的文件类型');
  }

  private async processFile(file: File): Promise<File> {
    if (!this.config.enableCompression || !file.type.startsWith('image/')) {
      return file;
    }
    try {
      return await FileCompressor.compressImage(file, this.config.compressionQuality,this.config.previewMaxWidth,this.config.previewMaxHeight);
    } catch (error) {
      console.warn('文件压缩失败:', error);
      return file;
    }
  }

  private async generatePreview(file: File): Promise<string | undefined> {
    if (!this.config.enablePreview || !PreviewGenerator.canGeneratePreview(file)) return undefined;
    try {
      if (file.type.startsWith('image/')) return await PreviewGenerator.generateImagePreview(file);
      if (file.type.startsWith('video/')) return await PreviewGenerator.generateVideoPreview(file);
      return undefined;
    } catch (error) {
      console.warn('生成预览失败:', error);
      return undefined;
    }
  }

  // ==================== 上传流程 ====================
  public async start(): Promise<this> {
    if (this.uploadQueue.value.length === 0) {
      this.callbacks.onAllComplete?.([]);
      return this;
    }

    this.isUploading.value = true;
    this.speedCalculator.reset();

    try {
      await this.processQueue();
      this.handleUploadComplete();
    } catch (error) {
      this.callbacks.onAllError?.(error as Error);
    } finally {
      this.isUploading.value = false;
      this.isPaused.value = false;
    }
    return this;
  }

  private async processQueue(): Promise<void> {
    const promises: Promise<void>[] = [];

    while (this.uploadQueue.value.length > 0 || this.activeUploads.value.size > 0) {
      if (this.isPaused.value || this.abortController.signal.aborted) {
        await Promise.allSettled(promises);
        return;
      }

      while (
        this.uploadQueue.value.length > 0 &&
        this.activeUploads.value.size < this.config.maxConcurrentFiles
      ) {
        const task = this.uploadQueue.value.shift()!;
        const promise = this.uploadFile(task);
        this.activeUploads.value.set(task.id, task);
        promises.push(promise);
      }

      if (this.activeUploads.value.size > 0) {
        await Promise.race(promises.filter(Boolean));
      }

      await delay(CONSTANTS.NETWORK.POLL_INTERVAL);
    }

    await Promise.allSettled(promises);
  }

  private async uploadFile(task: FileTask): Promise<void> {
    try {
      task.status = UploadStatus.UPLOADING;
      task.startTime = Date.now();
      await this.callbacks.onFileStart?.(task);

      const canSkip = await this.checkDeduplication(task);
      if (canSkip) {
        this.handleFileSuccess(task);
        return;
      }

      this.calculateChunks(task);
      await this.uploadChunks(task);
      const mergeResult = await this.mergeChunks(task);

      task.result = mergeResult;
      this.handleFileSuccess(task);
    } catch (error) {
      await this.handleFileError(task, error as Error);
    } finally {
      this.activeUploads.value.delete(task.id);
      this.completedUploads.value.push(task);
      this.updateTotalProgress();
    }
  }

  private async checkDeduplication(task: FileTask): Promise<boolean> {
    const cacheKey = `file_${task.file.name}_${task.file.size}_${task.file.lastModified}`;
    
    if (this.config.enableCache && this.cacheManager.get(cacheKey) === 'uploaded') {
      return true;
    }

    if (!this.config.enableDeduplication || !this.config.checkFileUrl) {
      return false;
    }

    try {
      const md5 = await calculateFileMD5(task.file);
      const response = await fetch(this.config.checkFileUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify({
          fileName: task.file.name,
          fileSize: task.file.size,
          fileMD5: md5,
          ...this.config.customParams
        }),
        signal: this.abortController.signal
      });

      if (!response.ok) return false;

      const result = await response.json();
      if (result.exists && result.fileInfo) {
        task.result = {
          success: true,
          fileUrl: result.fileInfo.url || '',
          fileId: result.fileInfo.id || task.id,
          fileName: result.fileInfo.name || task.file.name,
          fileSize: result.fileInfo.size || task.file.size,
          thumbnail: result.fileInfo.thumbnail,
          doc_id: result.fileInfo.doc_id,
          error: undefined
        };
        
        if (this.config.enableCache) {
          this.cacheManager.set(cacheKey, 'uploaded');
        }
        return true;
      }

      return false;
    } catch (error) {
      console.warn('秒传检查失败:', error);
      return false;
    }
  }

  private handleFileSuccess(task: FileTask): void {
    task.status = UploadStatus.SUCCESS;
    task.progress = 100;
    task.endTime = Date.now();
    this.callbacks.onFileSuccess?.(task);
  }

  private async handleFileError(task: FileTask, error: Error): Promise<void> {
    task.status = UploadStatus.ERROR;
    task.error = error;
    task.endTime = Date.now();

    if (this.config.enableSmartRetry && this.retryStrategy.shouldRetry(task, error)) {
      await this.retryTask(task);
      return;
    }

    this.callbacks.onFileError?.(task, error);
  }

  private handleUploadComplete(): void {
    const completedTasks = this.completedUploads.value;
    const successTasks = completedTasks.filter(t => t.status === UploadStatus.SUCCESS);
    const errorTasks = completedTasks.filter(t => t.status === UploadStatus.ERROR);

    if (errorTasks.length > 0) {
      this.callbacks.onAllError?.(new Error(`${errorTasks.length}/${completedTasks.length} 个文件上传失败`));
    } else {
      this.callbacks.onAllComplete?.(successTasks);
    }
  }

  // ==================== 切片处理 ====================
  private calculateChunks(task: FileTask): void {
    const chunkSize = this.config.enableNetworkAdaptation
      ? SmartChunkCalculator.calculateOptimalChunkSize(
          task.file.size,
          this.speedCalculator.getAverageSpeed(),
          this.config
        )
      : (task.options.chunkSize || this.config.chunkSize);

      const totalChunks = Math.ceil(task.file.size / chunkSize);
      task.chunks = [];
      task.totalChunks = totalChunks;
      task.uploadedChunks = 0;
     // 使用 Worker 生成切片（如果启用且文件较大）
     if (this.config.useWorker && this.workerManager && task.file.size > 10 * 1024 * 1024) {
      this.calculateChunksWithWorker(task, chunkSize, totalChunks);
    } else {
      this.calculateChunksInMainThread(task, chunkSize, totalChunks);
    }
  
  }

  private async calculateChunksWithWorker(task: FileTask, chunkSize: number, totalChunks: number): Promise<void> {
    try {
      const chunksInfo = await this.workerManager!.sliceFile(task.file, chunkSize);
      task.chunks = chunksInfo.map(chunkInfo => ({
        ...chunkInfo,
        blob: task.file.slice(chunkInfo.start, chunkInfo.end),
        status: ChunkStatus.PENDING,
        retryCount: 0,
        uploadTime: 0,
        etag: undefined,
        result: undefined,
        error: undefined
      }));
    } catch (error) {
      console.warn('Worker 切片失败，回退到主线程:', error);
      this.calculateChunksInMainThread(task, chunkSize, totalChunks);
    }
   }

  private calculateChunksInMainThread(task: FileTask, chunkSize: number, totalChunks: number): void {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, task.file.size);

      task.chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        blob: task.file.slice(start, end),
        status: ChunkStatus.PENDING,
        retryCount: 0,
        uploadTime: 0,
        etag: undefined,
        result: undefined,
        error: undefined
      });
    }
  }

  private async uploadChunks(task: FileTask): Promise<void> {
    const maxConcurrent = this.networkAdapter.getConcurrentChunks(this.networkQuality.value);
    const semaphore = new Semaphore(maxConcurrent);

    const uploadPromises = task.chunks.map(async (chunk, index) => {
      if (index > 2) await delay(index * 50);

      await semaphore.acquire();
      try {
        await this.uploadSingleChunk(task, chunk);
        task.uploadedChunks++;
        
        task.progress = Math.round((task.uploadedChunks / task.totalChunks) * CONSTANTS.PROGRESS.CHUNK_WEIGHT);
        
        const uploadTime = Date.now() - (task.startTime || 0);
        if (uploadTime > 0) {
          const uploadedSize = task.uploadedChunks * (task.options.chunkSize || this.config.chunkSize);
          task.speed = (uploadedSize / uploadTime) * 1000 / 1024;
        }

        await this.callbacks.onFileProgress?.(task);
        this.updateTotalProgress();
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(uploadPromises);
  }

  private async uploadSingleChunk(task: FileTask, chunk: ChunkInfo): Promise<void> {
    const maxRetries = task.options.maxRetries || this.config.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        chunk.status = attempt > 0 ? ChunkStatus.RETRYING : ChunkStatus.UPLOADING;
        chunk.retryCount = attempt;

        const startTime = Date.now();
        const result = await Promise.race([
          this.performChunkUpload(task, chunk),
          this.createTimeoutPromise()
        ]);

        chunk.uploadTime = Date.now() - startTime;
        chunk.status = ChunkStatus.SUCCESS;
        chunk.result = result;

        this.speedCalculator.addData(chunk.size, chunk.uploadTime);
        this.uploadSpeed.value = this.speedCalculator.getSpeed();

        await this.callbacks.onChunkSuccess?.(task, chunk);
        return;

      } catch (error) {
        lastError = error as Error;
        chunk.error = lastError;

        if (attempt < maxRetries && this.retryStrategy.shouldRetry(task, lastError)) {
          await delay(this.retryStrategy.calculateDelay(attempt, true));
          continue;
        }

        chunk.status = ChunkStatus.ERROR;
        await this.callbacks.onChunkError?.(task, chunk, lastError);
        throw lastError;
      }
    }
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('上传超时')), this.config.timeout);
    });
  }

  private async performChunkUpload(task: FileTask, chunk: ChunkInfo): Promise<ChunkUploadResponse> {
    const formData = this.buildChunkFormData(task, chunk);

    const response = await fetch(this.config.uploadChunkUrl, {
      method: 'POST',
      headers: this.config.headers,
      body: formData,
      signal: this.abortController.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const res = await response.json();
    return {
      success: true,
      chunkIndex: chunk.index,
      etag: res.data?.etag,
      uploadId: task.id,
      error: undefined
    };
  }
  
  // 创建分片请求参数
  private buildChunkFormData(task: FileTask, chunk: ChunkInfo): FormData {
    const formData = new FormData();
    formData.append('file', chunk.blob);
    formData.append('chunk_number', chunk.index.toString());
    formData.append('upload_id', task.id);
    formData.append('total_chunks', task.totalChunks.toString());
    formData.append('chunk_size', chunk.size.toString());
    formData.append('file_name', task.file.name);
    formData.append('file_size', task.file.size.toString());

    Object.entries({ ...this.config.customParams, ...task.options.customParams }).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    return formData;
  }

  // ==================== 切片合并 ====================
  private async mergeChunks(task: FileTask): Promise<MergeResponse> {
    task.progress = CONSTANTS.PROGRESS.MERGE_START;
    await this.callbacks.onFileProgress?.(task);

    const requestData = this.buildMergeRequest(task);

    const response = await fetch(this.config.mergeChunksUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      body: JSON.stringify(requestData),
      signal: this.abortController.signal
    });

    if (!response.ok) {
      throw new Error(`合并切片失败: HTTP ${response.status}`);
    }

    task.progress = CONSTANTS.PROGRESS.MERGE_END;
    await this.callbacks.onFileProgress?.(task);

    const res = await response.json();
    return this.buildMergeResponse(task, res.data);
  }

  // 创建合片请求参数
  private buildMergeRequest(task: FileTask) {
    return {
      upload_id: task.id,
      filename: task.file.name,
      folder: task.file.webkitRelativePath || '',
      total_chunks: task.totalChunks,
      file_size: task.file.size,
      file_type: task.file.type,
      last_modified: task.file.lastModified,
      chunks: task.chunks
        .filter(chunk => chunk.result?.etag)
        .map(chunk => ({
          index: chunk.index,
          size: chunk.size,
          etag: chunk.result?.etag
        })),
      ...this.config.customParams,
      ...task.options.customParams
    };
  }

  private buildMergeResponse(task: FileTask, data: any): MergeResponse {
    return {
      success: true,
      fileUrl: data.file_path,
      fileId: task.id,
      fileName: data.filename || task.file.name,
      fileSize: task.file.size,
      thumbnail: data.thumbnail,
      doc_id: data.doc_id,
      mimeType: task.file.type,
      originalFile: task.originalFile,
      uploadTime: task.endTime ? task.endTime - (task.startTime || 0) : 0,
      error: undefined
    };
  }

  // ==================== 进度管理 ====================
  private updateTotalProgress(): void {
    const stats = this.uploadStats.value;
    if (stats.total === 0) {
      this.totalProgress.value = 0;
      return;
    }

    const totalProgress = Math.round((stats.uploadedSize / stats.totalSize) * 100) || 0;
    this.totalProgress.value = Math.min(100, totalProgress);
    this.callbacks.onTotalProgress?.(this.totalProgress.value, stats);
  }

  // ==================== 控制方法 ====================

  /**
   * 暂停上传
   * @returns this
   */
  public pause(): this {
    this.isPaused.value = true;
    this.activeUploads.value.forEach(task => {
      if (task.status === UploadStatus.UPLOADING) {
        task.status = UploadStatus.PAUSED;
        task.pausedTime = Date.now();
        this.callbacks.onFilePause?.(task);
      }
    });
    return this;
  }
  /**
   * 继续上传
   * @returns this
   */
  public resume(): this {
    this.isPaused.value = false;
    this.activeUploads.value.forEach(task => {
      if (task.status === UploadStatus.PAUSED) {
        task.status = UploadStatus.UPLOADING;
        task.resumeTime = Date.now();
        this.callbacks.onFileResume?.(task);
      }
    });
    return this;
  }

  /**
   * 取消上传
   * @returns this
   */
  public cancel(): this {
    this.abortController.abort();
    this.abortController = new AbortController();

    this.uploadQueue.value.forEach(task => this.callbacks.onFileCancel?.(task));
    this.uploadQueue.value = [];

    this.activeUploads.value.forEach(task => {
      task.status = UploadStatus.CANCELLED;
      task.endTime = Date.now();
      this.callbacks.onFileCancel?.(task);
    });

    this.activeUploads.value.clear();
    this.isUploading.value = false;
    this.isPaused.value = false;

    return this;
  }

  /**
   * 重试单个失败的文件
   * @param taskId - 任务ID
   * @returns this
   */
  public retrySingleFile(taskId: string): this {
    // 在已完成的任务中查找
    const taskIndex = this.completedUploads.value.findIndex(
      t => t.id === taskId && t.status === UploadStatus.ERROR
    );

    if (taskIndex === -1) {
      console.warn(`未找到失败的任务: ${taskId}`);
      return this;
    }

    const task = this.completedUploads.value[taskIndex];
    
    // 重置任务状态
    this.resetTaskForRetry(task);

    // 从完成列表中移除
    this.completedUploads.value.splice(taskIndex, 1);

    // 检查队列中是否已存在（防止重复添加）
    const existsInQueue = this.uploadQueue.value.some(t => t.id === taskId);
    if (!existsInQueue) {
      // 添加到队列开头（高优先级）
      this.uploadQueue.value.unshift(task);
      this.taskQueueManager.sort(this.uploadQueue.value);
    }

    console.log(`任务 ${task.file.name} 已加入重试队列`);
    return this;
  }

   /**
   * 重置任务状态用于重试
   * @param task - 文件任务
   */
  private resetTaskForRetry(task: FileTask): void {
    // 重置基本状态
    this.retryStrategy.resetTask(task);
    task.progress = 0;
    task.startTime = null;
    task.endTime = null;
    task.uploadedChunks = 0;
    task.speed = 0;

    // 根据当前网络状态重新计算分片大小
    if (this.config.enableNetworkAdaptation) {
      task.options.chunkSize = SmartChunkCalculator.calculateOptimalChunkSize(
        task.file.size,
        this.speedCalculator.getAverageSpeed(),
        this.config
      );
    }

    // 重置切片状态（保留已成功的切片）
    task.chunks.forEach(chunk => {
      if (chunk.status !== ChunkStatus.SUCCESS) {
        chunk.status = ChunkStatus.PENDING;
        chunk.retryCount = 0;
        chunk.error = undefined;
        chunk.uploadTime = 0;
      }
    });

    // 设置高优先级
    task.options.priority = 'high';
  }


 /**
   * 重试所有失败的文件
   * @returns this
   */
  public retryFailed(): this {
    const failedTasks = this.completedUploads.value.filter(
      t => t.status === UploadStatus.ERROR
    );

    if (failedTasks.length === 0) {
      console.log('没有失败的任务需要重试');
      return this;
    }

    // 获取队列中已存在的任务 ID
    const existingTaskIds = new Set(this.uploadQueue.value.map(t => t.id));

    // 过滤出不在队列中的失败任务
    const tasksToRetry = failedTasks.filter(task => !existingTaskIds.has(task.id));

    if (tasksToRetry.length === 0) {
      console.log('所有失败的任务已在重试队列中');
      return this;
    }

    // 重置所有需要重试的任务
    tasksToRetry.forEach(task => {
      this.resetTaskForRetry(task);
    });

    // 从完成列表中移除这些任务
    this.completedUploads.value = this.completedUploads.value.filter(
      t => !tasksToRetry.some(retry => retry.id === t.id)
    );

    // 添加到队列开头
    this.uploadQueue.value = [...tasksToRetry, ...this.uploadQueue.value];
    this.taskQueueManager.sort(this.uploadQueue.value);

    console.log(`${tasksToRetry.length} 个失败任务已加入重试队列`);
    return this;
  }

   /**
   * 根据任务ID移除文件
   * @param taskId - 任务ID
   * @returns this
   */
  public removeFile(taskId: string): this {
    const queueIndex = this.uploadQueue.value.findIndex(t => t.id === taskId);
    if (queueIndex > -1) {
      const [removed] = this.uploadQueue.value.splice(queueIndex, 1);
      this.callbacks.onFileCancel?.(removed);
    }

    const activeTask = this.activeUploads.value.get(taskId);
    if (activeTask) {
      activeTask.status = UploadStatus.CANCELLED;
      activeTask.endTime = Date.now();
      this.activeUploads.value.delete(taskId);
      this.callbacks.onFileCancel?.(activeTask);
    }

    const completedIndex = this.completedUploads.value.findIndex(t => t.id === taskId);
    if (completedIndex > -1) {
      this.completedUploads.value.splice(completedIndex, 1);
    }

    this.updateTotalProgress();
    return this;
  }

   /**
   * 清空所有文件
   * @returns this
   */
  public clear(): this {
    this.cancel();
    this.completedUploads.value = [];
    this.totalProgress.value = 0;
    this.uploadSpeed.value = 0;
    this.speedCalculator.reset();

    if (this.config.enableCache) {
      this.cacheManager.clear();
    }

    return this;
  }

  private async retryTask(task: FileTask): Promise<void> {
    task.retryCount++;
    this.retryStrategy.resetTask(task);

    const retryDelay = this.retryStrategy.calculateDelay(task.retryCount);
    await delay(retryDelay);

    task.options.priority = 'low';
    this.uploadQueue.value.push(task);
    this.taskQueueManager.sort(this.uploadQueue.value);
  }

  // ==================== 查询方法 ====================
   /**
   *  更新配置
   * @param UploadConfig - 配置信息
   * @returns this
   */
  public updateConfig(newConfig: Partial<UploadConfig>): this {
    this.config = { ...this.config, ...newConfig };

    if ('enableNetworkAdaptation' in newConfig) {
      this.setupNetworkMonitoring();
    }

    return this;
  }
   
   /**
   *  获取任务
   * @param taskId - 任务ID
   * @returns this
   */
  public getTask(taskId: string): FileTask | undefined {
    return (
      this.uploadQueue.value.find(t => t.id === taskId) ||
      this.activeUploads.value.get(taskId) ||
      this.completedUploads.value.find(t => t.id === taskId)
    );
  }
  
   /**
   *  获取详情状态
   * @returns this
   */
  public getDetailedStats(): UploadStats & {
    successRate: number;
    averageFileSize: number;
    totalUploadTime: number;
    networkQuality: string;
    cacheHitRate: number;
  } {
    const stats = this.uploadStats.value;
    const allTasks = this.getAllTasks();

    const successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    const averageFileSize = stats.total > 0 ? stats.totalSize / stats.total : 0;
    const totalUploadTime = allTasks.reduce((sum, task) => {
      return sum + ((task.endTime || Date.now()) - (task.startTime || Date.now()));
    }, 0);

    return {
      ...stats,
      successRate,
      averageFileSize,
      totalUploadTime,
      networkQuality: this.networkQuality.value,
      cacheHitRate: 0
    };
  }
  
  /**
   *  销毁任务
   * @returns this
   */
  public destroy(): void {
    this.cancel();
    this.workerManager?.terminate();
    this.speedCalculator.reset();
    this.cacheManager.clear();

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.removeEventListener('change', () => {
        this.networkAdapter.adaptToConnection(connection);
      });
    }
  }
}

