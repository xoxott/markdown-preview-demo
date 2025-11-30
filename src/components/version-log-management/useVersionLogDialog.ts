import { createDialogInstance } from '@/components/base-dialog/useDialog';
import type { App } from 'vue';
import type { DialogInstance } from '@/components/base-dialog/dialog';
import type { VersionLogFormDialogConfig } from './dialog';
import VersionLogFormDialog from './VersionLogFormDialog';

export function useVersionLogDialog(app?: App) {
  /** 显示版本日志表单对话框 */
  const showVersionLogForm = (config: VersionLogFormDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(VersionLogFormDialog, config, app);
  };

  return {
    showVersionLogForm
  };
}

/** 导出类型 */
export type UseVersionLogDialogReturn = ReturnType<typeof useVersionLogDialog>;

