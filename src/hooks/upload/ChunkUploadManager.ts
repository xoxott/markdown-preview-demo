/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-11 10:36:56
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-29 14:20:00
 * @FilePath: \markdown-preview-demo\src\hooks\upload\ChunkUploadManager.ts
 * @Description: 分片上传管理器 - 优化版
 */
import { computed, ref, watch } from "vue";
import EnhancedSpeedCalculator from "./calculators/EnhancedSpeedCalculator";
import SmartChunkCalculator from "./calculators/SmartChunkCalculator";
import { CONSTANTS } from "./constants";
import { UploadController } from "./controllers/UploadController";
import FileCompressor from "./FileCompressor";
import FileValidator from "./FileValidator";
import CacheManager from "./managers/CacheManager";
import { CallbackManager } from "./managers/CallbackManager";
import { ChunkManager } from "./managers/ChunkManager";
import { ProgressManager } from "./managers/ProgressManager";
import RetryStrategyManager from "./managers/RetryStrategyManager";
import TaskQueueManager from "./managers/TaskQueueManager";
import UploadWorkerManager from "./managers/UploadWorkerManager";
import NetworkAdapter from "./NetworkAdapter";
import PreviewGenerator from './PreviewGenerator';
import { ChunkUploadTask } from "./tasks/ChunkUploadTask";
import {
  defaultCheckFileTransformer,
  defaultChunkUploadTransformer,
  defaultMergeChunksTransformer
} from "./transformers/defaultChunkUploadTransformer";
import {
  CheckFileTransformer,
  ChunkStatus,
  ChunkUploadTransformer,
  ExtendedUploadConfig,
  FileTask,
  FileUploadOptions,
  MergeChunksTransformer,
  UploadConfig,
  UploadStatus
} from "./type";
import { delay } from "./utils";

// ==================== 主类:分片上传管理器 ====================
export class ChunkUploadManager {

  private config: UploadConfig;

  // 管理器实例
  private callbackManager: CallbackManager;
  private uploadController: UploadController;
  private progressManager: ProgressManager;
  private chunkManager: ChunkManager;
  private cacheManager: CacheManager;
  private networkAdapter: NetworkAdapter;
  private fileValidator: FileValidator;
  private taskQueueManager: TaskQueueManager;
  private retryStrategy: RetryStrategyManager;
  private workerManager?: UploadWorkerManager;

  // 响应式状态
  public readonly uploadQueue = ref<FileTask[]>([]);        // 待上传队列
  public readonly activeUploads = ref<Map<string, FileTask>>(new Map()); // 上传中的任务
  public readonly completedUploads = ref<FileTask[]>([]);   // 已完成的任务
  public readonly isUploading = ref(false);                 // 是否正在上传

  // 计算属性
  public readonly totalProgress = computed(() => this.progressManager.totalProgress.value);
  public readonly uploadSpeed = computed(() => this.progressManager.uploadSpeed.value);
  public readonly networkQuality = computed(() => this.progressManager.networkQuality.value);
  public readonly isPaused = computed(() => this.uploadController.isPaused.value);

  public readonly uploadStats = computed(() =>
    this.progressManager.calculateStats(
      this.uploadQueue.value,
      this.activeUploads.value,
      this.completedUploads.value
    )
  );

  // 辅助工具
  private speedCalculator = new EnhancedSpeedCalculator();
  private adaptiveConfig = {
    lastAdjustTime: 0,
    adjustInterval: CONSTANTS.NETWORK.ADJUST_INTERVAL,
  };

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.cacheManager = new CacheManager();
    this.callbackManager = new CallbackManager();
    this.progressManager = new ProgressManager();
    this.uploadController = new UploadController();
    this.networkAdapter = new NetworkAdapter(this.config);
    this.fileValidator = new FileValidator(this.config);
    this.taskQueueManager = new TaskQueueManager();
    this.retryStrategy = new RetryStrategyManager(this.config);

    // 创建分片管理器
    this.chunkManager = new ChunkManager(
      this.config,
      (chunk, size, time) => this.progressManager.updateChunkProgress(chunk, size, time)
    );

    // 初始化 Worker
    if (this.config.useWorker) {
      this.workerManager = new UploadWorkerManager();
    }

