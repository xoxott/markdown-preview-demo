/**
 * 回调函数类型定义
 */
import type { FileTask } from './task';
import type { ChunkInfo } from './chunk';
import type { UploadStats } from './core';

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

