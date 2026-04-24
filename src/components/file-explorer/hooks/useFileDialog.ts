import type { App } from 'vue';
import type { DialogInstance, RenameDialogConfig } from '@/components/base-dialog/dialog';
import { createDialogInstance } from '@/components/base-dialog/useDialog';
import RenameDialog from '../dialogs/RenameDialog';
export function useFileDialog(app?: App) {
  /** 显示重命名对话框 */
  const rename = (config: RenameDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(RenameDialog, config, app);
  };
  return {
    rename
  };
}

/** 导出类型 */
export type UseFileDialogReturn = ReturnType<typeof useFileDialog>;
