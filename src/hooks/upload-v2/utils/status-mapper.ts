/**
 * 状态映射工具
 */
import type { UploadFileInfo } from 'naive-ui';
import { UploadStatus } from '../types';
import { i18n, type StatusTextMap } from './i18n';

/** Naive UI 状态映射 */
const NAIVE_STATUS_MAP: Record<UploadStatus, UploadFileInfo['status']> = {
  [UploadStatus.PENDING]: 'pending',
  [UploadStatus.UPLOADING]: 'uploading',
  [UploadStatus.SUCCESS]: 'finished',
  [UploadStatus.ERROR]: 'error',
  [UploadStatus.PAUSED]: 'pending',
  [UploadStatus.CANCELLED]: 'removed'
} as const;

/** 状态文本键映射 */
const STATUS_TEXT_KEY_MAP: Record<UploadStatus, keyof StatusTextMap> = {
  [UploadStatus.PENDING]: 'pending',
  [UploadStatus.UPLOADING]: 'uploading',
  [UploadStatus.SUCCESS]: 'success',
  [UploadStatus.ERROR]: 'error',
  [UploadStatus.PAUSED]: 'paused',
  [UploadStatus.CANCELLED]: 'cancelled'
} as const;

/** 状态类型映射 */
const STATUS_TYPE_MAP: Record<UploadStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  [UploadStatus.PENDING]: 'default',
  [UploadStatus.UPLOADING]: 'info',
  [UploadStatus.SUCCESS]: 'success',
  [UploadStatus.ERROR]: 'error',
  [UploadStatus.PAUSED]: 'warning',
  [UploadStatus.CANCELLED]: 'default'
} as const;

/**
 * 转换为 Naive UI 状态
 */
export function convertToNaiveStatus(status: UploadStatus): UploadFileInfo['status'] {
  return NAIVE_STATUS_MAP[status];
}

/**
 * 获取状态文本（支持国际化）
 */
export function getStatusText(status: UploadStatus): string {
  return i18n.getStatusText(STATUS_TEXT_KEY_MAP[status]);
}

/**
 * 获取状态类型
 */
export function getStatusType(status: UploadStatus): 'default' | 'success' | 'warning' | 'error' | 'info' {
  return STATUS_TYPE_MAP[status];
}

