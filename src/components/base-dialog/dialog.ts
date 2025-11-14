/** 弹窗系统类型定义 为文件管理器提供通用的弹窗组件类型支持 */

import type { VNode } from 'vue';

/** 弹窗尺寸预设 */
export type DialogSize = 'small' | 'medium' | 'large' | 'full' | 'custom';

/** 弹窗位置 */
export interface DialogPosition {
  x: number;
  y: number;
}

/** 弹窗类型 */
export type DialogType = 'info' | 'success' | 'warning' | 'error';

/** 基础弹窗属性 */
export interface BaseDialogProps {
  /** 是否显示弹窗 */
  show?: boolean;
  /** 弹窗标题 */
  title?: string;
  /** 弹窗宽度 */
  width?: number | string;
  /** 弹窗高度 */
  height?: number | string;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 最大高度 */
  maxHeight?: number;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** 是否显示遮罩 */
  showMask?: boolean;
  /** 是否显示关闭按钮 */
  showClose?: boolean;
  /** 是否显示全屏按钮 */
  showFullscreen?: boolean;
  /** ESC键是否关闭 */
  closeOnEsc?: boolean;
  /** 是否自动聚焦 */
  autoFocus?: boolean;
  /** 是否锁定焦点 */
  trapFocus?: boolean;
  /** 弹窗位置 */
  position?: 'center' | DialogPosition;
  /** 弹窗变换原点 */
  transformOrigin?: 'center' | 'mouse' | undefined;
  /** 层级 */
  zIndex?: number;
  /** 自定义类名 */
  class?: string;
  /** 内容区域类名 */
  contentClass?: string;
  /** 关闭回调 */
  onClose?: () => void;
  /** 遮罩点击回调 */
  onMaskClick?: () => void;
  /** 打开后回调 */
  onAfterEnter?: () => void;
  /** 关闭后回调 */
  onAfterLeave?: () => void;
}

/** 重命名对话框配置 */
export interface RenameDialogConfig {
  /** 标题 */
  title?: string;
  /** 默认值 */
  defaultValue: string;
  /** 占位符 */
  placeholder?: string;
  /** 验证规则 */
  validator?: (value: string) => string | true;
  /** 确认回调 */
  onConfirm: (newName: string) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

/** 确认对话框配置 */
export interface ConfirmDialogConfig  extends BaseDialogProps{
  /** 标题 */
  title?: string;
  /** 内容 */
  content: string | VNode;
  /** 类型 */
  type?: DialogType;
  /** 确认按钮文字 */
  confirmText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 确认回调 */
  onConfirm: () => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

/** 文本编辑器对话框配置 */
export interface TextEditorDialogConfig {
  /** 标题 */
  title?: string;
  /** 初始内容 */
  content: string;
  /** 语言类型 */
  language?: string;
  /** 是否只读 */
  readonly?: boolean;
  /** 保存回调 */
  onSave: (content: string) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

/** Markdown编辑器对话框配置 */
export interface MarkdownEditorDialogConfig {
  /** 标题 */
  title?: string;
  /** 初始内容 */
  content: string;
  /** 是否显示预览 */
  showPreview?: boolean;
  /** 保存回调 */
  onSave: (content: string) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

/** 文件属性对话框配置 */
export interface PropertiesDialogConfig {
  /** 文件信息 */
  file: {
    name: string;
    type: string;
    size: number;
    path: string;
    created?: Date;
    modified?: Date;
    accessed?: Date;
    permissions?: string;
    [key: string]: any;
  };
  /** 关闭回调 */
  onClose?: () => void;
}

/** 新建文件夹对话框配置 */
export interface CreateFolderDialogConfig {
  /** 标题 */
  title?: string;
  /** 默认名称 */
  defaultName?: string;
  /** 当前路径 */
  currentPath: string;
  /** 确认回调 */
  onConfirm: (folderName: string) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

/** 弹窗实例接口 */
export interface DialogInstance {
  /** 显示弹窗 */
  show: () => void;
  /** 隐藏弹窗 */
  hide: () => void;
  /** 销毁弹窗 */
  destroy: () => void;
}

/** 弹窗管理器接口 */
export interface DialogManager {
  /** 显示重命名对话框 */
  rename: (config: RenameDialogConfig) => DialogInstance;
  /** 显示确认对话框 */
  confirm: (config: ConfirmDialogConfig) => DialogInstance;
  /** 显示文本编辑器 */
  textEditor: (config: TextEditorDialogConfig) => DialogInstance;
  /** 显示Markdown编辑器 */
  markdownEditor: (config: MarkdownEditorDialogConfig) => DialogInstance;
  /** 显示文件属性 */
  properties: (config: PropertiesDialogConfig) => DialogInstance;
  /** 显示新建文件夹对话框 */
  createFolder: (config: CreateFolderDialogConfig) => DialogInstance;
}

/** 拖拽状态 */
export interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 起始X坐标 */
  startX: number;
  /** 起始Y坐标 */
  startY: number;
  /** 起始弹窗X坐标 */
  startDialogX: number;
  /** 起始弹窗Y坐标 */
  startDialogY: number;
}

/** 调整大小状态 */
export interface ResizeState {
  /** 是否正在调整大小 */
  isResizing: boolean;
  /** 调整方向 */
  direction: ResizeDirection | null;
  /** 起始X坐标 */
  startX: number;
  /** 起始Y坐标 */
  startY: number;
  /** 起始宽度 */
  startWidth: number;
  /** 起始高度 */
  startHeight: number;
  /** 起始弹窗X坐标 */
  startDialogX: number;
  /** 起始弹窗Y坐标 */
  startDialogY: number;
}

/** 调整大小方向 */
export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** 弹窗尺寸预设值 */
export const DIALOG_SIZE_PRESETS: Record<DialogSize, { width: number; height: number }> = {
  small: { width: 400, height: 300 },
  medium: { width: 600, height: 400 },
  large: { width: 800, height: 600 },
  full: { width: 0, height: 0 }, // 全屏由CSS处理
  custom: { width: 0, height: 0 } // 自定义尺寸
};

/** 默认弹窗配置 */
export const DEFAULT_DIALOG_CONFIG: Partial<BaseDialogProps> = {
  draggable: false,
  resizable: false,
  maskClosable: true,
  showClose: true,
  showFullscreen: false,
  closeOnEsc: true,
  showMask: true,
  autoFocus: true,
  trapFocus: true,
  zIndex: undefined,
  position: 'center',
  transformOrigin: undefined,
  minWidth: 300,
  minHeight: 200
};
