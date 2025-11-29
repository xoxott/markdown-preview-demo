import type { FileTask, UploadConfig, UploadStats } from '@/hooks/upload-v2';
import type { ChunkInfo } from '@/hooks/upload-v2';
import { ChunkStatus, UploadStatus } from '@/hooks/upload-v2';

/**
 * 事件日志类型
 */
export interface EventLog {
  time: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'progress' | 'pause' | 'resume' | 'cancel' | 'chunk-success' | 'chunk-error' | 'all-complete' | 'all-error' | 'add-files' | 'start' | 'pause-all' | 'resume-all' | 'retry-failed' | 'retry-single' | 'config-update' | 'i18n' | 'clear' | 'remove' | 'exceed';
  message: string;
  data?: unknown;
}

/**
 * 抽屉状态类型
 */
export interface DrawerState {
  settings: boolean;
  stats: boolean;
  performance: boolean;
  events: boolean;
  i18n: boolean;
  advanced: boolean;
}

/**
 * 文件列表行类型（包含 section 和 index）
 */
export interface FileListRow extends FileTask {
  section: 'queue' | 'active' | 'completed';
  index: number;
}

/**
 * 分片大小选项类型
 */
export interface ChunkSizeOption {
  label: string;
  value: number;
}

/**
 * 上传 Hook 返回值类型（完整类型定义）
 */
export interface UploadHookReturn {
  // 方法
  addFiles: (files: File[]) => Promise<void>;
  start: () => Promise<void>;
  pauseAll: () => Promise<void>;
  pause: (taskId: string) => void;
  resumeAll: () => void;
  resume: (taskId: string) => void;
  cancel: (taskId: string) => void;
  cancelAll: () => Promise<void>;
  retryFailed: () => void;
  retrySingleFile: (taskId: string) => void;
  removeFile: (taskId: string) => void;
  clear: () => void;
  updateConfig: (config: Partial<UploadConfig>) => void;
  
  // 状态
  uploadQueue: { value: FileTask[] };
  activeUploads: { value: Map<string, FileTask> };
  completedUploads: { value: FileTask[] };
  totalProgress: { value: number };
  uploadSpeed: { value: number };
  uploadStats: { value: UploadStats };
  isUploading: { value: boolean };
  isPaused: { value: boolean };
  networkQuality: { value: string };
  
  // 统计
  getTodayStats: () => { date: string; totalFiles: number; totalSize: number; successFiles: number; failedFiles: number; averageSpeed: number; totalTime: number; uploadedSize?: number } | null;
  getHistoryStats: (days: number) => Array<{ date: string; totalFiles: number; totalSize: number; successFiles: number; failedFiles: number; averageSpeed: number; totalTime: number }>;
  getTrendAnalysis: (days: number) => { speedTrend: 'increasing' | 'stable' | 'decreasing'; successRate: number; averageSpeed: number; peakSpeed: number; recentStats: unknown[] };
  todayStats: { value: { date: string; totalFiles: number; totalSize: number; successFiles: number; failedFiles: number; averageSpeed: number; totalTime: number; uploadedSize?: number } | null };
  trendAnalysis: { value: { speedTrend: 'increasing' | 'stable' | 'decreasing'; successRate: number; averageSpeed: number; peakSpeed: number; recentStats: unknown[] } };
  
  // 性能
  getPerformanceReport: () => unknown;
  getPerformanceMetrics: () => {
    networkRequestCount: number;
    totalUploadTime: number;
    averageChunkTime: number;
    chunkUploadTimes: number[];
    memoryUsage?: { used: number; total: number };
  };
  
  // 国际化
  setLanguage: (lang: 'zh-CN' | 'en-US') => void;
  
  // 工具函数
  formatFileSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond: number) => string;
  formatTime: (seconds: number) => string;
  getProgressStatus: () => 'success' | 'error' | 'default';
  getStatusText: (status: UploadStatus) => string;
  getFileIcon: (fileName: string) => string;
  getFileColor: (fileName: string) => string;
  
  // 上传器实例
  uploader: {
    onFileProgress: (callback: (task: FileTask) => void) => void;
    onFileSuccess: (callback: (task: FileTask) => void) => void;
    onFileError: (callback: (task: FileTask, error: Error) => void) => void;
    onFilePause: (callback: (task: FileTask) => void) => void;
    onFileResume: (callback: (task: FileTask) => void) => void;
    onFileCancel: (callback: (task: FileTask) => void) => void;
    onChunkSuccess: (callback: (task: FileTask, chunk: ChunkInfo) => void) => void;
    onChunkError: (callback: (task: FileTask, chunk: ChunkInfo, error: Error) => void) => void;
    onAllComplete: (callback: (tasks: FileTask[]) => void) => void;
    onAllError: (callback: (error: Error) => void) => void;
  };
}

/**
 * 任务详情抽屉数据
 */
export interface TaskDetailData {
  task: FileTask;
  formatFileSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond: number) => string;
  formatTime: (seconds: number) => string;
  getStatusText: (status: UploadStatus) => string;
  ChunkStatus: typeof ChunkStatus;
  UploadStatus: typeof UploadStatus;
}

/**
 * 统计信息数据
 */
export interface TodayStatsData {
  date: string;
  totalFiles: number;
  totalSize: number;
  successFiles: number;
  failedFiles: number;
  averageSpeed: number;
  totalTime: number;
  uploadedSize: number;
}

/**
 * 历史统计数据
 */
export interface HistoryStatsData {
  date: string;
  totalFiles: number;
  totalSize: number;
  successFiles: number;
  failedFiles: number;
  averageSpeed: number;
  totalTime: number;
}

/**
 * 趋势分析数据
 */
export interface TrendAnalysisData {
  speedTrend: 'increasing' | 'stable' | 'decreasing';
  successRate: number;
  averageSpeed: number;
  peakSpeed: number;
  recentStats: HistoryStatsData[];
}

/**
 * 性能指标数据
 */
export interface PerformanceMetricsData {
  networkRequestCount: number;
  totalUploadTime: number;
  averageChunkTime: number;
  chunkUploadTimes: number[];
  memoryUsage?: {
    used: number;
    total: number;
  };
}

