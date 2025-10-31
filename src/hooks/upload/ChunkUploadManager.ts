/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-11 10:36:56
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-31 15:55:41
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
  UploadCallbacks,
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
  private isAddingFiles = ref(false); // 添加文件处理中标志
  private addFilesPromise?: Promise<void>; // 新增：追踪添加文件的Promise

  private addFilesAbortController?: AbortController; // 用于取消文件添加

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
      useWorker: true,                // Web Worker
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
   * 添加文件到上传队列（增强版）
   */
  public async addFiles(files: File[] | FileList | File, options: FileUploadOptions = {}): Promise<this> {
    // 如果正在添加文件，取消之前的操作
    if (this.isAddingFiles.value && this.addFilesAbortController) {
      console.log('⚠️ 正在添加文件，取消之前的操作');
      this.addFilesAbortController.abort();
      // 等待之前的操作完成
      if (this.addFilesPromise) {
        try {
          await this.addFilesPromise;
        } catch (e) {
          // 忽略取消错误
        }
      }
    }
    
    this.isAddingFiles.value = true;
    this.addFilesAbortController = new AbortController();
    
    // 保存Promise引用
    this.addFilesPromise = this.doAddFiles(files, options, this.addFilesAbortController.signal);
    
    try {
      await this.addFilesPromise;
    } finally {
      this.isAddingFiles.value = false;
      this.addFilesAbortController = undefined;
      this.addFilesPromise = undefined;
    }
    
    return this;
  }

  /**
   * 实际执行文件添加
   */
  private async doAddFiles(
    files: File[] | FileList | File, 
    options: FileUploadOptions,
    signal?: AbortSignal
  ): Promise<void> {
    const fileArray = this.normalizeFiles(files);
    const existingCount = this.uploadQueue.value.length + this.activeUploads.value.size;
    
    // 文件验证
    const { valid: validFiles } = this.fileValidator.validate(fileArray, existingCount);
    
    if (validFiles.length === 0) {
      console.log('⚠️ 没有有效文件');
      return;
    }
    
    console.log(`📁 开始处理 ${validFiles.length} 个文件...`);
    
    try {
      await this.batchAddFiles(validFiles, options, signal);
      
      // 检查是否被中断
      if (signal?.aborted) {
        console.log('⚠️ 文件添加被中断');
        return;
      }
      
      // 排序
      this.taskQueueManager.sort(this.uploadQueue.value);
      console.log(`✅ 文件处理完成，共 ${validFiles.length} 个文件`);
    } catch (error) {
      if (signal?.aborted) {
        console.log('⚠️ 文件添加被取消');
      } else {
        console.error('❌ 文件添加失败:', error);
        throw error;
      }
    }
  }

  /**
   * 创建单个任务（优化版）
   */
  private async createSingleTask(
    file: File,
    options: FileUploadOptions
  ): Promise<FileTask | null> {
    try {
      // 延迟处理大文件的压缩和预览
      const processedFile = await this.processFileOptimized(file);

      // 创建基础任务（不生成预览）
      const task = this.taskQueueManager.createTask(
        file,
        processedFile,
        options,
        this.config,
        this.speedCalculator.getAverageSpeed()
      );

      // 异步生成预览（不阻塞）
      if (this.config.enablePreview) {
        this.generatePreviewAsync(processedFile).then(preview => {
          if (preview) {
            // task.options.metadata.preview = preview;
          }
        }).catch(() => {
          // 忽略预览生成错误
        });
      }

      return task;
    } catch (error) {
      console.error(`创建任务失败: ${file.name}`, error);
      return null;
    }
  }

  /**
  * 批量添加文件（分批异步处理）
  */
  private async batchAddFiles(
    files: File[],
    options: FileUploadOptions,
    signal?: AbortSignal
  ): Promise<void> {
    const BATCH_SIZE = 10; // 每批处理文件数
    const BATCH_DELAY = 10; // 批次间延迟(ms)
    const USE_WORKER_THRESHOLD = 20; // 使用 Worker 的文件数阈值

    // 决定是否使用 Worker
    const useWorker = this.config.useWorker &&
      this.workerManager &&
      files.length > USE_WORKER_THRESHOLD;

    if (useWorker) {
      // 大批量文件使用 Worker 处理
      await this.batchAddFilesWithWorker(files, options, signal);
    } else {
      // 小批量文件使用主线程分批处理
      await this.batchAddFilesInMainThread(files, options, signal, BATCH_SIZE, BATCH_DELAY);
    }
  }

  /**
  * 在主线程批量添加文件（优化版）
  */
  private async batchAddFilesInMainThread(
    files: File[],
    options: FileUploadOptions,
    signal?: AbortSignal,
    batchSize: number = 10,
    batchDelay: number = 10
  ): Promise<void> {
    const pendingTasks: FileTask[] = [];
    const startTime = Date.now();

    for (let i = 0; i < files.length; i += batchSize) {
      // 检查是否被取消
      if (signal?.aborted) {
        console.log('⚠️ 文件添加被取消');
        break;
      }

      const batch = files.slice(i, i + batchSize);
      const batchTasks: FileTask[] = [];

      // 使用 Promise.all 并行处理批次内的文件
      await Promise.all(
        batch.map(async (file) => {
          if (signal?.aborted) return;

          // 快速检查重复（不进行深度比较）
          if (this.isFileDuplicate(file)) {
            console.warn(`⚠️ 文件已存在: ${file.name}`);
            return;
          }

          try {
            const task = await this.createSingleTask(file, options);
            if (task) {
              batchTasks.push(task);
            }
          } catch (error) {
            console.error(`处理文件失败: ${file.name}`, error);
          }
        })
      );

      pendingTasks.push(...batchTasks);

      // 定期批量更新队列（减少响应式更新频率）
      if (pendingTasks.length >= 50 || i + batchSize >= files.length) {
        this.uploadQueue.value.push(...pendingTasks);
        pendingTasks.length = 0;

        // 显示进度
        const processed = Math.min(i + batchSize, files.length);
        console.log(`📊 已处理 ${processed}/${files.length} 个文件`);
      }

      // 让出主线程，避免阻塞
      if (i + batchSize < files.length) {
        await this.yieldToMain(batchDelay);
      }
    }

    // 添加剩余任务
    if (pendingTasks.length > 0) {
      this.uploadQueue.value.push(...pendingTasks);
    }

    const elapsed = Date.now() - startTime;
    console.log(`⏱️ 文件处理耗时: ${(elapsed / 1000).toFixed(2)}s`);
  }


  /**
  * 异步生成预览（不阻塞主流程）
  */
  private async generatePreviewAsync(file: File): Promise<string | undefined> {
    if (!this.config.enablePreview || !PreviewGenerator.canGeneratePreview(file)) {
      return undefined;
    }
    return new Promise((resolve) => {
      const generatePreview = async () => {
        try {
          if (file.type.startsWith('image/')) {
            const preview = await PreviewGenerator.generateImagePreview(file);
            resolve(preview);
          } else if (file.type.startsWith('video/')) {
            const preview = await PreviewGenerator.generateVideoPreview(file);
            resolve(preview);
          } else {
            resolve(undefined);
          }
        } catch (error) {
          console.warn('⚠️ 生成预览失败:', error);
          resolve(undefined);
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(generatePreview);
      } else {
        setTimeout(generatePreview, 100);
      }
    });
  }

  /**
   * 让出主线程控制权
   */
  private yieldToMain(delay: number = 0): Promise<void> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window && delay === 0) {
        requestIdleCallback(() => resolve());
      } else {
        setTimeout(resolve, delay);
      }
    });
  }

  /**
  * 使用 Worker 批量添加文件（优化版）
  */
  private async batchAddFilesWithWorker(
    files: File[],
    options: FileUploadOptions,
    signal?: AbortSignal
  ): Promise<void> {
    const CHUNK_SIZE = 50; // Worker 每批处理数量
    const pendingTasks: FileTask[] = [];

    try {
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        // 检查是否被取消
        if (signal?.aborted) {
          console.log('⚠️ 文件添加被取消');
          break;
        }

        const batch = files.slice(i, i + CHUNK_SIZE);
        const batchResults = await this.workerManager!.batchProcess(batch, {
          calculateMD5: this.config.enableDeduplication,
          generateChunks: false,
          onProgress: (progress) => {
            // 静默处理，避免频繁更新UI
            if (progress % 20 === 0) {
              console.log(`📦 批次 ${Math.floor(i / CHUNK_SIZE) + 1} 处理进度: ${progress}%`);
            }
          }
        });

        // 批量创建任务
        const batchTasks = await this.createTasksBatch(batch, batchResults, options, signal);
        pendingTasks.push(...batchTasks);

        // 定期批量更新队列（减少响应式更新）
        if (pendingTasks.length >= 100 || i + CHUNK_SIZE >= files.length) {
          this.uploadQueue.value.push(...pendingTasks);
          pendingTasks.length = 0;
        }

        // 让出主线程
        await this.yieldToMain();
      }

      // 添加剩余任务
      if (pendingTasks.length > 0) {
        this.uploadQueue.value.push(...pendingTasks);
      }
    } catch (error) {
      console.error('⚠️ Worker 批处理失败:', error);
      // 回退到主线程处理剩余文件
      const remainingFiles = files.slice(pendingTasks.length);
      if (remainingFiles.length > 0) {
        await this.batchAddFilesInMainThread(remainingFiles, options, signal, 10, 10);
      }
    }
  }

  /**
  * 批量创建任务
  */
  private async createTasksBatch(
    files: File[],
    workerResults: any[],
    options: FileUploadOptions,
    signal?: AbortSignal
  ): Promise<FileTask[]> {
    const tasks: FileTask[] = [];

    for (let i = 0; i < files.length; i++) {
      if (signal?.aborted) break;

      const file = files[i];
      const processResult = workerResults[i];

      if (processResult.error) {
        console.warn(`⚠️ 文件处理失败: ${file.name}`, processResult.error);
        continue;
      }

      if (this.isFileDuplicate(file)) {
        console.warn(`⚠️ 文件已存在: ${file.name}`);
        continue;
      }

      const processedFile = await this.processFileOptimized(file);
      const task = this.taskQueueManager.createTask(
        file,
        processedFile,
        options,
        this.config,
        this.speedCalculator.getAverageSpeed(),
        undefined
      );

      if (processResult.md5) {
        task.options.metadata = {
          ...task.options.metadata,
          md5: processResult.md5
        };
      }

      tasks.push(task);
    }

    return tasks;
  }

  /**
  * 快速检查文件是否重复
  */
  private isFileDuplicate(file: File): boolean {
    // 使用文件名+大小+修改时间的组合快速判断
    const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
    return this.getAllTasks().some(task => {
      const taskKey = `${task.file.name}_${task.file.size}_${task.file.lastModified}`;
      return taskKey === fileKey;
    });
  }

  /**
  * 优化的文件处理（延迟压缩）
  */
  private async processFileOptimized(file: File): Promise<File> {
    // 小于 1MB 或非图片直接返回
    if (file.size < 1024 * 1024 || !file.type.startsWith('image/')) {
      return file;
    }
    // 大于 10MB 的图片才压缩
    if (!this.config.enableCompression || file.size < 10 * 1024 * 1024) {
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

  private normalizeFiles(files: File[] | FileList | File): File[] {
    if (files instanceof File) return [files];
    if (files instanceof FileList) return Array.from(files);
    if (Array.isArray(files)) return files;
    throw new Error('不支持的文件类型');
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
   * 暂停所有上传（等待文件添加完成）
   */
  public async pauseAll(): Promise<this> {
    console.log('⏸️ 准备暂停所有上传');
    
    // 如果正在添加文件，先中断添加操作
    if (this.isAddingFiles.value) {
      console.log('⚠️ 正在添加文件，先中断添加操作');
      
      if (this.addFilesAbortController) {
        this.addFilesAbortController.abort();
      }
      
      // 等待添加操作完成或被取消
      if (this.addFilesPromise) {
        try {
          await Promise.race([
            this.addFilesPromise,
            new Promise(resolve => setTimeout(resolve, 1000)) // 最多等待1秒
          ]);
        } catch (e) {
          // 忽略错误
        }
      }
    }
    
    // 设置全局暂停标志
    this.uploadController.pauseAll();
    
    // 批量处理暂停操作
    await this.batchPauseTasks();
    
    console.log(`✅ 所有上传已暂停`);
    return this;
  }


  /**
   * 批量暂停任务
   */
  private async batchPauseTasks(): Promise<void> {
    const tasksToUpdate: FileTask[] = [];
    const tasksToSave: FileTask[] = [];
    
    // 收集所有需要暂停的任务
    const allTasks = [
      ...Array.from(this.activeUploads.value.values()),
      ...this.uploadQueue.value
    ];
    
    // 批量更新状态
    const updates: Array<() => void> = [];
    
    allTasks.forEach(task => {
      if (task.status === UploadStatus.UPLOADING || task.status === UploadStatus.PENDING) {
        updates.push(() => {
          task.status = UploadStatus.PAUSED;
          task.pausedTime = Date.now();
          tasksToUpdate.push(task);
          
          if (this.config.enableResume && this.config.enableCache) {
            tasksToSave.push(task);
          }
        });
      }
    });
    
    // 批量执行更新
    const BATCH_SIZE = 50;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      batch.forEach(update => update());
      
      // 让出主线程
      if (i + BATCH_SIZE < updates.length) {
        await this.yieldToMain(0);
      }
    }
    
    // 异步保存进度
    if (tasksToSave.length > 0) {
      this.batchSaveTaskProgress(tasksToSave).catch(console.error);
    }
    
    // 异步触发回调
    if (tasksToUpdate.length > 0) {
      this.batchEmitCallbacks('onFilePause', tasksToUpdate).catch(console.error);
    }
  }

  /**
   * 批量触发回调（修复类型）
   */
  private async batchEmitCallbacks<K extends keyof UploadCallbacks>(
    event: K, 
    tasks: FileTask[]
  ): Promise<void> {
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      
      await new Promise<void>(resolve => {
        const emitBatch = () => {
          batch.forEach(task => {
            // 根据不同的事件类型调用对应的方法
            switch (event) {
              case 'onFilePause':
                this.callbackManager.emit('onFilePause', task);
                break;
              case 'onFileResume':
                this.callbackManager.emit('onFileResume', task);
                break;
              case 'onFileCancel':
                this.callbackManager.emit('onFileCancel', task);
                break;
              case 'onFileStart':
                this.callbackManager.emit('onFileStart', task);
                break;
              case 'onFileSuccess':
                this.callbackManager.emit('onFileSuccess', task);
                break;
              case 'onFileError':
                this.callbackManager.emit('onFileError', task, task.error || new Error('Unknown error'));
                break;
              default:
                console.warn(`Unknown event: ${event}`);
            }
          });
          resolve();
        };
        
        if ('requestIdleCallback' in window) {
          requestIdleCallback(emitBatch);
        } else {
          setTimeout(emitBatch, 0);
        }
      });
    }
  }

  /**
   * 批量保存任务进度（异步）
   */
  private async batchSaveTaskProgress(tasks: FileTask[]): Promise<void> {
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      await new Promise<void>(resolve => {
        const saveBatch = () => {
          batch.forEach(task => this.saveTaskProgress(task));
          resolve();
        };
        
        if ('requestIdleCallback' in window) {
          requestIdleCallback(saveBatch);
        } else {
          setTimeout(saveBatch, 0);
        }
      });
    }
  }

  /**
   * 恢复所有上传（优化版）
   */
  public resumeAll(): this {
    console.log('▶️ 恢复所有上传');
    // 收集所有暂停的任务（从各个列表）
    const allPausedTasks: FileTask[] = [];
    
    // 从已完成列表中找暂停的任务
    const pausedInCompleted = this.completedUploads.value.filter(
      t => t.status === UploadStatus.PAUSED
    );
    allPausedTasks.push(...pausedInCompleted);
    
    // 从队列中找暂停的任务
    const pausedInQueue = this.uploadQueue.value.filter(
      t => t.status === UploadStatus.PAUSED
    );
    allPausedTasks.push(...pausedInQueue);
    
    // 从活跃任务中找暂停的任务（理论上不应该有，但为了保险）
    this.activeUploads.value.forEach(task => {
      if (task.status === UploadStatus.PAUSED) {
        allPausedTasks.push(task);
      }
    });
    if (allPausedTasks.length === 0) {
      console.log('⚠️ 没有暂停的任务');
      return this;
    }
    console.log(`📋 找到 ${allPausedTasks.length} 个暂停的任务`);
    // 批量恢复任务进度
    const tasksToRestore: FileTask[] = [];
    if (this.config.enableResume && this.config.enableCache) {
      allPausedTasks.forEach(task => {
        tasksToRestore.push(task);
      });
    }
    // 异步恢复进度（不阻塞主线程）
    if (tasksToRestore.length > 0) {
      this.batchRestoreTaskProgress(tasksToRestore);
    }
    // 批量更新任务状态
    const updatedTasks: FileTask[] = [];
    allPausedTasks.forEach(task => {
      task.status = UploadStatus.PENDING;
      task.pausedTime = 0;
      this.uploadController.resume(task.id);
      updatedTasks.push(task);
    });
    // 重新组织任务队列
    this.reorganizeTasks(updatedTasks);
    // 恢复总控制器状态
    this.uploadController.resumeAll();
    // 异步触发回调
    Promise.resolve().then(() => {
      updatedTasks.forEach(task => {
        this.callbackManager.emit('onFileResume', task);
      });
    });
    // 启动上传
    if (!this.isUploading.value) {
      this.start();
    }
    console.log(`✅ 已恢复 ${updatedTasks.length} 个任务`);
    return this;
  }

   /**
   * 批量恢复任务进度（异步）
   */
  private async batchRestoreTaskProgress(tasks: FileTask[]): Promise<void> {
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      
      await new Promise<void>(resolve => {
        const restoreBatch = () => {
          batch.forEach(task => this.restoreTaskProgress(task));
          resolve();
        };
        
        if ('requestIdleCallback' in window) {
          requestIdleCallback(restoreBatch);
        } else {
          setTimeout(restoreBatch, 0);
        }
      });
    }
  }

  /**
   * 重新组织任务队列
   */
  private reorganizeTasks(restoredTasks: FileTask[]): void {
    // 清理已完成列表中的待恢复任务
    const completedTaskIds = new Set(restoredTasks.map(t => t.id));
    this.completedUploads.value = this.completedUploads.value.filter(
      t => !completedTaskIds.has(t.id) || t.status !== UploadStatus.PENDING
    );
    // 确保恢复的任务都在队列中
    const queueTaskIds = new Set(this.uploadQueue.value.map(t => t.id));
    const activeTaskIds = new Set(this.activeUploads.value.keys());
    
    restoredTasks.forEach(task => {
      if (!queueTaskIds.has(task.id) && !activeTaskIds.has(task.id)) {
        this.uploadQueue.value.push(task);
      }
    });
    // 排序队列
    this.taskQueueManager.sort(this.uploadQueue.value);
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
   * 取消所有任务（包括正在添加的文件）
   */
  public async cancelAll(): Promise<this> {
    console.log('🛑 取消所有上传');
    
    // 如果正在添加文件，先取消添加
    if (this.isAddingFiles.value && this.addFilesAbortController) {
      this.addFilesAbortController.abort();
      
      // 等待添加操作结束
      if (this.addFilesPromise) {
        try {
          await Promise.race([
            this.addFilesPromise,
            new Promise(resolve => setTimeout(resolve, 500))
          ]);
        } catch (e) {
          // 忽略错误
        }
      }
    }
    
    // 取消所有上传
    this.uploadController.cancelAll();
    
    // 批量更新任务状态
    const allTasks = this.getAllTasks();
    const updates: Array<() => void> = [];
    
    allTasks.forEach(task => {
      updates.push(() => {
        task.status = UploadStatus.CANCELLED;
        task.endTime = Date.now();
      });
    });
    
    // 批量执行
    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      batch.forEach(update => update());
      
      if (i + BATCH_SIZE < updates.length) {
        await this.yieldToMain(0);
      }
    }
    
    // 清空队列
    this.uploadQueue.value = [];
    this.activeUploads.value.clear();
    this.isUploading.value = false;
    
    // 异步触发回调
    this.batchEmitCallbacks('onFileCancel', allTasks).catch(console.error);
    
    console.log('✅ 所有任务已取消');
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