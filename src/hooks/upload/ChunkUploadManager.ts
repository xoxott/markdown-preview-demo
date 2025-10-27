/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-11 10:36:56
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:20:00
 * @FilePath: \markdown-preview-demo\src\hooks\upload\ChunkUploadManager.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { computed, ref, watch } from "vue";
import CacheManager from "./managers/CacheManager";
import { CONSTANTS } from "./constants";
import EnhancedSpeedCalculator from "./calculators/EnhancedSpeedCalculator";
import FileCompressor from "./FileCompressor";
import FileValidator from "./FileValidator";
import NetworkAdapter from "./NetworkAdapter";
import PreviewGenerator from './PreviewGenerator';
import RetryStrategyManager from "./managers/RetryStrategyManager";
import Semaphore from "./Semaphore";
import SmartChunkCalculator from "./calculators/SmartChunkCalculator";
import TaskQueueManager from "./managers/TaskQueueManager";
import {
  CheckFileTransformer,
  ChunkInfo,
  ChunkStatus,
  ChunkUploadResponse,
  ChunkUploadTransformer,
  ExtendedUploadConfig,
  FileTask,
  FileUploadOptions,
  MergeChunksTransformer,
  MergeResponse,
  UploadCallbacks,
  UploadConfig,
  UploadStats,
  UploadStatus
} from "./type";
import UploadWorkerManager from "./managers/UploadWorkerManager";
import { calculateFileMD5, delay } from "./utils";
import { defaultCheckFileTransformer, defaultChunkUploadTransformer, defaultMergeChunksTransformer } from "./transformers/defaultChunkUploadTransformer";
import { CallbackManager } from "./managers/CallbackManager";
import { UploadController } from "./controllers/UploadController";
import { ProgressManager } from "./managers/ProgressManager";
import { ChunkUploadTask } from "./tasks/ChunkUploadTask";
import { ChunkManager } from "./managers/ChunkManager";

// ==================== 主类：分片上传管理器 ====================
export class ChunkUploadManager {

  private config: UploadConfig;

   // 管理器
  private callbackManager: CallbackManager;
  private uploadController: UploadController;
  private progressManager: ProgressManager;
  private chunkManager: ChunkManager;



  private callbacks: UploadCallbacks = {};
  private cacheManager: CacheManager;
  private networkAdapter: NetworkAdapter;
  private fileValidator: FileValidator;
  private taskQueueManager: TaskQueueManager;
  private retryStrategy: RetryStrategyManager;
  private workerManager?: UploadWorkerManager;

  // 响应式状态
  public readonly uploadQueue = ref<FileTask[]>([]);// 待上传队列
  public readonly activeUploads = ref<Map<string, FileTask>>(new Map()); // 上传中的
  public readonly completedUploads = ref<FileTask[]>([]); // 已完成的
  public readonly isUploading = ref(false);
  
  // 计算属性
  public readonly totalProgress = computed(() => this.progressManager.totalProgress.value);
  public readonly uploadSpeed = computed(() => this.progressManager.uploadSpeed.value);
  public readonly networkQuality = computed(() => this.progressManager.networkQuality.value);
  public readonly isPaused = computed(() => this.uploadController.isPaused.value);

  // 计算属性
  public readonly uploadStats = computed(() => 
    this.progressManager.calculateStats(
      this.uploadQueue.value,
      this.activeUploads.value,
      this.completedUploads.value
    )
  );

  private speedCalculator = new EnhancedSpeedCalculator();
  private abortController = new AbortController();
  private adaptiveConfig = {
    lastAdjustTime: 0,
    adjustInterval: CONSTANTS.NETWORK.ADJUST_INTERVAL,
  };


  constructor(config: Partial<UploadConfig> = {}) {
    this.config = this.mergeConfig(config); // 配置信息
    this.cacheManager = new CacheManager(); // 缓存
    this.callbackManager = new CallbackManager();


    this.uploadController = new UploadController(); // 上传控制
    this.networkAdapter = new NetworkAdapter(this.config); // 网络适配
    this.fileValidator = new FileValidator(this.config); // 文件校验
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
  private mergeConfig(config: Partial<ExtendedUploadConfig>): ExtendedUploadConfig {
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
      maxFileSize: CONSTANTS.UPLOAD.MAX_FILESIZE,
      maxFiles: CONSTANTS.UPLOAD.MAX_FILES,
      // accept: ['.jpg', '.png', '.pdf', 'image/*', 'video/*'],

      // 功能开关
      enableResume: false,  // 断点续传
      enableDeduplication: false, // 秒传


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
      // 默认的请求参数转换器
      chunkUploadTransformer: defaultChunkUploadTransformer,
      mergeChunksTransformer: defaultMergeChunksTransformer,
      checkFileTransformer: defaultCheckFileTransformer,
      ...config
    };
  }

