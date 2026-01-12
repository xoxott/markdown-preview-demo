/**
 * 请求进度工具函数
 */

import type { AxiosProgressEvent } from 'axios';

/**
 * 计算进度百分比
 * @param progressEvent 进度事件
 * @returns 进度百分比 (0-100)
 */
export function calculateProgress(progressEvent: AxiosProgressEvent): number {
  const { loaded, total } = progressEvent;
  if (!total || total === 0) {
    return 0;
  }
  return Math.round((loaded / total) * 100);
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化传输速度
 * @param bytes 已传输字节数
 * @param elapsedTime 已用时间（毫秒）
 * @returns 格式化后的速度字符串
 */
export function formatSpeed(bytes: number, elapsedTime: number): string {
  if (elapsedTime === 0) return '0 B/s';
  const speed = (bytes / elapsedTime) * 1000; // 转换为 B/s
  return `${formatFileSize(speed)}/s`;
}

/**
 * 创建进度追踪器
 * @param onProgress 进度回调函数
 * @returns 进度事件处理函数
 */
export function createProgressTracker(
  onProgress?: (progress: {
    percent: number;
    loaded: number;
    total: number;
    speed: string;
    elapsed: number;
  }) => void,
) {
  const startTime = Date.now();
  let lastLoaded = 0;
  let lastTime = startTime;

  return (progressEvent: AxiosProgressEvent) => {
    const now = Date.now();
    const elapsed = now - startTime;
    const { loaded, total } = progressEvent;

    // 计算进度百分比
    const percent = calculateProgress(progressEvent);

    // 计算速度（基于最近一次的变化）
    const timeDelta = now - lastTime;
    const loadedDelta = loaded - lastLoaded;
    const speed = timeDelta > 0 ? formatSpeed(loadedDelta, timeDelta) : '0 B/s';

    // 更新记录
    lastLoaded = loaded;
    lastTime = now;

    // 调用回调
    if (onProgress) {
      onProgress({
        percent,
        loaded,
        total: total || 0,
        speed,
        elapsed,
      });
    }
  };
}
