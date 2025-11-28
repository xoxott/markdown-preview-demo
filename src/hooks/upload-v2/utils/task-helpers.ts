/**
 * 任务操作辅助函数
 */
import type { FileTask } from '../types';
import { UploadStatus } from '../types';

/**
 * 获取所有任务（从多个集合中）
 */
export function getAllTasks(
  uploadQueue: FileTask[],
  activeUploads: Map<string, FileTask>,
  completedUploads: FileTask[]
): FileTask[] {
  return [
    ...uploadQueue,
    ...Array.from(activeUploads.values()),
    ...completedUploads
  ];
}

/**
 * 按状态过滤任务
 */
export function filterTasksByStatus(
  tasks: FileTask[],
  status: UploadStatus
): FileTask[] {
  return tasks.filter(task => task.status === status);
}

/**
 * 批量更新任务状态
 */
export function updateTasksStatus(
  tasks: FileTask[],
  status: UploadStatus,
  updates?: Partial<Pick<FileTask, 'pausedTime' | 'resumeTime' | 'endTime'>>
): void {
  tasks.forEach(task => {
    task.status = status;
    if (updates?.pausedTime !== undefined) task.pausedTime = updates.pausedTime;
    if (updates?.resumeTime !== undefined) task.resumeTime = updates.resumeTime;
    if (updates?.endTime !== undefined) task.endTime = updates.endTime;
  });
}

/**
 * 重置任务状态用于重试
 */
export function resetTaskForRetry(task: FileTask): void {
  task.status = UploadStatus.PENDING;
  task.progress = 0;
  task.startTime = null;
  task.endTime = null;
  task.uploadedChunks = 0;
  task.speed = 0;
  task.error = null;
  task.retryCount++;
}

