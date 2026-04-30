import type { App } from 'vue';
import { h } from 'vue';
import { useDialog, useMessage } from 'naive-ui';
import { createDialogInstance } from '@/components/base-dialog/useDialog';
import ExecutionDetailDialog from './ExecutionDetailDialog';
import VersionHistoryDialog from './VersionHistoryDialog';
import WorkflowFormDialog from './WorkflowFormDialog';
import type {
  ExecutionDetailDialogOptions,
  VersionHistoryDialogOptions,
  WorkflowDialogOptions
} from './dialog';

export function useWorkflowDialog(app?: App) {
  const dialog = useDialog();
  const _message = useMessage();

  /** 显示工作流表单对话框 */
  async function showWorkflowForm(options: WorkflowDialogOptions) {
    const instance = await createDialogInstance(WorkflowFormDialog, options, app);
    return instance;
  }

  /** 显示执行详情对话框 */
  function showExecutionDetail(options: ExecutionDetailDialogOptions) {
    dialog.create({
      title: '执行详情',
      content: () => h(ExecutionDetailDialog, { executionId: options.executionId }),
      style: { width: '900px' },
      closable: true,
      positiveText: '关闭'
    });
  }

  /** 显示版本历史对话框 */
  function showVersionHistory(options: VersionHistoryDialogOptions) {
    dialog.create({
      title: '版本历史',
      content: () =>
        h(VersionHistoryDialog, {
          workflowId: options.workflowId,
          onRestore: options.onRestore
        }),
      style: { width: '800px' },
      closable: true,
      positiveText: '关闭'
    });
  }

  return {
    showWorkflowForm,
    showExecutionDetail,
    showVersionHistory
  };
}
