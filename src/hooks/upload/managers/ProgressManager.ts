import { ref } from 'vue';
import { ChunkInfo, ChunkStatus, FileTask, UploadStats, UploadStatus } from '../type';
import EnhancedSpeedCalculator from '../calculators/EnhancedSpeedCalculator';
import { TimeEstimator } from './TimeEstimator';

/**
 * 进度管理器 - 优化剩余时间计算版本
 */
export class ProgressManager {
  private speedCalculator: EnhancedSpeedCalculator;
  private timeEstimator: TimeEstimator;  // 🔥 新增时间估算器
  
  public readonly totalProgress = ref(0);
  public readonly uploadSpeed = ref(0);
  public readonly networkQuality = ref<'good' | 'fair' | 'poor'>('good');

  constructor() {
    this.speedCalculator = new EnhancedSpeedCalculator();
    this.timeEstimator = new TimeEstimator();  // 🔥 初始化
  }

  /**
   * 更新文件进度
   */
  updateFileProgress(task: FileTask): void {
    if (task.totalChunks > 0) {
      // 计算进度
      const uploadProgress = (task.uploadedChunks / task.totalChunks) * 100;
      task.progress = Math.round(uploadProgress);
      
      // 更新速度
      task.speed = this.uploadSpeed.value;
      
      // 更新已上传大小
      if (task.chunks) {
        task.uploadedSize = task.chunks
          .filter(c => c.status === ChunkStatus.SUCCESS)
          .reduce((sum, c) => sum + c.size, 0);
      }
    }
  }

  /**
   * 更新分片进度
   */
  updateChunkProgress(chunk: ChunkInfo, size: number, uploadTime: number): void {
    this.speedCalculator.addData(size, uploadTime);
    this.uploadSpeed.value = this.speedCalculator.getSpeed();
    this.updateNetworkQuality();
  }

  /**
   * 更新总进度
   */
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

  /**
   * 计算统计信息
   */
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
    
    // 🔥 使用时间估算器计算剩余时间
    const remainingSize = totalSize - uploadedSize;
    const averageSpeed = this.speedCalculator.getAverageSpeed();
    const estimatedTime = this.timeEstimator.update(remainingSize, averageSpeed);

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
      averageSpeed,
      instantSpeed: this.uploadSpeed.value,
      estimatedTime,  // 🔥 平滑的剩余时间
      networkQuality: this.networkQuality.value
    };
  }

  /**
   * 更新网络质量评级
   */
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

  /**
   * 重置进度管理器
   */
  reset(): void {
    this.totalProgress.value = 0;
    this.uploadSpeed.value = 0;
    this.networkQuality.value = 'good';
    this.speedCalculator.reset();
    this.timeEstimator.reset();  // 🔥 重置时间估算器
  }

  /**
   * 获取平均速度
   */
  getAverageSpeed(): number {
    return this.speedCalculator.getAverageSpeed();
  }
  
  /**
   * 获取时间变化趋势
   */
  getTimeTrend(): 'increasing' | 'stable' | 'decreasing' {
    return this.timeEstimator.getTrend();
  }
}