/**
 * 分片相关类型定义
 */
import type { ChunkStatus } from './core';
import type { FileTask } from './task';

/** 切片信息接口 */
export interface ChunkInfo {
  hash?: string; // 分片哈希值（MD5）
  index: number;
  start: number;
  end: number;
  size: number;
  blob: Blob | null; // 允许为 null，支持延迟创建
  status: ChunkStatus;
  retryCount: number;
  uploadTime?: number;
  error?: Error;
  etag?: string; // 上传后的 ETag（用于验证）
  result?: ChunkUploadResponse; // 上传响应结果
}

/** 分块上传请求参数转换器 */
export interface ChunkUploadTransformer {
  (params: { task: FileTask; chunk: ChunkInfo; customParams?: Record<string, any> }): FormData | Record<string, any>;
}

/** 上传响应接口 */
export interface ChunkUploadResponse {
  success: boolean;
  chunkIndex: number;
  etag?: string;
  uploadId?: string;
  error?: string;
}

