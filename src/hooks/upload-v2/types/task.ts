/**
 * 任务相关类型定义
 */
import type { UploadFileInfo } from 'naive-ui';
import type { UploadStatus } from './core';
import type { ChunkInfo } from './chunk';
import type { FileUploadOptions } from './config';

/** 分片错误信息 */
export interface ChunkErrorInfo {
  chunkIndex: number;
  error: string;
  errorType: string;
  retryCount: number;
}

/** 文件任务接口 */
export interface FileTask {
  uploadedSize: number; // 已上传大小（字节）
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
  result: MergeResponse | null;
  error: Error | null;
  options: FileUploadOptions;
  fileMD5: string;
  chunkErrors?: ChunkErrorInfo[]; // 分片级别的错误信息
  // Naive UI 兼容
  naiveFile?: UploadFileInfo;
}

/** 合并响应接口 */
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

