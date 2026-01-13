/**
 * 进度追踪器
 */

import type { ProgressEvent, ProgressInfo, ProgressCallback } from './types';
import { calculateProgress, formatSpeed } from './utils';

/**
 * 进度追踪器
 */
export class ProgressTracker {
  private startTime: number;
  private lastLoaded: number;
  private lastTime: number;
  private onProgress?: ProgressCallback;

  constructor(onProgress?: ProgressCallback) {
    this.startTime = Date.now();
    this.lastLoaded = 0;
    this.lastTime = this.startTime;
    this.onProgress = onProgress;
  }

  /**
   * 更新进度
   */
  update(progressEvent: ProgressEvent): void {
    const now = Date.now();
    const elapsed = now - this.startTime;
    const { loaded, total } = progressEvent;

    // 计算进度百分比
    const percent = calculateProgress(progressEvent);

    // 计算速度（基于最近一次的变化）
    const timeDelta = now - this.lastTime;
    const loadedDelta = loaded - this.lastLoaded;
    const speed = timeDelta > 0 ? formatSpeed(loadedDelta, timeDelta) : '0 B/s';

    // 更新记录
    this.lastLoaded = loaded;
    this.lastTime = now;

    // 调用回调
    if (this.onProgress) {
      const progressInfo: ProgressInfo = {
        percent,
        loaded,
        total: total || 0,
        speed,
        elapsed,
      };
      this.onProgress(progressInfo);
    }
  }

  /**
   * 重置追踪器
   */
  reset(): void {
    this.startTime = Date.now();
    this.lastLoaded = 0;
    this.lastTime = this.startTime;
  }
}

/**
 * 创建进度追踪器（工厂函数）
 */
export function createProgressTracker(onProgress?: ProgressCallback): (progressEvent: ProgressEvent) => void {
  const tracker = new ProgressTracker(onProgress);
  return (progressEvent: ProgressEvent) => {
    tracker.update(progressEvent);
  };
}

