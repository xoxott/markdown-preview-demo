/**
 * 速度计算器
 * 
 * 用于在文件上传过程中计算上传速度。
 * 支持：
 *  - 实时速度（瞬时速度 + 指数平滑）
 *  - 平均速度
 *  - 可配置的时间窗口和数据点数量
 */
export default class EnhancedSpeedCalculator {
  private dataPoints: Array<{ size: number; time: number; timestamp: number }> = [];
  private readonly windowSize: number;
  private readonly windowTime: number;
  private smoothingFactor = 0.7; // 平滑因子
  private lastSpeed = 0;

  /**
   * 构造函数
   * 
   * @param windowSize - 数据点最大数量，默认 15
   * @param windowTime - 数据点最大保留时间（毫秒），默认 30000ms（30秒）
   */
  constructor(windowSize = 15, windowTime = 30000) {
    this.windowSize = windowSize;
    this.windowTime = windowTime;
  }

  /**
   * 添加新的上传数据点
   * 
   * @param size - 本次上传的数据大小（字节）
   * @param time - 上传耗时（毫秒）
   */
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

  /**
   * 清理过期或超出窗口数量的数据点
   * 
   * @param now - 当前时间戳（毫秒）
   */
  private cleanup(now: number): void {
    const cutoff = now - this.windowTime;
    this.dataPoints = this.dataPoints.filter(point => point.timestamp > cutoff).slice(-this.windowSize);
  }

  /**
   * 获取当前上传速度（指数平滑后的瞬时速度）
   * 
   * @returns 上传速度，单位 KB/s
   */
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

  /**
   * 获取平均上传速度
   * 
   * @returns 平均上传速度，单位 KB/s
   */
  getAverageSpeed(): number {
    if (this.dataPoints.length === 0) return 0;

    const totalSize = this.dataPoints.reduce((sum, point) => sum + point.size, 0);
    const totalTime = this.dataPoints.reduce((sum, point) => sum + point.time, 0);

    return totalTime > 0 ? ((totalSize / totalTime) * 1000) / 1024 : 0;
  }

  /**
   * 重置速度计算器
   * 
   * 清空历史数据点和最后计算的速度
   */
  reset(): void {
    this.dataPoints = [];
    this.lastSpeed = 0;
  }
}
