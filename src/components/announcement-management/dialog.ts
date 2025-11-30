/** 公告表单数据 */
export interface AnnouncementFormData {
  title: string;
  content: string;
  type: string;
  priority: number | null;
  isPublished: boolean;
  publishedAt: string;
  expiresAt: string;
}

/** 公告表单对话框配置 */
export interface AnnouncementFormDialogConfig {
  /** 是否为编辑模式 */
  isEdit: boolean;
  /** 表单数据 */
  formData: AnnouncementFormData;
  /** 确认回调 */
  onConfirm: (data: AnnouncementFormData) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

