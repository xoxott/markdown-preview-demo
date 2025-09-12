/* eslint-disable no-plusplus */
/* eslint-disable prettier/prettier */
import { computed, ref, watch } from 'vue';
import type { UploadFileInfo } from 'naive-ui';
import type {
  ChunkInfo,
  ChunkUploadResponse,
  FileTask,
  FileUploadOptions,
  MergeResponse,
  UploadCallbacks,
  UploadConfig,
  UploadStats
} from './type';
import { ChunkStatus, UploadStatus } from './type';
import CacheManager from './CacheManager'
import EnhancedSpeedCalculator from './EnhancedSpeedCalculator'
import Semaphore from './Semaphore'
import SmartChunkCalculator from './SmartChunkCalculator'
import { calculateFileMD5, delay, formatFileSize, formatSpeed, formatTime, generateId, getMediaDuration, getUpdateToken } from './utils';

export class ChunkUploadManager {
  private config: UploadConfig;
  private callbacks: UploadCallbacks = {};
  private cacheManager: CacheManager;

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
  public readonly uploadStats = computed<UploadStats>(() => {
    const active = this.activeUploads.value.size;
    const pending = this.uploadQueue.value.length;
    const completed = this.completedUploads.value.filter(t => t.status === UploadStatus.SUCCESS).length;
    const failed = this.completedUploads.value.filter(t => t.status === UploadStatus.ERROR).length;
    const paused = this.completedUploads.value.filter(t => t.status === UploadStatus.PAUSED).length;
    const cancelled = this.completedUploads.value.filter(t => t.status === UploadStatus.CANCELLED).length;
    const total = active + pending + completed + failed + paused + cancelled;

    const allTasks = [
      ...this.uploadQueue.value,
      ...Array.from(this.activeUploads.value.values()),
      ...this.completedUploads.value
    ];

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
  });

  private speedCalculator = new EnhancedSpeedCalculator();
  private abortController = new AbortController();
  private worker?: Worker;
  private networkMonitor?: any;
  private adaptiveConfig = {
    lastAdjustTime: 0,
    adjustInterval: 10000, // 10秒调整一次
  };

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = {
      maxConcurrentFiles: 3,
      maxConcurrentChunks: 6,
      chunkSize: 2 * 1024 * 1024,
      minChunkSize: 512 * 1024, // 512KB
      maxChunkSize: 20 * 1024 * 1024, // 20MB
      maxRetries: 3,
      retryDelay: 1000,
      retryBackoff: 1.5, // 更温和的退避策略
      uploadChunkUrl: '',
      mergeChunksUrl: '',
      checkFileUrl: '',
      headers: {},
      timeout: 60000, // 增加到60秒
      customParams: {},
      maxFileSize: 50 * 1024 * 1024 * 1024, // 50GB
      maxFiles: 500,
      accept: [],
      enableResume: true,
      enableDeduplication: true,
      enablePreview: true,
      enableCompression: false,
      useWorker: false,
      enableCache: true,
      enableNetworkAdaptation: true, // 网络自适应
      enableSmartRetry: true, // 智能重试
      compressionQuality: 0.8,
      previewMaxWidth: 200,
      previewMaxHeight: 200,
      ...config
    };