  // ==================== 新增:动态设置请求转换器的方法 ====================
  /**
   * 设置分块上传参数转换器
   */
  public setChunkUploadTransformer(transformer: ChunkUploadTransformer): this {
    this.config.chunkUploadTransformer = transformer;
    return this;
  }

  /**
   * 设置合并分块参数转换器
   */
  public setMergeChunksTransformer(transformer: MergeChunksTransformer): this {
    this.config.mergeChunksTransformer = transformer;
    return this;
  }

  /**
   * 设置秒传检查参数转换器
   */
  public setCheckFileTransformer(transformer: CheckFileTransformer): this {
    this.config.checkFileTransformer = transformer;
    return this;
  }

  /**
   * 批量设置所有转换器
   */
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
       // 网速慢，减少并发
      this.config.maxConcurrentFiles = Math.max(1, this.config.maxConcurrentFiles - 1);
      this.config.maxConcurrentChunks = Math.max(2, this.config.maxConcurrentChunks - 1);
      console.log(`📉 网络速度慢，调整并发数: 文件=${this.config.maxConcurrentFiles}, 分片=${this.config.maxConcurrentChunks}`);
    } else if (speed > 500 && activeCount === this.config.maxConcurrentFiles) {
        // 网速快，增加并发
      this.config.maxConcurrentFiles = Math.min(6, this.config.maxConcurrentFiles + 1);
      this.config.maxConcurrentChunks = Math.min(12, this.config.maxConcurrentChunks + 1);
       console.log(`📈 网络速度快，调整并发数: 文件=${this.config.maxConcurrentFiles}, 分片=${this.config.maxConcurrentChunks}`);
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



  // ==================== 文件管理 ====================
    /**
   * 添加文件到上传队列
   * @param files - 要上传的文件列表
   * @param options - 上传选项
   * @returns Promise<FileTask[]>
   */
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
   
  /** 通过worker添加文件 */
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
  
  /** 主线程添加文件 */
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
  
  /** 文件归一化 */
  private normalizeFiles(files: File[] | FileList | File): File[] {
    if (files instanceof File) return [files];
    if (files instanceof FileList) return Array.from(files);
    if (Array.isArray(files)) return files;
    throw new Error('不支持的文件类型');
  }
  
  /** 文件压缩 */
  private async processFile(file: File): Promise<File> {
    if (!this.config.enableCompression || !file.type.startsWith('image/')) {
      return file;
    }
    try {
      return await FileCompressor.compressImage(file, this.config.compressionQuality, this.config.previewMaxWidth, this.config.previewMaxHeight);
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
    if (this.uploadQueue.value.length === 0 && this.activeUploads.value.size === 0) { // 没有上传中的执行回调所有上传完毕的回调
      await this.callbackManager.emit('onAllComplete', []);
      return this;
    }

    this.isUploading.value = true;
    this.speedCalculator.reset();

    try {
      await this.processQueue();
      await this.handleUploadComplete();
    } catch (error) {
      this.callbacks.onAllError?.(error as Error);
    } finally {
      this.isUploading.value = false;
    }
    return this;
  }

  private async processQueue(): Promise<void> {
     const uploadTasks: ChunkUploadTask[] = [];
     while (this.uploadQueue.value.length > 0 || this.activeUploads.value.size > 0) {
       // 检查是否暂停
      if (this.uploadController.isPaused.value) {
         // 等待所有活跃任务完成或暂停
        await Promise.allSettled(uploadTasks.map(t => t.wait()));
        return;
      }
      // 启动新任务
      while (
        this.uploadQueue.value.length > 0 &&
        this.activeUploads.value.size < this.config.maxConcurrentFiles &&
        !this.uploadController.isPaused.value
      ) {
        const task = this.uploadQueue.value.shift()!;
           // 创建 AbortController
        const abortController = this.uploadController.createAbortController(task.id);
       // 创建上传任务，注入智能分片配置
        const uploadTask = new ChunkUploadTask(
          task,
          {
            ...this.config,
            // 添加智能分片配置
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
            // 添加 Worker 管理器
            workerManager: this.workerManager,
            // 添加网络适配器
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
          // 开始上传
          uploadTask.start().then(() => {
          this.activeUploads.value.delete(task.id);
          this.completedUploads.value.push(task);
          this.uploadController.cleanupTask(task.id);
        });
    
      }
       // 等待至少一个任务完成
      if (this.activeUploads.value.size > 0) {
        await Promise.race(uploadTasks.filter(t => !t.isCompleted()).map(t => t.wait()));
      }
      await delay(CONSTANTS.NETWORK.POLL_INTERVAL);
    }
    // 等待所有任务完成
     await Promise.allSettled(uploadTasks.map(t => t.wait()));
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

      await this.calculateChunks(task);
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
  /** 检查秒传 */
  private async checkDeduplication(task: FileTask): Promise<boolean> {
     if (!this.config.enableDeduplication || !this.config.checkFileUrl) {
      return false;
    }
    const cacheKey = `file_${task.file.name}_${task.file.size}_${task.file.lastModified}`;
    if (this.config.enableCache && this.cacheManager.get(cacheKey) === 'uploaded') {
      return true;
    }
    try {
      const requestData = this.config.checkFileTransformer!({
        task,
        customParams: this.config.customParams
      });
      // const md5 = await calculateFileMD5(task.file);
      const isFormData = requestData instanceof FormData;
      const headers = {
        ...this.config.headers,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      };
      const response = await fetch(this.config.checkFileUrl, {
        method: 'POST',
        headers,
        body: isFormData ? requestData : JSON.stringify(requestData),
        signal: this.abortController.signal
      });
      if (!response.ok) return false;

      const result = await response.json();
        if (this.config.enableCache) {
          this.cacheManager.set(cacheKey, 'uploaded');
        }
       return result?.exists === true;
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

  private async handleUploadComplete(): Promise<void> {
    const completedTasks = this.completedUploads.value;
    const successTasks = completedTasks.filter(t => t.status === UploadStatus.SUCCESS);
    const errorTasks = completedTasks.filter(t => t.status === UploadStatus.ERROR);
    if (errorTasks.length > 0) {
      await this.callbackManager.emit(
        'onAllError',
        new Error(`${errorTasks.length}/${completedTasks.length} 个文件上传失败`)
      );
    } else {
      await this.callbackManager.emit('onAllComplete', successTasks);
    }
  }

  // ==================== 切片处理 ====================
  private async calculateChunks(task: FileTask): Promise<void> {
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
       await this.calculateChunksWithWorker(task, chunkSize, totalChunks);
    } else {
       await this.calculateChunksInMainThread(task, chunkSize, totalChunks);
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

  private async calculateChunksInMainThread(task: FileTask, chunkSize: number, totalChunks: number): Promise<void> {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, task.file.size);
       if (!task.fileMD5) {
          const fileMd5 = await calculateFileMD5(task.file);
          task.fileMD5 = fileMd5;
       }
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
       
        if (task.status === UploadStatus.PAUSED) {
          console.log(`⏸️ 任务 ${task.file.name} 已暂停，停止上传分片 ${chunk.index}`);
          return;
        }
        if (task.status === UploadStatus.CANCELLED) {
          console.log(`❌ 任务 ${task.file.name} 已取消，停止上传分片 ${chunk.index}`);
          return;
      }
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
      } 
      finally {
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
    const startTime = performance.now();
    try {
      const requestData = this.config.chunkUploadTransformer!({
        task,
        chunk,
        customParams: this.config.customParams
      });
    
      // 判断是FormData还是普通对象
      const isFormData = requestData instanceof FormData;
      const headers = {
        ...this.config.headers,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      };
      const response = await fetch(this.config.uploadChunkUrl, {
        method: 'POST',
        headers,
        body: isFormData ? requestData : JSON.stringify(requestData),
        signal: this.abortController.signal
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result: ChunkUploadResponse = await response.json();
      chunk.uploadTime = performance.now() - startTime;
      return result;
    } catch (error: any) {
      chunk.error = error.message;
      throw error;
    }
  }

  // ==================== 切片合并 ====================
  private async mergeChunks(task: FileTask): Promise<MergeResponse> {
    try {
      task.progress = CONSTANTS.PROGRESS.MERGE_START;
      await this.callbacks.onFileProgress?.(task);
      // 使用配置的转换器生成请求参数
      const requestData = this.config.mergeChunksTransformer!({
        task,
        customParams: this.config.customParams
      });
      // 判断是FormData还是普通对象
      const isFormData = requestData instanceof FormData;
      const headers = {
        ...this.config.headers,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      };

      const response = await fetch(this.config.mergeChunksUrl, {
        method: 'POST',
        headers,
        body: isFormData ? requestData : JSON.stringify(requestData),
        signal: this.abortController.signal
      });
      if (!response.ok) {
        throw new Error(`合并分块失败: ${response.status} ${response.statusText}`);
      }
      task.progress = CONSTANTS.PROGRESS.MERGE_END;
      await this.callbacks.onFileProgress?.(task);
      const result: MergeResponse = await response.json();
      return result;
    } catch (error: any) {
      throw new Error(`合并失败: ${error.message}`);
    }

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
   * 暂停所有上传
   * @returns this
   */
  public pauseAll(): this {
    console.log('🔧 暂停所有上传');
    this.isPaused.value = true;
    // 1. 中止所有网络请求
      this.taskAbortControllers.forEach((controller, taskId) => {
        console.log(`🔧 中止任务 ${taskId} 的网络请求`);
        controller.abort();
      });
      this.taskAbortControllers.clear();
      // 2. 将所有活跃任务标记为暂停
      this.activeUploads.value.forEach(task => {
        if (task.status === UploadStatus.UPLOADING) {
          task.status = UploadStatus.PAUSED;
          task.pausedTime = Date.now();
          this.callbacks.onFilePause?.(task);
          // 保存断点信息
          if (this.config.enableResume && this.config.enableCache) {
           this.cacheManager.set(task.id,task)
          }
          // 添加到已完成列表
          if (!this.completedUploads.value.some(t => t.id === task.id)) {
            this.completedUploads.value.push(task);
          }
        }
      });
      // 3. 将队列中的任务标记为暂停
        this.uploadQueue.value.forEach(task => {
          task.status = UploadStatus.PAUSED;
          if (!this.completedUploads.value.some(t => t.id === task.id)) {
            this.completedUploads.value.push(task);
          }
        });
        // 4. 清空活跃列表和队列
        this.activeUploads.value.clear();
        this.uploadQueue.value = [];
        this.isUploading.value = false;

        this.updateTotalProgress();
        console.log('✅ 所有上传已暂停');
    return this;
  }
  /**
   * 继续所有上传
   * @returns this
   */
  public resumeAll(): this {
     console.log('🔧 继续所有上传');
    this.isPaused.value = false;
     // 1. 找出所有暂停的任务
    const pausedTasks = this.completedUploads.value.filter(
      t => t.status === UploadStatus.PAUSED
    );

    if (pausedTasks.length === 0) {
      console.log('⚠️ 没有暂停的任务');
      return this;
    }
    // 2. 重置任务状态并添加到队列
    pausedTasks.forEach(task => {
      task.status = UploadStatus.PENDING;
      
      // 创建新的 AbortController
      this.taskAbortControllers.set(task.id, new AbortController());
      
      // 添加到队列
      if (!this.uploadQueue.value.some(t => t.id === task.id)) {
        this.uploadQueue.value.push(task);
      }
      
      this.callbacks.onFileResume?.(task);
    });

    // 3. 从完成列表中移除这些任务
    this.completedUploads.value = this.completedUploads.value.filter(
      t => t.status !== UploadStatus.PENDING
    );

      // 4. 排序队列
    this.taskQueueManager.sort(this.uploadQueue.value);

    // 5. 启动上传
    this.processQueue();

    console.log(`✅ ${pausedTasks.length} 个任务已继续上传`);
    // this.activeUploads.value.forEach(task => {
    //   if (task.status === UploadStatus.PAUSED) {
    //     task.status = UploadStatus.UPLOADING;
    //     task.resumeTime = Date.now();
    //     this.callbacks.onFileResume?.(task);
    //   }
    // });
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

    console.log('更新后的配置信息', this.config);
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
}

