/** 角色表单数据 */
export interface RoleFormData {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

/** 角色表单对话框配置 */
export interface RoleFormDialogConfig {
  /** 是否为编辑模式 */
  isEdit: boolean;
  /** 表单数据 */
  formData: RoleFormData;
  /** 确认回调 */
  onConfirm: (data: RoleFormData) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

