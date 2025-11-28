/**
 * 核心类型定义
 */

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

// 确保枚举作为值导出（不仅仅是类型）
export { UploadStatus as UploadStatusEnum, ChunkStatus as ChunkStatusEnum };

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
  instantSpeed: number;
  networkQuality: string;
}

