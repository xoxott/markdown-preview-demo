/**
 * 接口定义
 */
import type { FileTask, MergeResponse } from './task';
import type { ChunkInfo, ChunkUploadResponse } from './chunk';
import type { FileUploadOptions } from './config';

/** 上传控制器接口 */
export interface IUploadController {
  pause(taskId: string): void;
  resume(taskId: string): void;
  cancel(taskId: string): void;
  pauseAll(): void;
  resumeAll(): void;
  cancelAll(): void;
}

/** 进度管理器接口 */
export interface IProgressManager {
  updateFileProgress(taskId: string, progress: number): void;
  updateChunkProgress(taskId: string, chunkIndex: number, progress: number): void;
  updateTotalProgress(): void;
  getProgress(taskId: string): number;
  getTotalProgress(): number;
}

/** 文件处理器接口 */
export interface IFileProcessor {
  processFile(file: File, options: FileUploadOptions): Promise<FileTask>;
  validateFile(file: File): Promise<boolean>;
  compressFile(file: File): Promise<File>;
  generatePreview(file: File): Promise<string | undefined>;
}

/** 分片管理器接口 */
export interface IChunkManager {
  createChunks(task: FileTask, chunkSize: number): Promise<ChunkInfo[]>;
  uploadChunk(task: FileTask, chunk: ChunkInfo, abortSignal: AbortSignal): Promise<ChunkUploadResponse>;
  mergeChunks(task: FileTask, abortSignal: AbortSignal): Promise<MergeResponse>;
}

