import { createDialogInstance } from '@/components/base-dialog/useDialog';
import type { App } from 'vue';
import type { DialogInstance } from '@/components/base-dialog/dialog';
import type { NotificationFormDialogConfig } from './dialog';
import NotificationFormDialog from './NotificationFormDialog';

export function useNotificationDialog(app?: App) {
  /** 显示通知表单对话框 */
  const showNotificationForm = (config: NotificationFormDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(NotificationFormDialog, config, app);
  };

  return {
    showNotificationForm
  };
}

/** 导出类型 */
export type UseNotificationDialogReturn = ReturnType<typeof useNotificationDialog>;

