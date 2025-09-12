/** 速度计算器 */
export default class EnhancedSpeedCalculator {
  private dataPoints: Array<{ size: number; time: number; timestamp: number }> = [];
  private readonly windowSize: number;
  private readonly windowTime: number;
  private smoothingFactor = 0.7; // 平滑因子
  private lastSpeed = 0;

  constructor(windowSize = 15, windowTime = 30000) {
    this.windowSize = windowSize;
    this.windowTime = windowTime;
  }

  addData(size: number, time: number): void {
    const now = Date.now();
    this.dataPoints.push({
      size,
      time,
      timestamp: now
    });

    // 清理过期和过多的数据点
    this.cleanup(now);
  }

  private cleanup(now: number): void {
    const cutoff = now - this.windowTime;
    this.dataPoints = this.dataPoints.filter(point => point.timestamp > cutoff).slice(-this.windowSize);
  }

  getSpeed(): number {
    if (this.dataPoints.length === 0) return 0;

    // 使用最近的数据点进行计算
    const recentPoints = this.dataPoints.slice(-5);
    const totalSize = recentPoints.reduce((sum, point) => sum + point.size, 0);
    const totalTime = recentPoints.reduce((sum, point) => sum + point.time, 0);

    if (totalTime === 0) return this.lastSpeed;

    // 计算瞬时速度 (KB/s)
    const instantSpeed = ((totalSize / totalTime) * 1000) / 1024;

    // 应用指数平滑
    this.lastSpeed =
      this.lastSpeed === 0
        ? instantSpeed
        : this.smoothingFactor * instantSpeed + (1 - this.smoothingFactor) * this.lastSpeed;

    return Math.max(0, this.lastSpeed);
  }

  getAverageSpeed(): number {
    if (this.dataPoints.length === 0) return 0;

    const totalSize = this.dataPoints.reduce((sum, point) => sum + point.size, 0);
    const totalTime = this.dataPoints.reduce((sum, point) => sum + point.time, 0);

    return totalTime > 0 ? ((totalSize / totalTime) * 1000) / 1024 : 0;
  }

  reset(): void {
    this.dataPoints = [];
    this.lastSpeed = 0;
  }
}
