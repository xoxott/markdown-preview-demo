/**
 * 上传编排器
 * 负责协调各个服务和管理器，提供统一的上传管理接口
 */
import { computed, ref, watch } from 'vue';
import { CONSTANTS } from '../constants';
import { UploadController } from '../controllers/UploadController';
import { CacheManager } from '../managers/CacheManager';
import { CallbackManager } from '../managers/CallbackManager';
import { FileProcessingPipeline } from '../managers/FileProcessingPipeline';
import { NetworkAdaptationManager } from '../managers/NetworkAdaptationManager';
import { ProgressManager } from '../managers/ProgressManager';
import { ProgressPersistence } from '../managers/ProgressPersistence';
import { QueueManager } from '../managers/QueueManager';
import { StatsManager } from '../managers/StatsManager';
import { TaskOperations } from '../managers/TaskOperations';
import { TaskStateManager } from '../managers/TaskStateManager';
import { ChunkService } from '../services/ChunkService';
import { FileService } from '../services/FileService';
import { NetworkService } from '../services/NetworkService';
import { TaskService } from '../services/TaskService';
import { defaultCheckFileTransformer, defaultChunkUploadTransformer, defaultMergeChunksTransformer } from '../transformers/RequestTransformer';
import type { ExtendedUploadConfig, FileTask, FileUploadOptions, UploadConfig } from '../types';
import { checkCompatibility, warnCompatibility } from '../utils/browser-compat';
import { validateAndWarnConfig } from '../utils/config-validator';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../utils/performance-monitor';
import { UploadEngine } from './UploadEngine';

/**
 * 上传编排器
 * 协调各个服务和管理器
 */
export class UploadOrchestrator {
  private config: ExtendedUploadConfig;

  // 服务层
  private fileService: FileService;
  private chunkService: ChunkService;
  private taskService: TaskService;
  private networkService: NetworkService;

  // 基础管理器
  private queueManager: QueueManager;
  private progressManager: ProgressManager;
  private cacheManager: CacheManager;
  private callbackManager: CallbackManager;
  private uploadController: UploadController;
  private statsManager: StatsManager;

  // 新增的管理器
  private taskStateManager: TaskStateManager;
  private progressPersistence: ProgressPersistence;
  private networkAdaptationManager: NetworkAdaptationManager;
  private fileProcessingPipeline: FileProcessingPipeline;
  private taskOperations: TaskOperations;

  // 核心引擎
  private uploadEngine: UploadEngine;

  // 响应式状态
  public readonly uploadQueue = ref<FileTask[]>([]);
  public readonly activeUploads = ref<Map<string, FileTask>>(new Map());
  public readonly completedUploads = ref<FileTask[]>([]);
  public readonly isUploading = ref(false);
  private isAddingFiles = ref(false);
  private addFilesAbortController?: AbortController;
  private addFilesPromise?: Promise<void>;

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

  constructor(config: Partial<ExtendedUploadConfig> = {}) {
    // 检查浏览器兼容性（仅在开发环境或首次检查时）
    if (import.meta.env.DEV) {
      const compatResult = checkCompatibility();
      if (!compatResult.supported) {
        warnCompatibility();
      }
    }

    // 验证配置
    validateAndWarnConfig(config);

    this.config = this.mergeConfig(config);

    // 初始化基础管理器
    this.cacheManager = new CacheManager();
    this.callbackManager = new CallbackManager();
    this.progressManager = new ProgressManager();
    this.uploadController = new UploadController();
    this.queueManager = new QueueManager();
    this.statsManager = new StatsManager();

    // 初始化服务
    this.fileService = new FileService(this.config);
    this.networkService = new NetworkService(this.config);
    this.taskService = new TaskService(this.config);

    // 创建分片服务
    this.chunkService = new ChunkService(
      this.config,
      (chunk, size, time) => this.progressManager.updateChunkProgress(chunk, size, time)
    );

    // 初始化新增的管理器
    this.taskStateManager = new TaskStateManager(
      this.uploadQueue,
      this.activeUploads,
      this.completedUploads
    );
    this.progressPersistence = new ProgressPersistence(this.cacheManager);
    this.networkAdaptationManager = new NetworkAdaptationManager(
      this.config,
      this.networkService,
      this.progressManager
    );
    this.fileProcessingPipeline = new FileProcessingPipeline(
      this.fileService,
      this.taskService,
      this.progressManager,
      this.taskStateManager,
      this.queueManager
    );
    this.taskOperations = new TaskOperations(
      this.config,
      this.uploadController,
      this.callbackManager,
      this.progressPersistence,
      this.taskStateManager,
      this.queueManager,
      this.progressManager
    );

    // 创建上传引擎
    this.uploadEngine = new UploadEngine(
      this.config,
      this.chunkService,
      this.cacheManager,
      this.callbackManager,
      this.progressManager,
      this.uploadController,
      this.statsManager
    );

    // 设置任务获取器
    this.uploadController.setTaskGetter((taskId: string) => this.taskStateManager.getTask(taskId));

    // 设置监听器
    this.setupWatchers();
    this.networkAdaptationManager.setupNetworkMonitoring();
  }

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

