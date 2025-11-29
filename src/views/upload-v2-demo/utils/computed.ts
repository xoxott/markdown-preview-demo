import type { FileTask } from '@/hooks/upload-v2';
import { UploadStatus } from '@/hooks/upload-v2';
import { computed, type Ref } from 'vue';
import type { FileListRow, TodayStatsData } from '../types';

/**
 * 计算失败文件数量
 */
export function useFailedCount(completedUploads: Ref<FileTask[]> | { value: FileTask[] }): Ref<number> {
  return computed(() => {
    const value = 'value' in completedUploads ? completedUploads.value : completedUploads;
    return value.filter((task) => task.status === UploadStatus.ERROR).length;
  });
}

/**
 * 计算网络质量文本
 */
export function useNetworkQualityText(networkQuality: Ref<string> | { value: string }): Ref<string> {
  return computed(() => {
    const value = 'value' in networkQuality ? networkQuality.value : networkQuality;
    const map: Record<string, string> = {
      good: '良好',
      fair: '一般',
      poor: '较差'
    };
    return map[value] || '未知';
  });
}

/**
 * 计算网络质量颜色
 */
export function useNetworkQualityColor(
  networkQuality: Ref<string> | { value: string }
): Ref<'success' | 'warning' | 'error' | 'default'> {
  return computed((): 'success' | 'warning' | 'error' | 'default' => {
    const value = 'value' in networkQuality ? networkQuality.value : networkQuality;
    const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      good: 'success',
      fair: 'warning',
      poor: 'error'
    };
    return map[value] || 'default';
  });
}

/**
 * 计算今日统计数据
 */
export function useTodayStatsData(
  getTodayStats: () => {
    date: string;
    totalFiles: number;
    totalSize: number;
    successFiles: number;
    failedFiles: number;
    averageSpeed: number;
    totalTime: number;
  } | null,
  uploadQueue: Ref<FileTask[]> | { value: FileTask[] },
  activeUploads: Ref<Map<string, FileTask>> | { value: Map<string, FileTask> },
  completedUploads: Ref<FileTask[]> | { value: FileTask[] }
): Ref<TodayStatsData> {
  return computed(() => {
    const stats = getTodayStats() || {
      date: new Date().toISOString().split('T')[0],
      totalFiles: 0,
      totalSize: 0,
      successFiles: 0,
      failedFiles: 0,
      averageSpeed: 0,
      totalTime: 0
    };

    // 计算当前所有任务的已上传大小总和
    const queueValue = 'value' in uploadQueue ? uploadQueue.value : uploadQueue;
    const activeValue = 'value' in activeUploads ? activeUploads.value : activeUploads;
    const completedValue = 'value' in completedUploads ? completedUploads.value : completedUploads;

    const allTasks = [
      ...queueValue,
      ...Array.from(activeValue.values()),
      ...completedValue
    ];

    const uploadedSize = allTasks.reduce((sum, task) => {
      const taskUploadedSize =
        task.uploadedSize != null &&
        Number.isFinite(task.uploadedSize) &&
        task.uploadedSize >= 0
          ? task.uploadedSize
          : 0;
      return sum + taskUploadedSize;
    }, 0);

    return {
      ...stats,
      uploadedSize: Number.isFinite(uploadedSize) && uploadedSize >= 0 ? uploadedSize : 0
    };
  });
}

/**
 * 计算文件列表数据
 */
export function useAllFiles(
  uploadQueue: Ref<FileTask[]> | { value: FileTask[] },
  activeUploads: Ref<Map<string, FileTask>> | { value: Map<string, FileTask> },
  completedUploads: Ref<FileTask[]> | { value: FileTask[] }
): Ref<FileListRow[]> {
  return computed(() => {
    const queueValue = 'value' in uploadQueue ? uploadQueue.value : uploadQueue;
    const activeValue = 'value' in activeUploads ? activeUploads.value : activeUploads;
    const completedValue = 'value' in completedUploads ? completedUploads.value : completedUploads;

    const queueFiles = queueValue.map((task, index) => ({
      ...task,
      section: 'queue' as const,
      index
    }));
    const activeFiles = Array.from(activeValue.values()).map((task, index) => ({
      ...task,
      section: 'active' as const,
      index
    }));
    const completedFiles = completedValue.map((task, index) => ({
      ...task,
      section: 'completed' as const,
      index
    }));
    return [...queueFiles, ...activeFiles, ...completedFiles];
  });
}

