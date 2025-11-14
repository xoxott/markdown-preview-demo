import { DialogInstance, RenameDialogConfig } from '@/components/base-dialog/dialog';
import type { App } from 'vue';
import RenameDialog from '../dialogs/RenameDialog';
import { createDialogInstance } from '@/components/base-dialog/useDialog';
export function useFileDialog(app?: App){
  /** 显示重命名对话框 */
  const rename = (config: RenameDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(RenameDialog, config, app);
  };
  return {
    rename
  }
}


/** 导出类型 */
export type UseFileDialogReturn = ReturnType<typeof useFileDialog>;