      // 接口配置
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
      enableResume: true,
      enableDeduplication: false,
      useWorker: true,
      enableCache: true,
      enableNetworkAdaptation: true,
      enableSmartRetry: true,

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
   * 设置监听器
   */
  private setupWatchers(): void {
    watch(
      [this.uploadQueue, this.activeUploads, this.completedUploads],
      () => {
        this.callbackManager.emit('onQueueChange', this.uploadStats.value);
        this.progressManager.updateTotalProgress(this.taskStateManager.getAllTasks());

        if (this.config.enableNetworkAdaptation) {
          this.networkAdaptationManager.adjustPerformance(
            this.uploadSpeed.value,
            this.activeUploads.value.size
          );
        }
      },
      { deep: true }
    );

    watch(this.uploadSpeed, speed => {
      this.callbackManager.emit('onSpeedChange', speed);
    });

    watch(this.totalProgress, progress => {
      this.callbackManager.emit('onTotalProgress', progress, this.uploadStats.value);
    });
  }

  /**
   * 添加文件到上传队列
   */
  public async addFiles(files: File[] | FileList | File, options: FileUploadOptions = {}): Promise<this> {
    if (this.isAddingFiles.value && this.addFilesAbortController) {
      this.addFilesAbortController.abort();
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

    this.addFilesPromise = this.fileProcessingPipeline.processFiles(
      files,
      options,
      this.addFilesAbortController.signal
    );

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
   * 开始上传
   */
  public async start(): Promise<this> {
    if (this.uploadQueue.value.length === 0 && this.activeUploads.value.size === 0) {
      await this.callbackManager.emit('onAllComplete', []);
      return this;
    }

    this.isUploading.value = true;
    this.progressManager.reset();

    // 开始性能监控
    performanceMonitor.start();

    try {
      await this.uploadEngine.processQueue(
        this.uploadQueue.value,
        this.activeUploads.value,
        this.completedUploads.value
      );
      await this.uploadEngine.handleUploadComplete(this.completedUploads.value);
    } catch (error) {
      await this.callbackManager.emit('onAllError', error as Error);
    } finally {
      this.isUploading.value = false;
    }

    return this;
  }

  /**
   * 暂停单个任务
   */
  public pause(taskId: string): this {
    this.taskOperations.pause(taskId, () => this.isUploading.value);
    return this;
  }

  /**
   * 恢复单个任务
   */
  public resume(taskId: string): this {
    this.taskOperations.resume(taskId, () => this.isUploading.value, () => this.start());
    return this;
  }

  /**
   * 暂停所有上传
   */
  public async pauseAll(): Promise<this> {
    if (this.isAddingFiles.value && this.addFilesAbortController) {
      this.addFilesAbortController.abort();
    }

    this.taskOperations.pauseAll();
    return this;
  }

  /**
   * 恢复所有上传
   */
  public resumeAll(): this {
    this.taskOperations.resumeAll(() => this.isUploading.value, () => this.start());
    return this;
  }

  /**
   * 取消单个任务
   */
  public cancel(taskId: string): this {
    this.taskOperations.cancel(taskId);
    this.uploadController.cleanupTask(taskId);
    return this;
  }

  /**
   * 取消所有任务
   */
  public async cancelAll(): Promise<this> {
    if (this.isAddingFiles.value && this.addFilesAbortController) {
      this.addFilesAbortController.abort();
    }

    this.taskOperations.cancelAll();
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

    return this;
  }

  /**
   * 移除文件
   */
  public removeFile(taskId: string): this {
    this.taskStateManager.removeFile(taskId);
    this.uploadController.cleanupTask(taskId);
    return this;
  }

  /**
   * 重试单个失败的文件
   */
  public retrySingleFile(taskId: string): this {
    this.taskOperations.retrySingleFile(taskId, () => this.isUploading.value, () => this.start());
    return this;
  }

  /**
   * 重试所有失败的文件
   */
  public retryFailed(): this {
    this.taskOperations.retryFailed(() => this.isUploading.value, () => this.start());
    return this;
  }

  /**
   * 获取任务
   */
  public getTask(taskId: string): FileTask | undefined {
    return this.taskStateManager.getTask(taskId);
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<UploadConfig>): this {
    this.config = { ...this.config, ...newConfig };

    if ('enableNetworkAdaptation' in newConfig) {
      this.networkAdaptationManager.setupNetworkMonitoring();
    }

    return this;
  }

  /**
   * 销毁管理器（完善资源清理）
   */
  public destroy(): void {
    // 取消所有任务
    this.cancelAll();

    // 重置进度管理器
    this.progressManager.reset();

    // 清空缓存
    this.cacheManager.clear();

    logger.info('上传器已销毁', {});
  }

  /**
   * 获取统计信息管理器
   */
  public getStatsManager(): StatsManager {
    return this.statsManager;
  }

  // 链式回调注册
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
