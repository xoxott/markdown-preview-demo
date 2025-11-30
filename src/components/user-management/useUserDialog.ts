import { createDialogInstance } from '@/components/base-dialog/useDialog';
import type { App } from 'vue';
import type { DialogInstance } from '@/components/base-dialog/dialog';
import type { UserFormDialogConfig } from './dialog';
import UserFormDialog from './UserFormDialog';

export function useUserDialog(app?: App) {
  /** 显示用户表单对话框 */
  const showUserForm = (config: UserFormDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(UserFormDialog, config, app);
  };

  return {
    showUserForm
  };
}

/** 导出类型 */
export type UseUserDialogReturn = ReturnType<typeof useUserDialog>;

