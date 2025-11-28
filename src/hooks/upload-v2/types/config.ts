/**
 * 配置相关类型定义
 */
import type { FileTask } from './task';
import type { ChunkUploadTransformer } from './chunk';

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

/** 合并分块请求参数转换器 */
export interface MergeChunksTransformer {
  (params: { task: FileTask; customParams?: Record<string, any> }): FormData | Record<string, any>;
}

/** 秒传检查请求参数转换器 */
export interface CheckFileTransformer {
  (params: { task: FileTask; customParams?: Record<string, any> }): FormData | Record<string, any>;
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
  cancelUploadUrl?: string; // 取消上传

  // 请求配置
  headers: Record<string, string>;
  timeout: number;

  // 自定义参数
  customParams: Record<string, any>;

  // 文件过滤
  accept?: string[];
  maxFileSize?: number; // bytes
  maxFiles?: number; // 最大文件数

  // 功能开关
  enableResume: boolean; // 断点续传
  enableDeduplication: boolean; // 文件去重
  enablePreview: boolean; // 预览功能
  enableCompression: boolean; // 自动压缩

  // 性能优化
  useWorker: boolean; // Web Worker
  enableCache: boolean; // 缓存

  enableNetworkAdaptation: boolean; // 网络自适应
  enableSmartRetry: boolean; // 智能重试

  compressionQuality: number; // 压缩百分比
  previewMaxWidth: number; // 预览宽度
  previewMaxHeight: number; // 预览高度
}

/** 扩展配置接口 */
export interface ExtendedUploadConfig extends UploadConfig {
  // 请求参数转换器（已在 UploadConfig 中定义，这里保持兼容）
  chunkUploadTransformer?: ChunkUploadTransformer;
  mergeChunksTransformer?: MergeChunksTransformer;
  checkFileTransformer?: CheckFileTransformer;
}

