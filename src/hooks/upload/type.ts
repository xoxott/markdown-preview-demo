import type { UploadFileInfo } from 'naive-ui';

/** 上传状态枚举 */
export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  ERROR = 'error',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

/** 切片状态枚举 */
export enum ChunkStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  ERROR = 'error',
  RETRYING = 'retrying'
}

/**
 * 分块上传请求参数转换器
 */
export interface ChunkUploadTransformer {
  (params: {
    task:FileTask,
    chunk:ChunkInfo,
    customParams?: Record<string, any>;
  }): FormData | Record<string, any>;
}

/**
 * 合并分块请求参数转换器
 */
export interface MergeChunksTransformer {
  (params: {
     task:FileTask,
     customParams?: Record<string, any>;
  }): FormData | Record<string, any>;
}

/**
 * 秒传检查请求参数转换器
 */
export interface CheckFileTransformer {
  (params: {
    task:FileTask,
    customParams?: Record<string, any>;
  }): FormData | Record<string, any>;
}

/** 切片信息接口 */
export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
  blob: Blob;
  status: ChunkStatus;
  retryCount: number;
  uploadTime?: number;
  error?: Error;
  etag?: string;
  result?: any;
}

// ==================== 扩展配置接口 ====================
export interface ExtendedUploadConfig extends UploadConfig {
  // 请求参数转换器
  chunkUploadTransformer?: ChunkUploadTransformer;
  mergeChunksTransformer?: MergeChunksTransformer;
  checkFileTransformer?: CheckFileTransformer;
}

/** 文件任务接口 */
export interface FileTask {
  id: string;
  file: File;
  originalFile: File | undefined;
  status: UploadStatus;
  progress: number;
  speed: number; // KB/s
  chunks: ChunkInfo[];
  uploadedChunks: number;
  totalChunks: number;
  retryCount: number;
  startTime: number | null;
  endTime: number | null;
  pausedTime: number;
  resumeTime: number;
  result: any;
  error: Error | null;
  options: FileUploadOptions;
  fileMD5:string;
  // Naive UI 兼容
  naiveFile?: UploadFileInfo;
}

/** 文件上传选项 */
export interface FileUploadOptions {
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  customParams?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  maxRetries?: number;
  chunkSize?: number;
}

/** 上传配置接口 */
export interface UploadConfig {
  // 请求参数转换器
  chunkUploadTransformer?: ChunkUploadTransformer;
  mergeChunksTransformer?: MergeChunksTransformer;
  checkFileTransformer?: CheckFileTransformer;
  // 并发控制
  maxConcurrentFiles: number;
  maxConcurrentChunks: number;

  // 切片配置
  chunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;

  // 重试配置
  maxRetries: number;
  retryDelay: number;
  retryBackoff: number;

  // 接口配置
  uploadChunkUrl: string;
  mergeChunksUrl: string;
  checkFileUrl?: string; // 秒传检查
  cancelUploadUrl?: string; //取消上传

  // 请求配置
  headers: Record<string, string>;
  timeout: number;

  // 自定义参数
  customParams: Record<string, any>;

  // 文件过滤
  accept?: string[];
  maxFileSize?: number; // bytes
  maxFiles?: number; //最大文件数

  // 功能开关
  enableResume: boolean; // 断点续传
  enableDeduplication: boolean; // 文件去重
  enablePreview: boolean; // 预览功能
  enableCompression: boolean; // 自动压缩

  // 性能优化
  useWorker: boolean; // Web Worker
  enableCache: boolean; // 缓存

  enableNetworkAdaptation: boolean; // 网络自适应
  enableSmartRetry: boolean;// 智能重试
  
  compressionQuality: number; // 压缩百分比
  previewMaxWidth: number;  // 预览宽度
  previewMaxHeight: number; // 预览高度
}

/** 回调函数类型 */
export interface UploadCallbacks {
  onFileStart?: (task: FileTask) => void | Promise<void>;
  onFileProgress?: (task: FileTask) => void;
  onFileSuccess?: (task: FileTask) => void | Promise<void>;
  onFileError?: (task: FileTask, error: Error) => void;
  onFilePause?: (task: FileTask) => void;
  onFileResume?: (task: FileTask) => void;
  onFileCancel?: (task: FileTask) => void;
  onChunkSuccess?: (task: FileTask, chunk: ChunkInfo) => void;
  onChunkError?: (task: FileTask, chunk: ChunkInfo, error: Error) => void;
  onTotalProgress?: (progress: number, status: UploadStats) => void;
  onAllComplete?: (tasks: FileTask[]) => void;
  onAllError?: (error: Error) => void;
  onSpeedChange?: (speed: number) => void;
  onQueueChange?: (status: UploadStats) => void;
}

/** 上传统计信息 */
export interface UploadStats {
  completed: number;
  active: number;
  pending: number;
  failed: number;
  paused: number;
  cancelled: number;
  total: number;
  totalSize: number;
  uploadedSize: number;
  averageSpeed: number; // KB/s
  estimatedTime: number; // seconds
  instantSpeed:number;
  networkQuality:string;
}

/** 上传响应接口 */
export interface ChunkUploadResponse {
  success: boolean;
  chunkIndex: number;
  etag?: string;
  uploadId?: string;
  error?: string;
}

export interface MergeResponse {
  success: boolean;
  fileUrl: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  error?: string;
  thumbnail?: string;
  doc_id?: string;
  originalFile?: File;
  uploadTime: number;
}


// types/upload.types.ts
export interface IUploadController {
  pause(taskId: string): void;
  resume(taskId: string): void;
  cancel(taskId: string): void;
  pauseAll(): void;
  resumeAll(): void;
  cancelAll(): void;
}

export interface IProgressManager {
  updateFileProgress(taskId: string, progress: number): void;
  updateChunkProgress(taskId: string, chunkIndex: number, progress: number): void;
  updateTotalProgress(): void;
  getProgress(taskId: string): number;
  getTotalProgress(): number;
}

export interface IFileProcessor {
  processFile(file: File, options: FileUploadOptions): Promise<FileTask>;
  validateFile(file: File): Promise<boolean>;
  compressFile(file: File): Promise<File>;
  generatePreview(file: File): Promise<string | undefined>;
}

export interface IChunkManager {
  createChunks(task: FileTask, chunkSize: number): Promise<ChunkInfo[]>;
  uploadChunk(task: FileTask, chunk: ChunkInfo,abortSignal:AbortSignal): Promise<ChunkUploadResponse>;
  mergeChunks(task: FileTask,abortSignal:AbortSignal): Promise<MergeResponse>;
}