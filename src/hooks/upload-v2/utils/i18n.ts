/**
 * 国际化支持
 */

/** 语言类型 */
export type Language = 'zh-CN' | 'en-US';

/** 状态文本映射 */
export interface StatusTextMap {
  pending: string;
  uploading: string;
  success: string;
  error: string;
  paused: string;
  cancelled: string;
}

/** 错误消息映射 */
export interface ErrorMessageMap {
  networkError: string;
  timeoutError: string;
  serverError: string;
  abortError: string;
  validationError: string;
  unknownError: string;
}

/** 国际化文本 */
export interface I18nTexts {
  status: StatusTextMap;
  errors: ErrorMessageMap;
}

/** 默认文本（中文） */
const zhCNTexts: I18nTexts = {
  status: {
    pending: '等待中',
    uploading: '上传中',
    success: '成功',
    error: '失败',
    paused: '已暂停',
    cancelled: '已取消'
  },
  errors: {
    networkError: '网络连接失败，请检查网络设置',
    timeoutError: '请求超时，请稍后重试',
    serverError: '服务器错误，请稍后重试',
    abortError: '上传已取消',
    validationError: '文件验证失败',
    unknownError: '上传失败，请稍后重试'
  }
};

/** 默认文本（英文） */
const enUSTexts: I18nTexts = {
  status: {
    pending: 'Pending',
    uploading: 'Uploading',
    success: 'Success',
    error: 'Error',
    paused: 'Paused',
    cancelled: 'Cancelled'
  },
  errors: {
    networkError: 'Network connection failed, please check your network settings',
    timeoutError: 'Request timeout, please try again later',
    serverError: 'Server error, please try again later',
    abortError: 'Upload cancelled',
    validationError: 'File validation failed',
    unknownError: 'Upload failed, please try again later'
  }
};

/** 国际化管理器 */
class I18nManager {
  private currentLanguage: Language = 'zh-CN';
  private customTexts: Partial<I18nTexts> = {};
  private texts: I18nTexts = zhCNTexts;

  /**
   * 设置语言
   */
  setLanguage(language: Language): void {
    this.currentLanguage = language;
    this.updateTexts();
  }

  /**
   * 设置自定义文本
   */
  setCustomTexts(texts: Partial<I18nTexts>): void {
    this.customTexts = texts;
    this.updateTexts();
  }

  /**
   * 更新文本
   */
  private updateTexts(): void {
    const baseTexts = this.currentLanguage === 'zh-CN' ? zhCNTexts : enUSTexts;
    this.texts = {
      status: { ...baseTexts.status, ...this.customTexts.status },
      errors: { ...baseTexts.errors, ...this.customTexts.errors }
    };
  }

  /**
   * 获取状态文本
   */
  getStatusText(key: keyof StatusTextMap): string {
    return this.texts.status[key] || key;
  }

  /**
   * 获取错误消息
   */
  getErrorMessage(key: keyof ErrorMessageMap): string {
    return this.texts.errors[key] || this.texts.errors.unknownError;
  }

  /**
   * 获取当前语言
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * 获取所有文本
   */
  getTexts(): I18nTexts {
    return { ...this.texts };
  }
}

// 导出单例
export const i18n = new I18nManager();

// 导出默认文本（用于直接使用）
export { zhCNTexts, enUSTexts };

