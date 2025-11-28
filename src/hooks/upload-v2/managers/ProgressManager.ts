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
    if (task.totalChunks > 0) {
      const uploadProgress = (task.uploadedChunks / task.totalChunks) * 100;
      task.progress = Math.round(uploadProgress);
      task.speed = this.uploadSpeed.value;

      if (task.chunks) {
        task.uploadedSize = task.chunks
          .filter((c: ChunkInfo) => c.status === ChunkStatus.SUCCESS)
          .reduce((sum: number, c: ChunkInfo) => sum + c.size, 0);
      }
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

    const totalSize = tasks.reduce((sum, task) => sum + task.file.size, 0);
    const uploadedSize = tasks.reduce((sum, task) => sum + (task.file.size * task.progress) / 100, 0);

    this.pendingTotalProgress = Math.min(100, Math.round((uploadedSize / totalSize) * 100) || 0);

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

    const totalSize = allTasks.reduce((sum, task) => sum + task.file.size, 0);
    const uploadedSize = allTasks.reduce((sum, task) => sum + (task.file.size * task.progress) / 100, 0);

    const remainingSize = totalSize - uploadedSize;
    const averageSpeed = this.speedCalculator.getAverageSpeed();
    const estimatedTime = this.timeEstimator.update(remainingSize, averageSpeed / 1024); // 转换为 KB/s

    return {
      completed,
      active,
      pending,
      failed,
      paused,
      cancelled,
      total,
      totalSize,
      uploadedSize,
      averageSpeed: averageSpeed / 1024, // 转换为 KB/s
      instantSpeed: this.uploadSpeed.value / 1024, // 转换为 KB/s
      estimatedTime,
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

