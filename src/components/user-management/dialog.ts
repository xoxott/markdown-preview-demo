/** 用户表单数据 */
export interface UserFormData {
  username: string;
  email: string;
  password: string;
  roleIds: number[];
  isActive: boolean;
}

/** 角色选项 */
export interface RoleOption {
  label: string;
  value: number;
}

/** 用户表单对话框配置 */
export interface UserFormDialogConfig {
  /** 是否为编辑模式 */
  isEdit: boolean;
  /** 表单数据 */
  formData: UserFormData;
  /** 角色选项列表 */
  roleOptions: RoleOption[];
  /** 确认回调 */
  onConfirm: (data: UserFormData) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

