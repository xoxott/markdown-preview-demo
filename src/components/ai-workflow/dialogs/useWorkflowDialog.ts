import { h } from 'vue';
import { useDialog, useMessage } from 'naive-ui';
import WorkflowFormDialog from './WorkflowFormDialog';
import ExecutionDetailDialog from './ExecutionDetailDialog';
import VersionHistoryDialog from './VersionHistoryDialog';
import type {
  WorkflowDialogOptions,
  ExecutionDetailDialogOptions,
  VersionHistoryDialogOptions
} from './dialog';

export function useWorkflowDialog() {
  const dialog = useDialog();
  const message = useMessage();

  /**
   * 显示工作流表单对话框
   */
  async function showWorkflowForm(options: WorkflowDialogOptions) {
    return new Promise<void>((resolve, reject) => {
      const d = dialog.create({
        title: options.isEdit ? '编辑工作流' : '新建工作流',
        content: () =>
          h(WorkflowFormDialog, {
            formData: options.formData,
            isEdit: options.isEdit,
            onConfirm: async (data: any) => {
              try {
                await options.onConfirm(data);
                d.destroy();
                resolve();
              } catch (error) {
                reject(error);
                throw error;
              }
            },
            onCancel: () => {
              d.destroy();
              reject(new Error('User cancelled'));
            }
          }),
        style: { width: '600px' },
        closable: true,
        maskClosable: false
      });
    });
  }

  /**
   * 显示执行详情对话框
   */
  function showExecutionDetail(options: ExecutionDetailDialogOptions) {
    dialog.create({
      title: '执行详情',
      content: () => h(ExecutionDetailDialog, { executionId: options.executionId }),
      style: { width: '900px' },
      closable: true,
      positiveText: '关闭'
    });
  }

  /**
   * 显示版本历史对话框
   */
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

