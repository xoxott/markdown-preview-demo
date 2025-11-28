/**
 * 进度管理器
 * 负责管理上传进度和速度
 */
import { ref } from 'vue';
import { SpeedCalculator } from '../calculators/SpeedCalculator';
import { TimeEstimator } from '../calculators/TimeEstimator';
import { CONSTANTS } from '../constants';
import type { ChunkInfo, FileTask, UploadStats } from '../types';
import { ChunkStatus, UploadStatus } from '../types';
import { filterTasksByStatus } from '../utils/task-helpers';
import { throttle } from '../utils/throttle';

export class ProgressManager {
  private speedCalculator: SpeedCalculator;
  private timeEstimator: TimeEstimator;

  // 节流后的更新函数
  private throttledUpdateTotalProgress: () => void;
  private throttledUpdateSpeed: () => void;

  public readonly totalProgress = ref(0);
  public readonly uploadSpeed = ref(0);
  public readonly networkQuality = ref<'good' | 'fair' | 'poor'>('good');

  // 内部状态（用于批量更新）
  private pendingTotalProgress = 0;
  private pendingSpeed = 0;

  constructor() {
    this.speedCalculator = new SpeedCalculator();
    this.timeEstimator = new TimeEstimator();

    // 创建节流函数（每 100ms 更新一次）
    const updateInterval = CONSTANTS.NETWORK.POLL_INTERVAL;
    this.throttledUpdateTotalProgress = throttle(() => {
      this.totalProgress.value = this.pendingTotalProgress;
    }, updateInterval);

    this.throttledUpdateSpeed = throttle(() => {
      this.uploadSpeed.value = this.pendingSpeed;
    }, updateInterval);
  }

  /** 更新文件进度 */
  updateFileProgress(task: FileTask): void {
    if (task.totalChunks > 0 && Number.isFinite(task.totalChunks) && task.totalChunks > 0) {
      const uploadProgress = (task.uploadedChunks / task.totalChunks) * 100;
      task.progress = Math.max(0, Math.min(100, Math.round(uploadProgress)));
      task.speed = Number.isFinite(this.uploadSpeed.value) && this.uploadSpeed.value >= 0
        ? this.uploadSpeed.value
        : 0;

      // 优先使用 chunks 计算已上传大小
      if (task.chunks && Array.isArray(task.chunks)) {
        const calculatedSize = task.chunks
          .filter((c: ChunkInfo) => c && c.status === ChunkStatus.SUCCESS)
          .reduce((sum: number, c: ChunkInfo) => {
            const chunkSize = c?.size;
            if (chunkSize != null && Number.isFinite(chunkSize) && chunkSize >= 0) {
              return sum + chunkSize;
            }
            return sum;
          }, 0);

        // 确保计算结果是有效数字
        if (Number.isFinite(calculatedSize) && calculatedSize >= 0) {
          task.uploadedSize = calculatedSize;
        } else {
          task.uploadedSize = 0;
        }
      } else {
        // 如果没有 chunks，使用基于 progress 的计算
        const fileSize = task?.file?.size;
        const progress = task?.progress;
        if (fileSize != null && progress != null &&
            Number.isFinite(fileSize) && Number.isFinite(progress) &&
            fileSize >= 0 && progress >= 0 && progress <= 100) {
          const calculated = (fileSize * progress) / 100;
          task.uploadedSize = Number.isFinite(calculated) && calculated >= 0 ? calculated : 0;
        } else {
          task.uploadedSize = 0;
        }
      }
    } else {
      // 如果没有分片或分片数为0，重置进度
      task.progress = 0;
      task.uploadedSize = 0;
    }
  }

  /** 更新分片进度（使用节流） */
  updateChunkProgress(chunk: ChunkInfo, size: number, uploadTime: number): void {
    this.speedCalculator.addData(size, uploadTime);
    const speed = this.speedCalculator.getSpeed();
    this.pendingSpeed = Number.isFinite(speed) ? speed : 0;

    // 使用节流更新
    this.throttledUpdateSpeed();
    this.updateNetworkQuality();
  }

  /** 更新总进度（使用节流） */
  updateTotalProgress(tasks: FileTask[]): void {
    if (tasks.length === 0) {
      this.pendingTotalProgress = 0;
      this.totalProgress.value = 0;
      return;
    }

    // 计算总大小，添加边界检查
    const totalSize = tasks.reduce((sum, task) => {
      const fileSize = task?.file?.size;
      if (fileSize != null && Number.isFinite(fileSize) && fileSize >= 0) {
        return sum + fileSize;
      }
      return sum;
    }, 0);

    // 计算已上传大小：优先使用 task.uploadedSize（如果已设置且有效），否则回退到计算值
    const uploadedSize = tasks.reduce((sum, task) => {
      // 优先使用 task.uploadedSize（如果已设置且有效）
      if (task.uploadedSize != null && Number.isFinite(task.uploadedSize) && task.uploadedSize >= 0) {
        return sum + task.uploadedSize;
      }

      // 回退到基于 progress 的计算
      const fileSize = task?.file?.size;
      const progress = task?.progress;

      if (fileSize != null && progress != null &&
          Number.isFinite(fileSize) && Number.isFinite(progress) &&
          fileSize >= 0 && progress >= 0 && progress <= 100) {
        const calculated = (fileSize * progress) / 100;
        if (Number.isFinite(calculated) && calculated >= 0) {
          return sum + calculated;
        }
      }

      return sum;
    }, 0);

    // 确保计算结果是有效数字
    const safeTotalSize = Number.isFinite(totalSize) && totalSize > 0 ? totalSize : 1; // 避免除以0
    const safeUploadedSize = Number.isFinite(uploadedSize) && uploadedSize >= 0 ? uploadedSize : 0;

    this.pendingTotalProgress = Math.min(100, Math.max(0, Math.round((safeUploadedSize / safeTotalSize) * 100) || 0));

    // 使用节流更新
    this.throttledUpdateTotalProgress();
  }

