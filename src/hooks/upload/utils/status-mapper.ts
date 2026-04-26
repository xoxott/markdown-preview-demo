/** 状态映射工具（框架无关版本） */
import { UploadStatus } from '../types';
import { type StatusTextMap, i18n } from './i18n';

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
const STATUS_TYPE_MAP: Record<UploadStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> =
  {
    [UploadStatus.PENDING]: 'default',
    [UploadStatus.UPLOADING]: 'info',
    [UploadStatus.SUCCESS]: 'success',
    [UploadStatus.ERROR]: 'error',
    [UploadStatus.PAUSED]: 'warning',
    [UploadStatus.CANCELLED]: 'default'
  } as const;

/** 获取状态文本（支持国际化） */
export function getStatusText(status: UploadStatus): string {
  return i18n.getStatusText(STATUS_TEXT_KEY_MAP[status]);
}

/** 获取状态类型 */
export function getStatusType(
  status: UploadStatus
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  return STATUS_TYPE_MAP[status];
}

/** 通用状态转字符串（框架无关） */
export function statusToString(status: UploadStatus): string {
  return STATUS_TEXT_KEY_MAP[status];
}

/** 导出映射表供适配层使用 */
export { STATUS_TEXT_KEY_MAP, STATUS_TYPE_MAP };
