/** 版本日志表单数据 */
export interface VersionLogFormData {
  version: string;
  type: string;
  releaseDate: string;
  content: string;
  features: string;
  fixes: string;
  improvements: string;
  isPublished: boolean;
  publishedAt: string;
}

/** 版本日志表单对话框配置 */
export interface VersionLogFormDialogConfig {
  /** 是否为编辑模式 */
  isEdit: boolean;
  /** 表单数据 */
  formData: VersionLogFormData;
  /** 确认回调 */
  onConfirm: (data: VersionLogFormData) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

