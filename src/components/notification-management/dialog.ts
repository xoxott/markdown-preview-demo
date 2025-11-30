/** 通知表单数据 */
export interface NotificationFormData {
  title: string;
  content: string;
  type: string;
  priority: number | null;
  isSent: boolean;
  sentAt: string;
  expiresAt: string;
  targetUserIds: number[];
  targetRoleCodes: string[];
}

/** 通知表单对话框配置 */
export interface NotificationFormDialogConfig {
  /** 是否为编辑模式 */
  isEdit: boolean;
  /** 表单数据 */
  formData: NotificationFormData;
  /** 用户选项列表 */
  userOptions?: Array<{ label: string; value: number }>;
  /** 角色选项列表 */
  roleOptions?: Array<{ label: string; value: string }>;
  /** 确认回调 */
  onConfirm: (data: NotificationFormData) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

