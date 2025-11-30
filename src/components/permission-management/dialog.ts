/** 权限表单数据 */
export interface PermissionFormData {
  name: string;
  code: string;
  resource: string;
  action: string;
  description: string;
  isActive: boolean;
}

/** 权限表单对话框配置 */
export interface PermissionFormDialogConfig {
  /** 是否为编辑模式 */
  isEdit: boolean;
  /** 表单数据 */
  formData: PermissionFormData;
  /** 确认回调 */
  onConfirm: (data: PermissionFormData) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}
