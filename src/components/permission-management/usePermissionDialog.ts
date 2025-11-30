import { createDialogInstance } from '@/components/base-dialog/useDialog';
import type { App } from 'vue';
import type { DialogInstance } from '@/components/base-dialog/dialog';
import type { PermissionFormDialogConfig } from './dialog';
import PermissionFormDialog from './PermissionFormDialog';

export function usePermissionDialog(app?: App) {
  /** 显示权限表单对话框 */
  const showPermissionForm = (config: PermissionFormDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(PermissionFormDialog, config, app);
  };

  return {
    showPermissionForm
  };
}

/** 导出类型 */
export type UsePermissionDialogReturn = ReturnType<typeof usePermissionDialog>;