    this.cacheManager = new CacheManager();
    this.setupWatchers();
    this.setupNetworkMonitoring();
  }

  /** 设置监听器 */
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
      this.updateNetworkQuality(speed);
    });
  }

  /** 设置网络监控 */
  private setupNetworkMonitoring(): void {
    if (!this.config.enableNetworkAdaptation) return;

    // 监听网络状态变化
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateNetworkInfo = () => {
        this.adaptConfigToNetwork(connection);
      };

      connection?.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }
  }

  /** 根据网络状况调整配置 */
  private adaptConfigToNetwork(connection: any): void {
    const downlink = connection?.downlink || 1; // Mbps
    const effectiveType = connection?.effectiveType || '4g';

    // 根据网络类型调整并发数和分片大小
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        this.config.maxConcurrentFiles = 1;
        this.config.maxConcurrentChunks = 2;
        this.config.chunkSize = Math.min(this.config.chunkSize, 512 * 1024);
        break;
      case '3g':
        this.config.maxConcurrentFiles = 2;
        this.config.maxConcurrentChunks = 3;
        this.config.chunkSize = Math.min(this.config.chunkSize, 1024 * 1024);
        break;
      case '4g':
      default:
        // 保持原配置或根据带宽调整
        if (downlink < 1) {
          this.config.maxConcurrentFiles = Math.max(1, this.config.maxConcurrentFiles - 1);
          this.config.maxConcurrentChunks = Math.max(2, this.config.maxConcurrentChunks - 2);
        }
        break;
    }
  }
  
  /** 更新网络质量评估 */
  private updateNetworkQuality(speed: number): void {
    if (speed > 1000) { // > 1MB/s
      this.networkQuality.value = 'good';
    } else if (speed > 100) { // > 100KB/s
      this.networkQuality.value = 'fair';
    } else {
      this.networkQuality.value = 'poor';
    }
  }

  /** 性能自适应调整 */
  private adjustPerformance(): void {
    if (!this.config.enableNetworkAdaptation) return;
    const now = Date.now();
    if (now - this.adaptiveConfig.lastAdjustTime < this.adaptiveConfig.adjustInterval) return;
    this.adaptiveConfig.lastAdjustTime = now;
    const speed = this.uploadSpeed.value;
    const activeCount = this.activeUploads.value.size;
    // 根据速度和活跃任务数动态调整
    if (speed < 50 && activeCount > 1) { // 速度太慢，减少并发
      this.config.maxConcurrentFiles = Math.max(1, this.config.maxConcurrentFiles - 1);
      this.config.maxConcurrentChunks = Math.max(2, this.config.maxConcurrentChunks - 1);
    } else if (speed > 500 && activeCount === this.config.maxConcurrentFiles) { // 速度很好，可以增加并发
      const originalMax = 6; // 原始最大值
      this.config.maxConcurrentFiles = Math.min(originalMax, this.config.maxConcurrentFiles + 1);
      this.config.maxConcurrentChunks = Math.min(originalMax * 2, this.config.maxConcurrentChunks + 1);
    }
  }

  /** 链式回调设置方法 */
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

  /** 添加文件到上传队列 */
  public async addFiles(files: File[] | FileList | File, options: FileUploadOptions = {}): Promise<this> {
    const fileArray = ChunkUploadManager.normalizeFiles(files);
    const validFiles = this.validateFiles(fileArray);

    for (const file of validFiles) {
      // 检查重复文件
      if (this.isDuplicateFile(file)) {
        console.warn(`文件已存在队列中: ${file.name}`);
        continue;
      }

      // 处理文件压缩
      let processedFile = file;
      if (this.config.enableCompression && this.isImageFile(file)) {
        try {
          processedFile = await FileCompressor.compressImage(
            file,
            this.config.compressionQuality,
            this.config.previewMaxWidth! * 4,
            this.config.previewMaxHeight! * 4
          );
        } catch (error) {
          console.warn('文件压缩失败，使用原文件:', error);
        }
      }

      // 生成预览
      let preview: string | undefined;
      if (this.config.enablePreview) {
        try {
          if (this.isImageFile(processedFile)) {
            preview = await PreviewGenerator.generateImagePreview(processedFile);
          } else if (this.isVideoFile(processedFile)) {
            preview = await PreviewGenerator.generateVideoPreview(processedFile);
          }
        } catch (error) {
          console.warn('生成预览失败:', error);
        }
      }

      const fileTask: FileTask = {
        id: generateId(),
        file: processedFile,
        originalFile: file !== processedFile ? file : undefined,
        status: UploadStatus.PENDING,
        progress: 0,
        speed: 0,
        chunks: [],
        uploadedChunks: 0,
        totalChunks: 0,
        retryCount: 0,
        startTime: null,
        endTime: null,
        pausedTime: 0,
        resumeTime: 0,
        result: null,
        error: null,
        options: {
          maxRetries: this.config.maxRetries,
          chunkSize: SmartChunkCalculator.calculateOptimalChunkSize(
            processedFile.size,
            this.speedCalculator.getAverageSpeed(),
            this.config
          ),
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

      this.uploadQueue.value.push(fileTask);
    }

    // 排序队列（按优先级）
    this.sortQueue();
    return this;
  }

  /** 检查是否为重复文件 */
  private isDuplicateFile(file: File): boolean {
    const allTasks = [
      ...this.uploadQueue.value,
      ...Array.from(this.activeUploads.value.values()),
      ...this.completedUploads.value.filter(t => t.status === UploadStatus.SUCCESS)
    ];

    return allTasks.some(task =>
      task.file.name === file.name &&
      task.file.size === file.size &&
      task.file.lastModified === file.lastModified
    );
  }

  /** 判断是否为图片文件 */
  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /** 判断是否为视频文件 */
  private isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
  }

  /** 对队列进行排序 */
  private sortQueue(): void {
    this.uploadQueue.value.sort((a, b) => {
      const priorities = { high: 3, normal: 2, low: 1 };
      const aPriority = priorities[a.options.priority || 'normal'];
      const bPriority = priorities[b.options.priority || 'normal'];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // 相同优先级下，小文件优先
      return a.file.size - b.file.size;
    });
  }

  /** 将文件转换为数组 */
  private static normalizeFiles(files: File[] | FileList | File): File[] {
    if (files instanceof File) return [files];
    if (files instanceof FileList) return Array.from(files);
    if (Array.isArray(files)) return files;
    throw new Error('不支持的文件类型');
  }

  /** 验证文件 */
  private validateFiles(files: File[]): File[] {
    const validFiles: File[] = [];
    for (const file of files) {
      // 基本验证
      if (file.size === 0) {
        console.warn(`文件 ${file.name} 为空文件`);
        continue;
      }

      // 检查文件大小
      if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
        console.warn(`文件 ${file.name} 超过最大大小限制: ${formatFileSize(file.size)} > ${formatFileSize(this.config.maxFileSize)}`);
        continue;
      }

      // 检查文件类型
      if (this.config.accept?.length) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type.toLowerCase();

        const isValidExtension = extension && this.config.accept.some(accept =>
          accept.toLowerCase() === `.${extension}` || accept.toLowerCase() === extension
        );

        const isValidMimeType = this.config.accept.some(accept =>
          accept.toLowerCase() === mimeType ||
          (accept.includes('/') && mimeType.startsWith(accept.split('/')[0]))
        );

        if (!isValidExtension && !isValidMimeType) {
          console.warn(`文件 ${file.name} 类型不支持。支持的类型: ${this.config.accept.join(', ')}`);
          continue;
        }
      }

      // 检查文件数量限制
      const totalFiles = this.uploadQueue.value.length + this.activeUploads.value.size + validFiles.length;
      if (this.config.maxFiles && totalFiles >= this.config.maxFiles) {
        console.warn(`已达到最大文件数量限制: ${this.config.maxFiles}`);
        break;
      }

      validFiles.push(file);
    }

    return validFiles;
  }

  /** 开始上传 */
  public async start(): Promise<this> {
    if (this.uploadQueue.value.length === 0) {
      this.callbacks.onAllComplete?.([]);
      return this;
    }

    this.isUploading.value = true;
    this.speedCalculator.reset();

    try {
      await this.processQueue();

      const completedTasks = this.completedUploads.value;
      const successTasks = completedTasks.filter(task => task.status === UploadStatus.SUCCESS);
      const errorTasks = completedTasks.filter(task => task.status === UploadStatus.ERROR);

      if (errorTasks.length > 0) {
        this.callbacks.onAllError?.(new Error(`${errorTasks.length}/${completedTasks.length} 个文件上传失败`));
      } else {
        this.callbacks.onAllComplete?.(successTasks);
      }
    } catch (error) {
      this.callbacks.onAllError?.(error as Error);
    } finally {
      this.isUploading.value = false;
      this.isPaused.value = false;
    }
    return this;
  }

  /** 处理上传队列 */
  private async processQueue(): Promise<void> {
    const promises: Promise<void>[] = [];

    while (this.uploadQueue.value.length > 0 || this.activeUploads.value.size > 0) {
      // 检查是否被暂停或取消
      if (this.isPaused.value || this.abortController.signal.aborted) {
        await Promise.allSettled(promises);
        return;
      }

      // 启动新的上传任务
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
        await Promise.race(promises.filter(p => p));
      }

      await delay(50); // 减少轮询间隔以提高响应性
    }

    await Promise.allSettled(promises);
  }

  /** 上传单个文件 */
  private async uploadFile(task: FileTask): Promise<void> {
    try {
      task.status = UploadStatus.UPLOADING;
      task.startTime = Date.now();

      await this.callbacks.onFileStart?.(task);

      // 检查缓存中的秒传信息
      const cacheKey = `file_${task.file.name}_${task.file.size}_${task.file.lastModified}`;
      let canSkip = false;

      if (this.config.enableCache) {
        canSkip = this.cacheManager.get(cacheKey) === 'uploaded';
      }

      // 检查秒传
      if (!canSkip && this.config.enableDeduplication && this.config.checkFileUrl) {
        canSkip = await this.checkFileExists(task);
        if (canSkip && this.config.enableCache) {
          this.cacheManager.set(cacheKey, 'uploaded');
        }
      }

      if (canSkip) {
        task.status = UploadStatus.SUCCESS;
        task.progress = 100;
        task.endTime = Date.now();
        await this.callbacks.onFileSuccess?.(task);
        return;
      }

      // 计算切片
      this.calculateChunks(task);

      // 上传切片
      await this.uploadChunks(task);

      // 合并切片
      const mergeResult = await this.mergeChunks(task);

      task.status = UploadStatus.SUCCESS;
      task.endTime = Date.now();
      task.result = mergeResult;
      task.progress = 100;

      // 缓存上传成功信息
      if (this.config.enableCache) {
        this.cacheManager.set(cacheKey, 'uploaded');
      }

      await this.callbacks.onFileSuccess?.(task);
    } catch (error) {
      task.status = UploadStatus.ERROR;
      task.error = error as Error;
      task.endTime = Date.now();

      // 智能重试逻辑
      if (this.config.enableSmartRetry && this.shouldRetry(task, error as Error)) {
        await this.retryTask(task);
        return;
      }

      this.callbacks.onFileError?.(task, error as Error);
    } finally {
      this.activeUploads.value.delete(task.id);
      this.completedUploads.value.push(task);
      this.updateTotalProgress();
    }
  }

  /** 智能重试判断 */
  private shouldRetry(task: FileTask, error: Error): boolean {
    if (task.retryCount >= (task.options.maxRetries || this.config.maxRetries)) {
      return false;
    }

    // 网络错误可以重试
    const retryableErrors = [
      'NetworkError',
      'TimeoutError',
      'AbortError',
      'fetch',
      'network',
      'timeout',
      '5', // 5xx 服务器错误
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(keyword => errorMessage.includes(keyword.toLowerCase()));
  }

  /** 重试任务 */
  private async retryTask(task: FileTask): Promise<void> {
    task.retryCount++;
    task.status = UploadStatus.PENDING;
    task.error = null;

    // 重置切片状态
    task.chunks.forEach(chunk => {
      if (chunk.status === ChunkStatus.ERROR) {
        chunk.status = ChunkStatus.PENDING;
        chunk.retryCount = 0;
        chunk.error = undefined;
      }
    });

    // 计算退避延迟
    const delay = Math.min(
      this.config.retryDelay * Math.pow(this.config.retryBackoff, task.retryCount - 1),
      30000 // 最大30秒
    );

    await new Promise(resolve => setTimeout(resolve, delay));

    // 重新加入队列，但优先级较低
    task.options.priority = 'low';
    this.uploadQueue.value.push(task);
    this.sortQueue();
  }

  /** 检查文件是否已存在（秒传） */
  private async checkFileExists(task: FileTask): Promise<boolean> {
    try {
      const md5 = await calculateFileMD5(task.file);

      const response = await fetch(this.config.checkFileUrl!, {
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.exists === true) {
        // 如果服务器返回了文件信息，设置到结果中
        if (result.fileInfo) {
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
        }
        return true;
      }

      return false;
    } catch (error) {
      console.warn('秒传检查失败:', error);
      return false;
    }
  }

  /** 计算文件切片 */
  private calculateChunks(task: FileTask): void {
    const { file, options } = task;
    let chunkSize = options.chunkSize || this.config.chunkSize;

    // 根据当前网络速度动态调整分片大小
    if (this.config.enableNetworkAdaptation) {
      chunkSize = SmartChunkCalculator.calculateOptimalChunkSize(
        file.size,
        this.speedCalculator.getAverageSpeed(),
        this.config
      );
    }

    const totalChunks = Math.ceil(file.size / chunkSize);

    task.chunks = [];
    task.totalChunks = totalChunks;
    task.uploadedChunks = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);

      task.chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        blob: file.slice(start, end),
        status: ChunkStatus.PENDING,
        retryCount: 0,
        uploadTime: 0,
        etag: undefined,
        result: undefined,
        error: undefined
      });
    }
  }

  /** 上传所有切片 */
  private async uploadChunks(task: FileTask): Promise<void> {
    const maxConcurrent = Math.min(
      this.config.maxConcurrentChunks,
      this.networkQuality.value === 'poor' ? 2 :
        this.networkQuality.value === 'fair' ? 4 : 6
    );

    const semaphore = new Semaphore(maxConcurrent);
    const uploadPromises = task.chunks.map(async (chunk, index) => {
      // 为了更好的用户体验，按顺序但异步上传前几个切片
      if (index > 2) {
        await delay(index * 50); // 错开启动时间
      }

      await semaphore.acquire();

      try {
        await this.uploadSingleChunk(task, chunk);
        task.uploadedChunks++;

        // 更新进度 (90% 用于切片上传)
        const progress = Math.round((task.uploadedChunks / task.totalChunks) * 90);
        task.progress = progress;

        // 计算当前文件的上传速度
        const uploadTime = Date.now() - (task.startTime || 0);
        if (uploadTime > 0) {
          const uploadedSize = task.uploadedChunks * (task.options.chunkSize || this.config.chunkSize);
          task.speed = (uploadedSize / uploadTime) * 1000 / 1024; // KB/s
        }

        await this.callbacks.onFileProgress?.(task);
        this.updateTotalProgress();
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(uploadPromises);
  }

  /** 上传单个切片 */
  private async uploadSingleChunk(task: FileTask, chunk: ChunkInfo): Promise<void> {
    const maxRetries = task.options.maxRetries || this.config.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        chunk.status = attempt > 0 ? ChunkStatus.RETRYING : ChunkStatus.UPLOADING;
        chunk.retryCount = attempt;

        const startTime = Date.now();

        // 添加超时控制
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('上传超时')), this.config.timeout);
        });

        const uploadPromise = this.performChunkUpload(task, chunk);
        const result = await Promise.race([uploadPromise, timeoutPromise]);

        const endTime = Date.now();
        chunk.uploadTime = endTime - startTime;
        chunk.status = ChunkStatus.SUCCESS;
        chunk.result = result;

        // 更新速度统计
        this.speedCalculator.addData(chunk.size, chunk.uploadTime);
        this.uploadSpeed.value = this.speedCalculator.getSpeed();

        await this.callbacks.onChunkSuccess?.(task, chunk);
        return;

      } catch (error) {
        lastError = error as Error;
        chunk.error = lastError;

        // 如果是网络错误且还有重试机会，等待后重试
        if (attempt < maxRetries && this.shouldRetry(task, lastError)) {
          const retryDelay = Math.min(
            this.config.retryDelay * Math.pow(this.config.retryBackoff, attempt),
            10000 // 单个切片最大重试延迟10秒
          );

          await delay(retryDelay);
          continue;
        }

        // 重试次数用完
        chunk.status = ChunkStatus.ERROR;
        await this.callbacks.onChunkError?.(task, chunk, lastError);
        throw lastError;
      }
    }
  }

  /** 执行切片上传请求 */
  private async performChunkUpload(task: FileTask, chunk: ChunkInfo): Promise<ChunkUploadResponse> {
    const formData = new FormData();
    formData.append('file', chunk.blob);
    formData.append('file', chunk.blob);
    formData.append('chunk_number', chunk.index.toString());
    formData.append('upload_id', task.id);

    // 添加额外信息以帮助服务器优化
    formData.append('total_chunks', task.totalChunks.toString());
    formData.append('chunk_size', chunk.size.toString());
    formData.append('file_name', task.file.name);
    formData.append('file_size', task.file.size.toString());
    // 添加自定义参数
    Object.entries({ ...this.config.customParams, ...task.options.customParams }).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    try {
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
        etag: res.data?.etag, // 如果服务器返回etag
        uploadId: task.id,
        error: undefined
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`切片${chunk.index}上传失败: ${error.message}`);
      }
      throw error;
    }

  }

  /** 合并切片 */
  private async mergeChunks(task: FileTask): Promise<MergeResponse> {
    const requestData = {
      upload_id: task.id,
      filename: task.file.name,
      folder: task.file.webkitRelativePath || '',
      total_chunks: task.totalChunks,
      file_size: task.file.size,
      file_type: task.file.type,
      last_modified: task.file.lastModified,
      chunks: task.chunks.map(chunk => ({
        index: chunk.index,
        size: chunk.size,
        etag: chunk.result?.etag
      })).filter(chunk => chunk.etag), // 只包含有etag的切片
      ...this.config.customParams,
      ...task.options.customParams
    };
    try {
      // 添加合并前的进度更新
      task.progress = 92;
      await this.callbacks.onFileProgress?.(task);

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

      // 更新进度到95%，为最终处理留出空间
      task.progress = 95;
      await this.callbacks.onFileProgress?.(task);

      const res = await response.json();
      const { file_path, filename, thumbnail, doc_id } = res.data;


      return {
        success: true,
        fileUrl: file_path,
        fileId: task.id,
        fileName: filename || task.file.name,
        fileSize: task.file.size,
        thumbnail,
        doc_id,
        mimeType: task.file.type,
        originalFile: task.originalFile,
        uploadTime: task.endTime ? task.endTime - (task.startTime || 0) : 0,
        error: undefined
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '合并切片失败';
      throw new Error(errorMsg);
    }
  }

  /** 更新总进度 */
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

  /** 暂停上传 */
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

  /** 恢复上传 */
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

  /** 取消上传 */
  public cancel(): this {
    this.abortController.abort();
    this.abortController = new AbortController();

    // 清空队列
    this.uploadQueue.value.forEach(task => {
      this.callbacks.onFileCancel?.(task);
    });
    this.uploadQueue.value = [];

    // 取消活跃任务
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

  /** 重试失败的文件 */
  public retryFailed(): this {
    const failedTasks = this.completedUploads.value.filter(task => task.status === UploadStatus.ERROR);

    if (failedTasks.length === 0) {
      console.log('没有失败的任务需要重试');
      return this;
    }

    failedTasks.forEach(task => {
      // 重置任务状态
      task.status = UploadStatus.PENDING;
      task.progress = 0;
      task.retryCount = 0;
      task.error = null;
      task.startTime = null;
      task.endTime = null;
      task.uploadedChunks = 0;

      // 重新计算分片大小（可能网络状况已改善）
      if (this.config.enableNetworkAdaptation) {
        task.options.chunkSize = SmartChunkCalculator.calculateOptimalChunkSize(
          task.file.size,
          this.speedCalculator.getAverageSpeed(),
          this.config
        );
      }

      // 重置切片状态，但保留成功的切片
      task.chunks.forEach(chunk => {
        if (chunk.status !== ChunkStatus.SUCCESS) {
          chunk.status = ChunkStatus.PENDING;
          chunk.retryCount = 0;
          chunk.error = undefined;
          chunk.uploadTime = 0;
        }
      });

      // 设置较高优先级进行重试
      task.options.priority = 'high';
    });

    // 移动到队列前端
    this.uploadQueue.value = [...failedTasks, ...this.uploadQueue.value];
    this.completedUploads.value = this.completedUploads.value.filter(task => task.status !== UploadStatus.ERROR);

    this.sortQueue();
    return this;
  }

  /** 移除指定文件 */
  public removeFile(taskId: string): this {
    // 从队列中移除
    const queueIndex = this.uploadQueue.value.findIndex(task => task.id === taskId);
    if (queueIndex > -1) {
      const [removedTask] = this.uploadQueue.value.splice(queueIndex, 1);
      this.callbacks.onFileCancel?.(removedTask);
    }

    // 从活跃任务中移除
    const activeTask = this.activeUploads.value.get(taskId);
    if (activeTask) {
      activeTask.status = UploadStatus.CANCELLED;
      activeTask.endTime = Date.now();
      this.activeUploads.value.delete(taskId);
      this.callbacks.onFileCancel?.(activeTask);
    }

    // 从完成任务中移除
    const completedIndex = this.completedUploads.value.findIndex(task => task.id === taskId);
    if (completedIndex > -1) {
      this.completedUploads.value.splice(completedIndex, 1);
    }

    this.updateTotalProgress();
    return this;
  }

  /** 清空所有任务 */
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

  /** 更新配置 */
  public updateConfig(newConfig: Partial<UploadConfig>): this {
    this.config = { ...this.config, ...newConfig };

    // 如果更新了网络适应配置，重新初始化网络监控
    if ('enableNetworkAdaptation' in newConfig) {
      this.setupNetworkMonitoring();
    }

    return this;
  }

  /** 获取任务信息 */
  public getTask(taskId: string): FileTask | undefined {
    return (
      this.uploadQueue.value.find(task => task.id === taskId) ||
      this.activeUploads.value.get(taskId) ||
      this.completedUploads.value.find(task => task.id === taskId)
    );
  }

  /** 获取详细统计信息 */
  public getDetailedStats(): UploadStats & {
    successRate: number;
    averageFileSize: number;
    totalUploadTime: number;
    networkQuality: string;
    cacheHitRate: number;
  } {
    const stats = this.uploadStats.value;
    const allTasks = [
      ...this.uploadQueue.value,
      ...Array.from(this.activeUploads.value.values()),
      ...this.completedUploads.value
    ];

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
      cacheHitRate: 0 // 这里可以添加缓存命中率的计算
    };
  }

  /** 销毁实例 */
  public destroy(): void {
    this.cancel();
    this.worker?.terminate();
    this.speedCalculator.reset();
    this.cacheManager.clear();

    // 清理网络监听器
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.removeEventListener('change', this.adaptConfigToNetwork);
    }
  }
}




