/** 时间估算器 用于平滑计算上传剩余时间，避免时间跳跃 */
export class TimeEstimator {
  // 历史记录
  private history: Array<{
    time: number; // 预计时间（秒）
    timestamp: number; // 记录时间戳
  }> = [];

  // 配置参数
  private readonly maxHistory = 10; // 最多保留10条历史
  private readonly smoothingFactor = 0.3; // 平滑因子（0-1）
  private readonly historyTimeout = 60000; // 历史数据过期时间（1分钟）

  // 状态
  private lastEstimatedTime = 0;

  /**
   * 更新预计时间
   *
   * @param remainingSize 剩余大小（字节）
   * @param averageSpeed 平均速度（KB/s）
   * @returns 预计剩余时间（秒）
   */
  update(remainingSize: number, averageSpeed: number): number {
    // 边界情况处理
    if (!Number.isFinite(remainingSize) || remainingSize <= 0) {
      return 0;
    }

    if (!Number.isFinite(averageSpeed) || averageSpeed <= 0) {
      return this.lastEstimatedTime > 0 ? this.lastEstimatedTime : 0;
    }

    // 1. 计算原始时间
    const rawTime = remainingSize / 1024 / averageSpeed;

    // 2. 指数平滑处理
    const smoothedTime = this.exponentialSmoothing(rawTime);

    // 3. 趋势校正
    const trendCorrected = this.applyTrendCorrection(smoothedTime);

    // 4. 边界限制（防止异常跳跃）
    const boundedTime = this.applyBounds(trendCorrected);

    // 5. 记录历史
    this.recordHistory(boundedTime);

    // 6. 更新状态
    this.lastEstimatedTime = boundedTime;

    return Math.max(0, Math.round(boundedTime));
  }

  /** 指数平滑算法 公式: 新值 = α * 原始值 + (1-α) * 旧值 */
  private exponentialSmoothing(rawTime: number): number {
    if (this.lastEstimatedTime === 0) {
      // 首次计算，直接使用原始值
      return rawTime;
    }

    // 指数平滑
    return this.smoothingFactor * rawTime + (1 - this.smoothingFactor) * this.lastEstimatedTime;
  }

  /** 趋势校正 - 根据历史趋势调整时间 */
  private applyTrendCorrection(time: number): number {
    if (this.history.length < 3) {
      return time;
    }

    // 获取最近3次记录
    const recent = this.history.slice(-3);

    // 计算平均变化率（每次变化多少秒）
    const timeChanges: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      timeChanges.push(recent[i - 1].time - recent[i].time);
    }
    const avgChange = timeChanges.reduce((a, b) => a + b, 0) / timeChanges.length;

    // 如果趋势是稳定下降（正常情况），适当加速下降
    if (avgChange > 0 && avgChange < 10) {
      // 轻微加速下降，让倒计时感更强
      return time - Math.abs(avgChange) * 0.1;
    }

    return time;
  }

  /** 边界限制 - 防止异常跳跃 */
  private applyBounds(time: number): number {
    if (this.lastEstimatedTime === 0) {
      return time;
    }

    // 限制单次增加幅度（时间增加说明速度变慢）
    const maxIncrease = this.lastEstimatedTime * 1.3; // 最多增加30%
    if (time > maxIncrease) {
      console.log(`⚠️ 时间跳跃过大，限制增加: ${time.toFixed(1)}s -> ${maxIncrease.toFixed(1)}s`);
      return maxIncrease;
    }

    // 限制单次减少幅度（时间减少是正常的）
    // 只在剩余时间较长时限制，避免接近完成时的卡顿
    if (time > 10) {
      const maxDecrease = this.lastEstimatedTime * 0.7; // 最多减少30%
      if (time < maxDecrease) {
        console.log(`⚠️ 时间下降过快，限制减少: ${time.toFixed(1)}s -> ${maxDecrease.toFixed(1)}s`);
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

    // 限制历史数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // 清理过期数据
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

    if (change > 5) return 'decreasing'; // 时间在减少（正常，速度稳定或加快）
    if (change < -5) return 'increasing'; // 时间在增加（速度变慢）
    return 'stable';
  }

  /** 重置估算器 */
  reset(): void {
    this.history = [];
    this.lastEstimatedTime = 0;
  }

  /** 获取最后一次估算的时间 */
  getLastEstimatedTime(): number {
    return this.lastEstimatedTime;
  }

  /** 获取历史数据（用于调试） */
  getHistory(): Array<{ time: number; timestamp: number }> {
    return [...this.history];
  }
}
