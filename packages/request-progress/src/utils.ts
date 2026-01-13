/**
 * 进度工具函数
 */

import type { ProgressEvent } from './types';

/**
 * 计算进度百分比
 */
export function calculateProgress(progressEvent: ProgressEvent): number {
  const { loaded, total } = progressEvent;
  if (!total || total === 0) {
    return 0;
  }
  return Math.round((loaded / total) * 100);
}

/**
 * 格式化文件大小
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
 */
export function formatSpeed(bytes: number, elapsedTime: number): string {
  if (elapsedTime === 0) return '0 B/s';
  const speed = (bytes / elapsedTime) * 1000; // 转换为 B/s
  return `${formatFileSize(speed)}/s`;
}

