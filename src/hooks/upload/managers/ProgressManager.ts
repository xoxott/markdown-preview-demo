import { ref, computed } from 'vue';
import { ChunkInfo, FileTask, UploadStats, UploadStatus } from '../type';
import EnhancedSpeedCalculator from '../calculators/EnhancedSpeedCalculator';

export class ProgressManager {
  private speedCalculator: EnhancedSpeedCalculator;
  
  public readonly totalProgress = ref(0);
  public readonly uploadSpeed = ref(0);
  public readonly networkQuality = ref<'good' | 'fair' | 'poor'>('good');

  constructor() {
    this.speedCalculator = new EnhancedSpeedCalculator();
  }

  updateFileProgress(task: FileTask): void {
    if (task.totalChunks > 0) {
      task.progress = Math.round((task.uploadedChunks / task.totalChunks) * 100);
    }
  }

  updateChunkProgress(chunk: ChunkInfo, size: number, uploadTime: number): void {
    this.speedCalculator.addData(size, uploadTime);
    this.uploadSpeed.value = this.speedCalculator.getSpeed();
    this.updateNetworkQuality();
  }

  updateTotalProgress(tasks: FileTask[]): void {
    if (tasks.length === 0) {
      this.totalProgress.value = 0;
      return;
    }

    const totalSize = tasks.reduce((sum, task) => sum + task.file.size, 0);
    const uploadedSize = tasks.reduce(
      (sum, task) => sum + (task.file.size * task.progress) / 100,
      0
    );

    this.totalProgress.value = Math.min(100, Math.round((uploadedSize / totalSize) * 100) || 0);
  }

  calculateStats(
    uploadQueue: FileTask[],
    activeUploads: Map<string, FileTask>,
    completedUploads: FileTask[]
  ): UploadStats {
    const active = activeUploads.size;
    const pending = uploadQueue.length;
    const completed = completedUploads.filter(t => t.status === UploadStatus.SUCCESS).length;
    const failed = completedUploads.filter(t => t.status === UploadStatus.ERROR).length;
    const paused = completedUploads.filter(t => t.status === UploadStatus.PAUSED).length;
    const cancelled = completedUploads.filter(t => t.status === UploadStatus.CANCELLED).length;
    const total = active + pending + completed + failed + paused + cancelled;

    const allTasks = [...uploadQueue, ...Array.from(activeUploads.values()), ...completedUploads];
    const totalSize = allTasks.reduce((sum, task) => sum + task.file.size, 0);
    const uploadedSize = allTasks.reduce(
      (sum, task) => sum + (task.file.size * task.progress) / 100,
      0
    );

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
      averageSpeed: this.speedCalculator.getAverageSpeed(),
      instantSpeed: this.uploadSpeed.value,
      estimatedTime: this.uploadSpeed.value > 0 ? (totalSize - uploadedSize) / (this.uploadSpeed.value * 1024) : 0,
      networkQuality: this.networkQuality.value
    };
  }

  private updateNetworkQuality(): void {
    const speed = this.uploadSpeed.value;
    if (speed < 50) {
      this.networkQuality.value = 'poor';
    } else if (speed < 200) {
      this.networkQuality.value = 'fair';
    } else {
      this.networkQuality.value = 'good';
    }
  }

  reset(): void {
    this.totalProgress.value = 0;
    this.uploadSpeed.value = 0;
    this.networkQuality.value = 'good';
    this.speedCalculator.reset();
  }

  getAverageSpeed(): number {
    return this.speedCalculator.getAverageSpeed();
  }
}