/** 切片上传Hook */
export function useChunkUpload(config: Partial<UploadConfig> = {}) {
  const uploader = new ChunkUploadManager(config);

  // 响应式状态
  const uploadQueue = uploader.uploadQueue;
  const activeUploads = uploader.activeUploads;
  const completedUploads = uploader.completedUploads;
  const totalProgress = uploader.totalProgress;
  const uploadSpeed = uploader.uploadSpeed;
  const isUploading = uploader.isUploading;
  const isPaused = uploader.isPaused;
  const uploadStats = uploader.uploadStats;
  const networkQuality = uploader.networkQuality;

  /** 创建兼容 Naive UI 的文件列表 */
  const createNaiveFileList = (): UploadFileInfo[] => {
    const allTasks = [
      ...uploadQueue.value,
      ...Array.from(activeUploads.value.values()),
      ...completedUploads.value
    ];

    return allTasks.map((task): UploadFileInfo => ({
      id: task.id,
      name: task.file.name,
      status: convertToNaiveStatus(task.status),
      percentage: task.progress,
      file: task.file,
      thumbnailUrl: task.options.metadata?.preview,
      url: task.result?.fileUrl,
      type: task.file.type,
      fullPath: task.file.webkitRelativePath || task.file.name
    }));
  };

  /** 状态转换函数 */
  const convertToNaiveStatus = (status: UploadStatus): UploadFileInfo['status'] => {
    switch (status) {
      case UploadStatus.PENDING:
        return 'pending';
      case UploadStatus.UPLOADING:
        return 'uploading';
      case UploadStatus.SUCCESS:
        return 'finished';
      case UploadStatus.ERROR:
        return 'error';
      case UploadStatus.PAUSED:
        return 'pending';
      case UploadStatus.CANCELLED:
        return 'removed';
      default:
        return 'pending';
    }
  };

  // 便捷方法
  const addFiles = (files: File[] | FileList | File, options?: FileUploadOptions) => {
    return uploader.addFiles(files, options);
  };

  const start = () => uploader.start();
  const pause = () => uploader.pause();
  const resume = () => uploader.resume();
  const cancel = () => uploader.cancel();
  const retryFailed = () => uploader.retryFailed();
  const removeFile = (taskId: string) => uploader.removeFile(taskId);
  const clear = () => uploader.clear();
  const getTask = (taskId: string) => uploader.getTask(taskId);
  const getDetailedStats = () => uploader.getDetailedStats();
  const updateConfig = (newConfig: Partial<UploadConfig>) => uploader.updateConfig(newConfig);

  // 销毁时清理
  const destroy = () => {
    uploader.destroy();
  };

  return {
    // 状态
    uploadQueue,
    activeUploads,
    completedUploads,
    totalProgress,
    uploadSpeed,
    isUploading,
    isPaused,
    uploadStats,
    networkQuality,

    // 核心实例
    uploader,

    // 便捷方法
    addFiles,
    start,
    pause,
    resume,
    cancel,
    retryFailed,
    removeFile,
    clear,
    getTask,
    getDetailedStats,
    updateConfig,
    destroy,

    // UI 工具
    createNaiveFileList,
    convertToNaiveStatus,

    // 格式化工具
    formatFileSize,
    formatSpeed,
    formatTime
  };
}