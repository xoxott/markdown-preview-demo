import { createDialogInstance } from '@/components/base-dialog/useDialog';
import type { App } from 'vue';
import type { DialogInstance } from '@/components/base-dialog/dialog';
import type { RoleFormDialogConfig } from './dialog';
import RoleFormDialog from './RoleFormDialog';

export function useRoleDialog(app?: App) {
  /** 显示角色表单对话框 */
  const showRoleForm = (config: RoleFormDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(RoleFormDialog, config, app);
  };

  return {
    showRoleForm
  };
}

/** 导出类型 */
export type UseRoleDialogReturn = ReturnType<typeof useRoleDialog>;

