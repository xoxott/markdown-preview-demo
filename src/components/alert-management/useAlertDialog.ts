import { createDialogInstance } from '@/components/base-dialog/useDialog';
import type { App } from 'vue';
import type { DialogInstance } from '@/components/base-dialog/dialog';
import type { AlertFormDialogConfig } from './dialog';
import AlertFormDialog from './AlertFormDialog';

export function useAlertDialog(app?: App) {
  /** 显示告警表单对话框 */
  const showAlertForm = (config: AlertFormDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(AlertFormDialog, config, app);
  };

  return {
    showAlertForm
  };
}

/** 导出类型 */
export type UseAlertDialogReturn = ReturnType<typeof useAlertDialog>;

