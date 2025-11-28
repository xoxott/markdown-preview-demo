/**
 * 速度计算器
 * 用于计算上传速度
 */
export class SpeedCalculator {
  private dataPoints: Array<{ size: number; time: number; timestamp: number }> = [];
  private readonly windowSize: number;
  private readonly windowTime: number;
  private smoothingFactor = 0.7;
  private lastSpeed = 0;

  constructor(windowSize = 15, windowTime = 30000) {
    this.windowSize = windowSize;
    this.windowTime = windowTime;
  }

  /**
   * 添加新的上传数据点
   */
  addData(size: number, time: number): void {
    if (!Number.isFinite(size) || size < 0 || !Number.isFinite(time) || time <= 0) {
      return;
    }

    const now = Date.now();
    this.dataPoints.push({
      size,
      time,
      timestamp: now
    });

    this.cleanup(now);
  }

  /**
   * 清理过期或超出窗口数量的数据点
   */
  private cleanup(now: number): void {
    const cutoff = now - this.windowTime;
    this.dataPoints = this.dataPoints.filter(point => point.timestamp > cutoff);

    if (this.dataPoints.length > this.windowSize) {
      this.dataPoints = this.dataPoints.slice(-this.windowSize);
    }
  }

  /**
   * 获取当前上传速度（bytes/s）
   */
  getSpeed(): number {
    if (this.dataPoints.length === 0) return 0;

    const recentPoints = this.dataPoints.slice(-Math.min(5, this.dataPoints.length));
    if (recentPoints.length === 0) return 0;

    const totalSize = recentPoints.reduce((sum, point) => sum + point.size, 0);
    const totalTime = recentPoints.reduce((sum, point) => sum + point.time, 0);

    if (totalTime <= 0 || !Number.isFinite(totalTime)) {
      return this.lastSpeed;
    }

    const instantSpeed = (totalSize / totalTime) * 1000;

    if (!Number.isFinite(instantSpeed) || instantSpeed < 0) {
      return this.lastSpeed;
    }

    if (this.lastSpeed === 0) {
      this.lastSpeed = instantSpeed;
    } else {
      this.lastSpeed = this.smoothingFactor * instantSpeed + (1 - this.smoothingFactor) * this.lastSpeed;
    }

    return Math.max(0, Number.isFinite(this.lastSpeed) ? this.lastSpeed : 0);
  }

  /**
   * 获取平均上传速度（bytes/s）
   */
  getAverageSpeed(): number {
    if (this.dataPoints.length === 0) return 0;

    const totalSize = this.dataPoints.reduce((sum, point) => sum + point.size, 0);
    const totalTime = this.dataPoints.reduce((sum, point) => sum + point.time, 0);

    if (totalTime <= 0 || !Number.isFinite(totalSize) || !Number.isFinite(totalTime)) {
      return 0;
    }

    const avgSpeed = (totalSize / totalTime) * 1000;
    return Number.isFinite(avgSpeed) ? Math.max(0, avgSpeed) : 0;
  }

  /**
   * 重置速度计算器
   */
  reset(): void {
    this.dataPoints = [];
    this.lastSpeed = 0;
  }
}

