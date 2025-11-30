import { createDialogInstance } from '@/components/base-dialog/useDialog';
import type { App } from 'vue';
import type { DialogInstance } from '@/components/base-dialog/dialog';
import type { AnnouncementFormDialogConfig } from './dialog';
import AnnouncementFormDialog from './AnnouncementFormDialog';

export function useAnnouncementDialog(app?: App) {
  /** 显示公告表单对话框 */
  const showAnnouncementForm = (config: AnnouncementFormDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(AnnouncementFormDialog, config, app);
  };

  return {
    showAnnouncementForm
  };
}

/** 导出类型 */
export type UseAnnouncementDialogReturn = ReturnType<typeof useAnnouncementDialog>;

