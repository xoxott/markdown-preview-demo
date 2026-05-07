import type { BaseDialogProps } from '../../base-dialog/dialog';

/** Dialog type definitions for AI Workflow */

/** 工作流表单数据 */
export interface WorkflowFormData {
  name: string;
  description?: string;
  tags?: string[];
  status?: Api.Workflow.WorkflowStatus;
}

/** 工作流对话框选项 */
export interface WorkflowDialogOptions extends BaseDialogProps {
  isEdit: boolean;
  formData: WorkflowFormData;
  onConfirm: (data: WorkflowFormData) => Promise<void>;
  onCancel?: () => void;
}

/** 执行详情对话框选项 */
export interface ExecutionDetailDialogOptions {
  executionId: string;
}

/** 版本历史对话框选项 */
export interface VersionHistoryDialogOptions {
  workflowId: string;
  onRestore?: (version: number) => Promise<void>;
}