  /** 计算统计信息（优化：使用工具函数） */
  calculateStats(
    uploadQueue: FileTask[],
    activeUploads: Map<string, FileTask>,
    completedUploads: FileTask[]
  ): UploadStats {
    const allTasks = [...uploadQueue, ...Array.from(activeUploads.values()), ...completedUploads];

    // 统计各种状态的任务数量
    const active = Array.from(activeUploads.values()).filter(t => t.status === UploadStatus.UPLOADING).length;
    const pending = uploadQueue.filter(t => t.status === UploadStatus.PENDING).length;
    const completed = filterTasksByStatus(completedUploads, UploadStatus.SUCCESS).length;
    const failed = filterTasksByStatus(completedUploads, UploadStatus.ERROR).length;
    const paused = allTasks.filter(t => t.status === UploadStatus.PAUSED).length;
    const cancelled = filterTasksByStatus(completedUploads, UploadStatus.CANCELLED).length;
    const total = allTasks.length;

    // 计算总大小，添加边界检查
    const totalSize = allTasks.reduce((sum, task) => {
      const fileSize = task?.file?.size;
      if (fileSize != null && Number.isFinite(fileSize) && fileSize >= 0) {
        return sum + fileSize;
      }
      return sum;
    }, 0);

    // 计算已上传大小：优先使用 task.uploadedSize（如果已设置且有效），否则回退到计算值
    const uploadedSize = allTasks.reduce((sum, task) => {
      // 优先使用 task.uploadedSize（如果已设置且有效）
      if (task.uploadedSize != null && Number.isFinite(task.uploadedSize) && task.uploadedSize >= 0) {
        return sum + task.uploadedSize;
      }

      // 回退到基于 progress 的计算
      const fileSize = task?.file?.size;
      const progress = task?.progress;

      if (fileSize != null && progress != null &&
          Number.isFinite(fileSize) && Number.isFinite(progress) &&
          fileSize >= 0 && progress >= 0 && progress <= 100) {
        const calculated = (fileSize * progress) / 100;
        if (Number.isFinite(calculated) && calculated >= 0) {
          return sum + calculated;
        }
      }

      return sum;
    }, 0);

    // 确保 uploadedSize 和 totalSize 都是有效数字
    const safeUploadedSize = Number.isFinite(uploadedSize) && uploadedSize >= 0 ? uploadedSize : 0;
    const safeTotalSize = Number.isFinite(totalSize) && totalSize >= 0 ? totalSize : 0;
    const remainingSize = Math.max(0, safeTotalSize - safeUploadedSize);

    const averageSpeed = this.speedCalculator.getAverageSpeed();
    const safeAverageSpeed = Number.isFinite(averageSpeed) && averageSpeed >= 0 ? averageSpeed : 0;
    const estimatedTime = this.timeEstimator.update(remainingSize, safeAverageSpeed / 1024); // 转换为 KB/s

    return {
      completed,
      active,
      pending,
      failed,
      paused,
      cancelled,
      total,
      totalSize: safeTotalSize,
      uploadedSize: safeUploadedSize,
      averageSpeed: safeAverageSpeed / 1024, // 转换为 KB/s
      instantSpeed: Number.isFinite(this.uploadSpeed.value) && this.uploadSpeed.value >= 0
        ? this.uploadSpeed.value / 1024
        : 0, // 转换为 KB/s
      estimatedTime: Number.isFinite(estimatedTime) && estimatedTime >= 0 ? estimatedTime : 0,
      networkQuality: this.networkQuality.value
    };
  }

  /** 更新网络质量评级 */
  private updateNetworkQuality(): void {
    const speed = this.uploadSpeed.value / 1024; // 转换为 KB/s
    if (speed < 50) {
      this.networkQuality.value = 'poor';
    } else if (speed < 200) {
      this.networkQuality.value = 'fair';
    } else {
      this.networkQuality.value = 'good';
    }
  }

  /** 重置进度管理器 */
  reset(): void {
    this.totalProgress.value = 0;
    this.uploadSpeed.value = 0;
    this.networkQuality.value = 'good';
    this.speedCalculator.reset();
    this.timeEstimator.reset();
  }

  /** 获取平均速度 */
  getAverageSpeed(): number {
    return this.speedCalculator.getAverageSpeed();
  }

  /** 获取时间变化趋势 */
  getTimeTrend(): 'increasing' | 'stable' | 'decreasing' {
    return this.timeEstimator.getTrend();
  }
}