    this.setupWatchers();
    this.setupNetworkMonitoring();
  }

  // ==================== 配置管理 ====================

  /**
   * 合并配置
   */
  private mergeConfig(config: Partial<ExtendedUploadConfig>): ExtendedUploadConfig {
    return {
      // 并发控制
      maxConcurrentFiles: CONSTANTS.CONCURRENT.DEFAULT_FILES,
      maxConcurrentChunks: CONSTANTS.CONCURRENT.DEFAULT_CHUNKS,

      // 分片配置
      chunkSize: CONSTANTS.UPLOAD.CHUNK_SIZE,
      minChunkSize: CONSTANTS.UPLOAD.MIN_CHUNK_SIZE,
      maxChunkSize: CONSTANTS.UPLOAD.MAX_CHUNK_SIZE,

      // 重试配置
      maxRetries: CONSTANTS.RETRY.MAX_RETRIES,
      retryDelay: CONSTANTS.RETRY.BASE_DELAY,
      retryBackoff: CONSTANTS.RETRY.BACKOFF_MULTIPLIER,

      // 上传接口
      uploadChunkUrl: '',
      mergeChunksUrl: '',
      checkFileUrl: '',

      // 请求配置
      headers: {},
      timeout: CONSTANTS.UPLOAD.TIMEOUT,
      customParams: {},

      // 文件限制
      maxFileSize: CONSTANTS.UPLOAD.MAX_FILESIZE,
      maxFiles: CONSTANTS.UPLOAD.MAX_FILES,

      // 功能开关
      enableResume: true,              // 断点续传
      enableDeduplication: false,      // 秒传
      useWorker: false,                // Web Worker
      enableCache: true,               // 缓存
      enableNetworkAdaptation: true,   // 网络自适应
      enableSmartRetry: true,          // 智能重试

      // 图片压缩配置
      enableCompression: CONSTANTS.COMPRESSION.ENABLE_COMPRESSION,
      compressionQuality: CONSTANTS.COMPRESSION.COMPRESSION_QUALITY,

      // 预览配置
      enablePreview: CONSTANTS.PREVIEW.ENABLE_PREVIEW,
      previewMaxWidth: CONSTANTS.PREVIEW.PREVIEW_MAX_WIDTH,
      previewMaxHeight: CONSTANTS.PREVIEW.PREVIEW_MAX_HEIGHT,

      // 默认转换器
      chunkUploadTransformer: defaultChunkUploadTransformer,
      mergeChunksTransformer: defaultMergeChunksTransformer,
      checkFileTransformer: defaultCheckFileTransformer,

      ...config
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<UploadConfig>): this {
    this.config = { ...this.config, ...newConfig };
    console.log('📝 配置已更新', this.config);

    if ('enableNetworkAdaptation' in newConfig) {
      this.setupNetworkMonitoring();
    }

    return this;
  }

  // ==================== 请求转换器设置 ====================

  public setChunkUploadTransformer(transformer: ChunkUploadTransformer): this {
    this.config.chunkUploadTransformer = transformer;
    return this;
  }

  public setMergeChunksTransformer(transformer: MergeChunksTransformer): this {
    this.config.mergeChunksTransformer = transformer;
    return this;
  }

  public setCheckFileTransformer(transformer: CheckFileTransformer): this {
    this.config.checkFileTransformer = transformer;
    return this;
  }

  public setTransformers(transformers: {
    chunkUpload?: ChunkUploadTransformer;
    mergeChunks?: MergeChunksTransformer;
    checkFile?: CheckFileTransformer;
  }): this {
    if (transformers.chunkUpload) {
      this.config.chunkUploadTransformer = transformers.chunkUpload;
    }
    if (transformers.mergeChunks) {
      this.config.mergeChunksTransformer = transformers.mergeChunks;
    }
    if (transformers.checkFile) {
      this.config.checkFileTransformer = transformers.checkFile;
    }
    return this;
  }

  // ==================== 监听器设置 ====================

  private setupWatchers(): void {
    // 监听队列变化
    watch(
      [this.uploadQueue, this.activeUploads, this.completedUploads],
      () => {
        this.callbackManager.emit('onQueueChange', this.uploadStats.value);
        this.progressManager.updateTotalProgress(this.getAllTasks());

        // 网络自适应调整
        if (this.config.enableNetworkAdaptation) {
          this.adjustPerformance();
        }
      },
      { deep: true }
    );

    // 监听速度变化
    watch(this.uploadSpeed, speed => {
      this.callbackManager.emit('onSpeedChange', speed);
    });

    // 监听总进度变化
    watch(this.totalProgress, progress => {
      this.callbackManager.emit('onTotalProgress', progress, this.uploadStats.value);
    });
  }

  private setupNetworkMonitoring(): void {
    if (!this.config.enableNetworkAdaptation || !('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    const updateNetworkInfo = () => this.networkAdapter.adaptToConnection(connection);

    connection?.addEventListener('change', updateNetworkInfo);
    updateNetworkInfo();
  }

  /**
   * 网络自适应性能调整
   */
  private adjustPerformance(): void {
    if (!this.config.enableNetworkAdaptation) return;

    const now = Date.now();
    if (now - this.adaptiveConfig.lastAdjustTime < this.adaptiveConfig.adjustInterval) return;

    this.adaptiveConfig.lastAdjustTime = now;
    const speed = this.uploadSpeed.value;
    const activeCount = this.activeUploads.value.size;

    // 根据网络速度动态调整并发数
    if (speed < 50 && activeCount > 1) {
      // 网速慢,减少并发
      this.config.maxConcurrentFiles = Math.max(1, this.config.maxConcurrentFiles - 1);
      this.config.maxConcurrentChunks = Math.max(2, this.config.maxConcurrentChunks - 1);
      console.log(`📉 网络速度慢,调整并发数: 文件=${this.config.maxConcurrentFiles}, 分片=${this.config.maxConcurrentChunks}`);
    } else if (speed > 500 && activeCount === this.config.maxConcurrentFiles) {
      // 网速快,增加并发
      this.config.maxConcurrentFiles = Math.min(6, this.config.maxConcurrentFiles + 1);
      this.config.maxConcurrentChunks = Math.min(12, this.config.maxConcurrentChunks + 1);
      console.log(`📈 网络速度快,调整并发数: 文件=${this.config.maxConcurrentFiles}, 分片=${this.config.maxConcurrentChunks}`);
    }

    // 根据网络质量调整分片大小
    const networkConfig = this.networkAdapter.getAdaptiveConfig();
    if (networkConfig.chunkSize) {
      this.config.chunkSize = networkConfig.chunkSize;
    }
  }

  // ==================== 文件管理 ====================

  /**
   * 添加文件到上传队列
   */
  public async addFiles(files: File[] | FileList | File, options: FileUploadOptions = {}): Promise<this> {
    const fileArray = this.normalizeFiles(files);
    const existingCount = this.uploadQueue.value.length + this.activeUploads.value.size;
    const { valid: validFiles } = this.fileValidator.validate(fileArray,existingCount);
    // Worker批量处理或主线程处理
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
      const results = await this.workerManager!.batchProcess(files, {
        calculateMD5: this.config.enableDeduplication,
        generateChunks: false,
        onProgress: (progress) => {
          console.log(`📦 文件预处理进度: ${progress}%`);
        }
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processResult = results[i];

        if (processResult.error) {
          console.warn(`⚠️ 文件处理失败: ${file.name}`, processResult.error);
          continue;
        }

        if (this.taskQueueManager.isDuplicate(file, this.getAllTasks())) {
          console.warn(`⚠️ 文件已存在: ${file.name}`);
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

        if (processResult.md5) {
          task.options.metadata = {
            ...task.options.metadata,
            md5: processResult.md5
          };
        }

        this.uploadQueue.value.push(task);
      }
    } catch (error) {
      console.warn('⚠️ Worker批量处理失败,回退到主线程:', error);
      await this.addFilesInMainThread(files, options);
    }
  }

  private async addFilesInMainThread(files: File[], options: FileUploadOptions): Promise<void> {
    for (const file of files) {
      if (this.taskQueueManager.isDuplicate(file, this.getAllTasks())) {
        console.warn(`⚠️ 文件已存在: ${file.name}`);
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
      return await FileCompressor.compressImage(
        file,
        this.config.compressionQuality,
        this.config.previewMaxWidth,
        this.config.previewMaxHeight
      );
    } catch (error) {
      console.warn('⚠️ 文件压缩失败:', error);
      return file;
    }
  }

  private async generatePreview(file: File): Promise<string | undefined> {
    if (!this.config.enablePreview || !PreviewGenerator.canGeneratePreview(file)) {
      return undefined;
    }
    try {
      if (file.type.startsWith('image/')) {
        return await PreviewGenerator.generateImagePreview(file);
      }
      if (file.type.startsWith('video/')) {
        return await PreviewGenerator.generateVideoPreview(file);
      }
      return undefined;
    } catch (error) {
      console.warn('⚠️ 生成预览失败:', error);
      return undefined;
    }
  }

  // ==================== 上传流程 ====================

  /**
   * 开始上传
   */
  public async start(): Promise<this> {
    // 如果没有任务,触发完成回调
    if (this.uploadQueue.value.length === 0 && this.activeUploads.value.size === 0) {
      await this.callbackManager.emit('onAllComplete', []);
      return this;
    }

    this.isUploading.value = true;
    this.speedCalculator.reset();

    try {
      await this.processQueue();
      await this.handleUploadComplete();
    } catch (error) {
      await this.callbackManager.emit('onAllError', error as Error);
    } finally {
      this.isUploading.value = false;
    }

    return this;
  }

  /**
   * 处理上传队列(核心流程)
   */
  private async processQueue(): Promise<void> {
    const uploadTasks: ChunkUploadTask[] = [];

    while (this.uploadQueue.value.length > 0 || this.activeUploads.value.size > 0) {
      // 检查是否暂停
      if (this.uploadController.isPaused.value) {
        console.log('⏸️ 检测到暂停信号,等待所有活跃任务完成...');
        await Promise.allSettled(uploadTasks.map(t => t.wait()));
        console.log('✅ 所有活跃任务已完成,暂停生效');
        return;
      }

      // 启动新任务
      while (
        this.uploadQueue.value.length > 0 &&
        this.activeUploads.value.size < this.config.maxConcurrentFiles &&
        !this.uploadController.isPaused.value
      ) {
        const task = this.uploadQueue.value.shift()!;

        console.log(`🚀 启动任务: ${task.file.name} (${(task.file.size / 1024 / 1024).toFixed(2)}MB)`);

        // 创建 AbortController
        this.uploadController.createAbortController(task.id);

        // 创建上传任务
        const uploadTask = new ChunkUploadTask(
          task,
          {
            ...this.config,
            getOptimalChunkSize: (fileSize: number) => {
              if (this.config.enableNetworkAdaptation) {
                return SmartChunkCalculator.calculateOptimalChunkSize(
                  fileSize,
                  this.speedCalculator.getAverageSpeed(),
                  this.config
                );
              }
              return task.options.chunkSize || this.config.chunkSize;
            },
            workerManager: this.workerManager,
            getNetworkConfig: () => this.networkAdapter.getAdaptiveConfig()
          },
          this.chunkManager,
          this.cacheManager,
          this.retryStrategy,
          this.callbackManager,
          this.progressManager,
          this.uploadController
        );

        this.activeUploads.value.set(task.id, task);
        uploadTasks.push(uploadTask);

        // 异步启动任务(不等待)
        uploadTask.start().then(() => {
          // 任务完成后处理
          this.activeUploads.value.delete(task.id);

          // 添加到完成列表
          if (!this.completedUploads.value.some(t => t.id === task.id)) {
            this.completedUploads.value.push(task);
          }

          // 清理控制器
          this.uploadController.cleanupTask(task.id);
        });
      }

      // 等待至少一个任务完成(避免忙等待)
      if (this.activeUploads.value.size > 0) {
        const incompleteTasks = uploadTasks.filter(t => !t.isCompleted());
        if (incompleteTasks.length > 0) {
          await Promise.race(incompleteTasks.map(t => t.wait()));
        }
      }

      // 短暂延迟,避免CPU占用过高
      await delay(CONSTANTS.NETWORK.POLL_INTERVAL);
    }

    // 等待所有任务真正完成
    console.log('⏳ 等待所有任务完成...');
    await Promise.allSettled(uploadTasks.map(t => t.wait()));
    console.log('✅ 所有任务已完成');
  }

  /**
   * 处理上传完成
   */
  private async handleUploadComplete(): Promise<void> {
    const completedTasks = this.completedUploads.value;
    const successTasks = completedTasks.filter(t => t.status === UploadStatus.SUCCESS);
    const errorTasks = completedTasks.filter(t => t.status === UploadStatus.ERROR);
    const pausedTasks = completedTasks.filter(t => t.status === UploadStatus.PAUSED);

    console.log(`📊 上传统计: 成功${successTasks.length}, 失败${errorTasks.length}, 暂停${pausedTasks.length}`);

    if (errorTasks.length > 0) {
      await this.callbackManager.emit(
        'onAllError',
        new Error(`${errorTasks.length}/${completedTasks.length} 个文件上传失败`)
      );
    } else if (pausedTasks.length === 0) {
      // 只有在没有暂停任务时才触发全部完成
      await this.callbackManager.emit('onAllComplete', successTasks);
    }
  }

  // ==================== 控制方法 ====================

  /**
   * 暂停单个任务
   */
  public pause(taskId: string): this {
    const task = this.getTask(taskId);
    if (!task) {
      console.warn(`⚠️ 未找到任务: ${taskId}`);
      return this;
    }

    console.log(`⏸️ 暂停任务: ${task.file.name}`);
    this.uploadController.pause(taskId);

    // 更新任务状态(如果任务正在上传中)
    if (task.status === UploadStatus.UPLOADING) {
      task.status = UploadStatus.PAUSED;
      task.pausedTime = Date.now();
      this.callbackManager.emit('onFilePause', task);
    }

    return this;
  }

  /**
   * 恢复单个任务
   */
  public resume(taskId: string): this {
    const task = this.getTask(taskId);
    if (!task) {
      console.warn(`⚠️ 未找到任务: ${taskId}`);
      return this;
    }

    if (task.status !== UploadStatus.PAUSED) {
      console.warn(`⚠️ 任务 ${task.file.name} 不是暂停状态,无法恢复`);
      return this;
    }

    console.log(`▶️ 恢复任务: ${task.file.name}`);

    // 恢复控制器状态
    this.uploadController.resume(taskId);

    // 更新任务状态
    task.status = UploadStatus.PENDING;
    const pauseDuration = task.pausedTime ? Date.now() - task.pausedTime : 0;
    task.pausedTime = 0;

    console.log(`ℹ️ 任务 ${task.file.name} 已暂停 ${(pauseDuration / 1000).toFixed(2)}s`);

    // 从完成列表移除
    this.completedUploads.value = this.completedUploads.value.filter(t => t.id !== taskId);

    // 添加到队列(如果不在队列中)
    if (!this.uploadQueue.value.some(t => t.id === taskId) &&
      !this.activeUploads.value.has(taskId)) {
      this.uploadQueue.value.unshift(task);
    }

    this.callbackManager.emit('onFileResume', task);

    // 如果当前没有在上传,启动上传
    if (!this.isUploading.value) {
      this.start();
    }

    return this;
  }

  /**
   * 暂停所有上传
   */
  public pauseAll(): this {
    console.log('⏸️ 暂停所有上传');

    // 设置全局暂停标志
    this.uploadController.pauseAll();

    // 暂停所有活跃任务
    this.activeUploads.value.forEach(task => {
      if (task.status === UploadStatus.UPLOADING) {
        task.status = UploadStatus.PAUSED;
        task.pausedTime = Date.now();
        this.callbackManager.emit('onFilePause', task);

        // 保存断点信息
        if (this.config.enableResume && this.config.enableCache) {
          this.saveTaskProgress(task);
        }
      }
    });

    // 暂停队列中的任务
    this.uploadQueue.value.forEach(task => {
      if (task.status !== UploadStatus.PAUSED) {
        task.status = UploadStatus.PAUSED;
        task.pausedTime = Date.now();
      }
    });

    console.log(`✅ 已暂停 ${this.activeUploads.value.size + this.uploadQueue.value.length} 个任务`);
    return this;
  }

  /**
   * 恢复所有上传
   */
  public resumeAll(): this {
    console.log('▶️ 恢复所有上传');

    // 找出所有暂停的任务
    const pausedTasks = this.completedUploads.value.filter(
      t => t.status === UploadStatus.PAUSED
    );

    if (pausedTasks.length === 0) {
      console.log('⚠️ 没有暂停的任务');
      return this;
    }

    // 恢复所有暂停的任务
    pausedTasks.forEach(task => {
      task.status = UploadStatus.PENDING;
      task.pausedTime = 0;

      // 尝试从缓存恢复进度
      if (this.config.enableResume && this.config.enableCache) {
        this.restoreTaskProgress(task);
      }

      this.uploadController.resume(task.id);

      // 添加到队列
      if (!this.uploadQueue.value.some(t => t.id === task.id)) {
        this.uploadQueue.value.push(task);
      }

      this.callbackManager.emit('onFileResume', task);
    });

    // 从完成列表中移除
    this.completedUploads.value = this.completedUploads.value.filter(
      t => t.status !== UploadStatus.PENDING
    );

    // 排序队列
    this.taskQueueManager.sort(this.uploadQueue.value);

    // 恢复总控制器状态
    this.uploadController.resumeAll();

    // 启动上传
    if (!this.isUploading.value) {
      this.start();
    }

    console.log(`✅ 已恢复 ${pausedTasks.length} 个任务`);
    return this;
  }

  /**
   * 取消单个任务
   */
  public cancel(taskId: string): this {
    const task = this.getTask(taskId);
    if (!task) {
      console.warn(`⚠️ 未找到任务: ${taskId}`);
      return this;
    }

    console.log(`🛑 取消任务: ${task.file.name}`);

    this.uploadController.cancel(taskId);
    task.status = UploadStatus.CANCELLED;
    task.endTime = Date.now();

    this.removeFile(taskId);
    this.callbackManager.emit('onFileCancel', task);

    return this;
  }

  /**
   * 取消所有任务
   */
  public cancelAll(): this {
    console.log('🛑 取消所有上传');

    this.uploadController.cancelAll();

    this.getAllTasks().forEach(task => {
      task.status = UploadStatus.CANCELLED;
      task.endTime = Date.now();
      this.callbackManager.emit('onFileCancel', task);
    });

    this.uploadQueue.value = [];
    this.activeUploads.value.clear();
    this.isUploading.value = false;

    return this;
  }

  /**
   * 清空所有文件
   */
  public clear(): this {
    this.cancelAll();
    this.completedUploads.value = [];
    this.progressManager.reset();

    if (this.config.enableCache) {
      this.cacheManager.clear();
    }

    console.log('🗑️ 已清空所有任务');
    return this;
  }

  // ==================== 任务管理 ====================

  /**
   * 移除文件
   */
  public removeFile(taskId: string): this {
    // 从队列中移除
    const queueIndex = this.uploadQueue.value.findIndex(t => t.id === taskId);
    if (queueIndex > -1) {
      this.uploadQueue.value.splice(queueIndex, 1);
    }

    // 从活跃任务中移除
    if (this.activeUploads.value.has(taskId)) {
      this.activeUploads.value.delete(taskId);
    }

    // 从完成列表中移除
    const completedIndex = this.completedUploads.value.findIndex(t => t.id === taskId);
    if (completedIndex > -1) {
      this.completedUploads.value.splice(completedIndex, 1);
    }

    // 清理控制器
    this.uploadController.cleanupTask(taskId);

    return this;
  }

  /**
   * 重试单个失败的文件
   */
  public retrySingleFile(taskId: string): this {
    const taskIndex = this.completedUploads.value.findIndex(
      t => t.id === taskId && t.status === UploadStatus.ERROR
    );

    if (taskIndex === -1) {
      console.warn(`⚠️ 未找到失败的任务: ${taskId}`);
      return this;
    }

    const task = this.completedUploads.value[taskIndex];

    console.log(`🔄 重试任务: ${task.file.name}`);

    // 重置任务状态
    this.resetTaskForRetry(task);

    // 从完成列表中移除
    this.completedUploads.value.splice(taskIndex, 1);

    // 添加到队列开头
    if (!this.uploadQueue.value.some(t => t.id === taskId)) {
      this.uploadQueue.value.unshift(task);
      this.taskQueueManager.sort(this.uploadQueue.value);
    }

    // 如果当前没有在上传,启动上传
    if (!this.isUploading.value) {
      this.start();
    }

    return this;
  }

  /**
   * 重试所有失败的文件
   */
  public retryFailed(): this {
    const failedTasks = this.completedUploads.value.filter(
      t => t.status === UploadStatus.ERROR
    );

    if (failedTasks.length === 0) {
      console.log('ℹ️ 没有失败的任务需要重试');
      return this;
    }

    console.log(`🔄 重试 ${failedTasks.length} 个失败的任务`);

    failedTasks.forEach(task => {
      this.resetTaskForRetry(task);
      this.uploadQueue.value.push(task);
    });

    this.completedUploads.value = this.completedUploads.value.filter(
      t => t.status !== UploadStatus.PENDING
    );

    this.taskQueueManager.sort(this.uploadQueue.value);

    if (!this.isUploading.value && this.uploadQueue.value.length > 0) {
      this.start();
    }

    return this;
  }

  /**
   * 重置任务状态用于重试
   */
  private resetTaskForRetry(task: FileTask): void {
    // 重置基本状态
    this.retryStrategy.resetTask(task);
    task.progress = 0;
    task.startTime = null;
    task.endTime = null;
    task.uploadedChunks = 0;
    task.speed = 0;

    // 智能重新计算分片大小
    if (this.config.enableNetworkAdaptation) {
      task.options.chunkSize = SmartChunkCalculator.calculateOptimalChunkSize(
        task.file.size,
        this.speedCalculator.getAverageSpeed(),
        this.config
      );
      console.log(`ℹ️ 任务 ${task.file.name} 重新计算分片大小: ${(task.options.chunkSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // 重置切片状态(保留已成功的切片用于断点续传)
    if (task.chunks) {
      task.chunks.forEach(chunk => {
        if (chunk.status !== ChunkStatus.SUCCESS || !this.config.enableResume) {
          chunk.status = ChunkStatus.PENDING;
          chunk.retryCount = 0;
          chunk.error = undefined;
          chunk.uploadTime = 0;
        }
      });
    }

    // 设置高优先级
    task.options.priority = 'high';
  }

  /**
   * 保存任务进度
   */
  private saveTaskProgress(task: FileTask): void {
    const progressKey = `progress_${task.id}`;
    const progressData = {
      taskId: task.id,
      fileName: task.file.name,
      fileSize: task.file.size,
      uploadedChunks: task.uploadedChunks,
      totalChunks: task.totalChunks,
      uploadedSize: task.uploadedSize,
      progress: task.progress,
      status: task.status,
      pausedTime: task.pausedTime,
      chunks: task.chunks?.map(chunk => ({
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
    console.log(`💾 已保存任务进度: ${task.file.name} (${task.uploadedChunks}/${task.totalChunks})`);
  }

  /**
   * 恢复任务进度
   */
  private restoreTaskProgress(task: FileTask): void {
    const progressKey = `progress_${task.id}`;
    const cachedData = this.cacheManager.get(progressKey);

    if (!cachedData) {
      console.log(`ℹ️ 未找到任务 ${task.file.name} 的缓存进度`);
      return;
    }

    // 恢复进度信息
    task.uploadedChunks = cachedData.uploadedChunks || 0;
    task.uploadedSize = cachedData.uploadedSize || 0;
    task.progress = cachedData.progress || 0;

    // 恢复分片状态
    if (cachedData.chunks && task.chunks) {
      cachedData.chunks.forEach((cachedChunk: any) => {
        const chunk = task.chunks.find(c => c.index === cachedChunk.index);
        if (chunk) {
          chunk.status = cachedChunk.status;
          chunk.etag = cachedChunk.etag;
          chunk.hash = cachedChunk.hash;
        }
      });
    }

    console.log(`📂 已恢复任务进度: ${task.file.name} (${task.uploadedChunks}/${task.totalChunks})`);
  }

  // ==================== 查询方法 ====================

  /**
   * 获取任务
   */
  public getTask(taskId: string): FileTask | undefined {
    return (
      this.uploadQueue.value.find(t => t.id === taskId) ||
      this.activeUploads.value.get(taskId) ||
      this.completedUploads.value.find(t => t.id === taskId)
    );
  }

  /**
   * 获取所有任务
   */
  private getAllTasks(): FileTask[] {
    return [
      ...this.uploadQueue.value,
      ...Array.from(this.activeUploads.value.values()),
      ...this.completedUploads.value
    ];
  }

  /**
   * 获取详细统计信息
   */
  public getDetailedStats(): {
    successRate: number;
    averageFileSize: number;
    totalUploadTime: number;
    networkQuality: string;
    cacheHitRate: number;
    workerEnabled: boolean;
    currentChunkSize: number;
  } {
    const stats = this.uploadStats.value;
    const allTasks = this.getAllTasks();

    const successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    const averageFileSize = stats.total > 0 ? stats.totalSize / stats.total : 0;
    const totalUploadTime = allTasks.reduce((sum, task) => {
      return sum + ((task.endTime || Date.now()) - (task.startTime || Date.now()));
    }, 0);

    return {
      successRate,
      averageFileSize,
      totalUploadTime,
      networkQuality: this.networkQuality.value,
      cacheHitRate: 0, // TODO: 实现缓存命中率统计
      workerEnabled: this.config.useWorker && !!this.workerManager,
      currentChunkSize: this.config.chunkSize
    };
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.cancelAll();

    if (this.workerManager) {
      this.workerManager.terminate();
      this.workerManager = undefined;
    }

    this.progressManager.reset();
    this.cacheManager.clear();

    console.log('🗑️ 上传管理器已销毁');
  }

  // ==================== 链式回调注册 ====================

  public onFileStart(callback: Parameters<CallbackManager['onFileStart']>[0]): this {
    this.callbackManager.onFileStart(callback);
    return this;
  }

  public onFileProgress(callback: Parameters<CallbackManager['onFileProgress']>[0]): this {
    this.callbackManager.onFileProgress(callback);
    return this;
  }

  public onFileSuccess(callback: Parameters<CallbackManager['onFileSuccess']>[0]): this {
    this.callbackManager.onFileSuccess(callback);
    return this;
  }

  public onFileError(callback: Parameters<CallbackManager['onFileError']>[0]): this {
    this.callbackManager.onFileError(callback);
    return this;
  }

  public onFilePause(callback: Parameters<CallbackManager['onFilePause']>[0]): this {
    this.callbackManager.onFilePause(callback);
    return this;
  }

  public onFileResume(callback: Parameters<CallbackManager['onFileResume']>[0]): this {
    this.callbackManager.onFileResume(callback);
    return this;
  }

  public onFileCancel(callback: Parameters<CallbackManager['onFileCancel']>[0]): this {
    this.callbackManager.onFileCancel(callback);
    return this;
  }

  public onTotalProgress(callback: Parameters<CallbackManager['onTotalProgress']>[0]): this {
    this.callbackManager.onTotalProgress(callback);
    return this;
  }

  public onAllComplete(callback: Parameters<CallbackManager['onAllComplete']>[0]): this {
    this.callbackManager.onAllComplete(callback);
    return this;
  }

  public onAllError(callback: Parameters<CallbackManager['onAllError']>[0]): this {
    this.callbackManager.onAllError(callback);
    return this;
  }

  public onSpeedChange(callback: Parameters<CallbackManager['onSpeedChange']>[0]): this {
    this.callbackManager.onSpeedChange(callback);
    return this;
  }

  public onQueueChange(callback: Parameters<CallbackManager['onQueueChange']>[0]): this {
    this.callbackManager.onQueueChange(callback);
    return this;
  }

  public onChunkSuccess(callback: Parameters<CallbackManager['onChunkSuccess']>[0]): this {
    this.callbackManager.onChunkSuccess(callback);
    return this;
  }

  public onChunkError(callback: Parameters<CallbackManager['onChunkError']>[0]): this {
    this.callbackManager.onChunkError(callback);
    return this;
  }
}