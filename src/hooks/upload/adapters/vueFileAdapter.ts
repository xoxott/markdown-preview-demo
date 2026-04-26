/** Vue + Naive UI 文件适配器 将内部 FileTask 转换为 Naive UI UploadFileInfo */

import type { UploadFileInfo } from 'naive-ui';
import type { FileTask } from '../types/task';
import { UploadStatus } from '../types';

/** Naive UI 状态映射 */
const NAIVE_STATUS_MAP: Record<UploadStatus, UploadFileInfo['status']> = {
  [UploadStatus.PENDING]: 'pending',
  [UploadStatus.UPLOADING]: 'uploading',
  [UploadStatus.SUCCESS]: 'finished',
  [UploadStatus.ERROR]: 'error',
  [UploadStatus.PAUSED]: 'pending',
  [UploadStatus.CANCELLED]: 'removed'
} as const;

/** 转换为 Naive UI 状态 */
export function convertToNaiveStatus(status: UploadStatus): UploadFileInfo['status'] {
  return NAIVE_STATUS_MAP[status];
}

/** 将 FileTask 数组转换为 Naive UI UploadFileInfo 列表 */
export function createNaiveFileList(tasks: FileTask[]): UploadFileInfo[] {
  return tasks.map(
    (task): UploadFileInfo => ({
      id: task.id,
      name: task.file.name,
      status: convertToNaiveStatus(task.status),
      percentage: task.progress,
      file: task.file,
      thumbnailUrl: task.options.metadata?.preview as string | undefined,
      url: task.result?.fileUrl,
      type: task.file.type,
      fullPath: task.file.webkitRelativePath || task.file.name
    })
  );
}
