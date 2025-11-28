/**
 * 时间估算器
 * 用于平滑计算上传剩余时间，避免时间跳跃
 */
export class TimeEstimator {
  private history: Array<{
    time: number;
    timestamp: number;
  }> = [];

  private readonly maxHistory = 10;
  private readonly smoothingFactor = 0.3;
  private readonly historyTimeout = 60000;

  private lastEstimatedTime = 0;

  /**
   * 更新预计时间
   */
  update(remainingSize: number, averageSpeed: number): number {
    if (!Number.isFinite(remainingSize) || remainingSize <= 0) {
      return 0;
    }

    if (!Number.isFinite(averageSpeed) || averageSpeed <= 0) {
      return this.lastEstimatedTime > 0 ? this.lastEstimatedTime : 0;
    }

    // 计算原始时间
    const rawTime = remainingSize / 1024 / averageSpeed;

    // 指数平滑处理
    const smoothedTime = this.exponentialSmoothing(rawTime);

    // 趋势校正
    const trendCorrected = this.applyTrendCorrection(smoothedTime);

    // 边界限制
    const boundedTime = this.applyBounds(trendCorrected);

    // 记录历史
    this.recordHistory(boundedTime);

    // 更新状态
    this.lastEstimatedTime = boundedTime;

    return Math.max(0, Math.round(boundedTime));
  }

  /** 指数平滑算法 */
  private exponentialSmoothing(rawTime: number): number {
    if (this.lastEstimatedTime === 0) {
      return rawTime;
    }

    return this.smoothingFactor * rawTime + (1 - this.smoothingFactor) * this.lastEstimatedTime;
  }

  /** 趋势校正 */
  private applyTrendCorrection(time: number): number {
    if (this.history.length < 3) {
      return time;
    }

    const recent = this.history.slice(-3);
    const timeChanges: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      timeChanges.push(recent[i - 1].time - recent[i].time);
    }
    const avgChange = timeChanges.reduce((a, b) => a + b, 0) / timeChanges.length;

    if (avgChange > 0 && avgChange < 10) {
      return time - Math.abs(avgChange) * 0.1;
    }

    return time;
  }

  /** 边界限制 */
  private applyBounds(time: number): number {
    if (this.lastEstimatedTime === 0) {
      return time;
    }

    const maxIncrease = this.lastEstimatedTime * 1.3;
    if (time > maxIncrease) {
      return maxIncrease;
    }

    if (time > 10) {
      const maxDecrease = this.lastEstimatedTime * 0.7;
      if (time < maxDecrease) {
        return maxDecrease;
      }
    }

    return time;
  }

  /** 记录历史数据 */
  private recordHistory(time: number): void {
    this.history.push({
      time,
      timestamp: Date.now()
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    const cutoff = Date.now() - this.historyTimeout;
    this.history = this.history.filter(h => h.timestamp > cutoff);
  }

  /** 获取时间变化趋势 */
  getTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.history.length < 2) {
      return 'stable';
    }

    const recent = this.history.slice(-3);
    const first = recent[0].time;
    const last = recent[recent.length - 1].time;
    const change = first - last;

    if (change > 5) return 'decreasing';
    if (change < -5) return 'increasing';
    return 'stable';
  }

  /** 重置估算器 */
  reset(): void {
    this.history = [];
    this.lastEstimatedTime = 0;
  }
}

