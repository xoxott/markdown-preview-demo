/**
 * 增强版速度计算器
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
    // 数据验证
    if (!Number.isFinite(size) || size < 0 || 
        !Number.isFinite(time) || time <= 0) {
      console.warn('Invalid data point:', { size, time });
      return;
    }

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
    this.dataPoints = this.dataPoints.filter(point => point.timestamp > cutoff);
    
    // 保留最新的 windowSize 个数据点
    if (this.dataPoints.length > this.windowSize) {
      this.dataPoints = this.dataPoints.slice(-this.windowSize);
    }
  }

  /**
   * 获取当前上传速度（bytes/s）- 修复：返回 bytes/s 而不是 KB/s
   * 
   * @returns 上传速度，单位 bytes/s
   */
  getSpeed(): number {
    if (this.dataPoints.length === 0) return 0;

    // 使用最近的数据点进行计算
    const recentPoints = this.dataPoints.slice(-Math.min(5, this.dataPoints.length));
    
    if (recentPoints.length === 0) return 0;
    
    const totalSize = recentPoints.reduce((sum, point) => sum + point.size, 0);
    const totalTime = recentPoints.reduce((sum, point) => sum + point.time, 0);

    // 防止除零错误
    if (totalTime <= 0 || !Number.isFinite(totalTime)) {
      return this.lastSpeed;
    }

    // 计算瞬时速度 (bytes/s)
    const instantSpeed = (totalSize / totalTime) * 1000;

    // 验证计算结果
    if (!Number.isFinite(instantSpeed) || instantSpeed < 0) {
      console.warn('Invalid instant speed calculated:', instantSpeed);
      return this.lastSpeed;
    }

    // 应用指数平滑
    if (this.lastSpeed === 0) {
      this.lastSpeed = instantSpeed;
    } else {
      this.lastSpeed = this.smoothingFactor * instantSpeed + 
                      (1 - this.smoothingFactor) * this.lastSpeed;
    }

    // 确保返回有效值
    return Math.max(0, Number.isFinite(this.lastSpeed) ? this.lastSpeed : 0);
  }

  /**
   * 获取平均上传速度（bytes/s）- 修复：返回 bytes/s 而不是 KB/s
   * 
   * @returns 平均上传速度，单位 bytes/s
   */
  getAverageSpeed(): number {
    if (this.dataPoints.length === 0) return 0;

    const totalSize = this.dataPoints.reduce((sum, point) => sum + point.size, 0);
    const totalTime = this.dataPoints.reduce((sum, point) => sum + point.time, 0);

    // 防止除零和无效值
    if (totalTime <= 0 || !Number.isFinite(totalSize) || !Number.isFinite(totalTime)) {
      return 0;
    }

    const avgSpeed = (totalSize / totalTime) * 1000;
    
    // 验证结果
    return Number.isFinite(avgSpeed) ? Math.max(0, avgSpeed) : 0;
  }

  /**
   * 获取格式化的速度信息
   * 
   * @returns 包含当前速度和平均速度的对象
   */
  getSpeedInfo(): {
    current: number;      // 当前速度 (bytes/s)
    average: number;      // 平均速度 (bytes/s)
    formatted: {
      current: string;    // 格式化的当前速度
      average: string;    // 格式化的平均速度
    };
  } {
    const current = this.getSpeed();
    const average = this.getAverageSpeed();
    
    return {
      current,
      average,
      formatted: {
        current: this.formatSpeedSafe(current),
        average: this.formatSpeedSafe(average)
      }
    };
  }

  /**
   * 安全的速度格式化
   * 
   * @param bytesPerSecond - 每秒字节数
   * @returns 格式化后的速度字符串
   */
  private formatSpeedSafe(bytesPerSecond: number): string {
    if (!Number.isFinite(bytesPerSecond) || bytesPerSecond < 0) {
      return '0 B/s';
    }

    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    const k = 1024;
    
    if (bytesPerSecond === 0) return '0 B/s';
    
    const i = Math.min(
      Math.floor(Math.log(bytesPerSecond) / Math.log(k)),
      units.length - 1
    );
    
    const size = bytesPerSecond / Math.pow(k, Math.max(0, i));
    
    if (!Number.isFinite(size)) {
      return '0 B/s';
    }
    
    return `${size.toFixed(2)} ${units[Math.max(0, i)]}`;
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

  /**
   * 获取数据点统计信息（用于调试）
   */
  getStats(): {
    dataPoints: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
    totalBytes: number;
    totalTime: number;
  } {
    if (this.dataPoints.length === 0) {
      return {
        dataPoints: 0,
        oldestTimestamp: null,
        newestTimestamp: null,
        totalBytes: 0,
        totalTime: 0
      };
    }

    return {
      dataPoints: this.dataPoints.length,
      oldestTimestamp: this.dataPoints[0].timestamp,
      newestTimestamp: this.dataPoints[this.dataPoints.length - 1].timestamp,
      totalBytes: this.dataPoints.reduce((sum, p) => sum + p.size, 0),
      totalTime: this.dataPoints.reduce((sum, p) => sum + p.time, 0)
    };
  }
}
