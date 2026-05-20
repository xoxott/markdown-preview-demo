import type { App } from 'vue';
import { createDialogInstance } from '@/components/base-dialog/useDialog';
import type { DialogInstance } from '@/components/base-dialog/dialog';
import type { LogDetailDialogConfig } from './dialog';
import LogDetailDialog from './LogDetailDialog';

export function useLogDialog(app?: App) {
  const showLogDetail = (config: LogDetailDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(LogDetailDialog, config, app);
  };

  return {
    showLogDetail
  };
}

export type UseLogDialogReturn = ReturnType<typeof useLogDialog>;
