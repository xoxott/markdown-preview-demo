import type { BaseDialogProps } from '@/components/base-dialog/dialog';

type Log = Api.LogManagement.Log;

/** 日志详情对话框配置 */
export interface LogDetailDialogConfig extends BaseDialogProps {
  log: Log;
  onClose?: () => void;
}
