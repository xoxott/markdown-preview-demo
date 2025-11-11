import type { Component, Ref, VNode } from 'vue';
import type { ButtonProps } from 'naive-ui';

// 按钮配置
export interface DrawerButtonConfig {
  text: string;
  type?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';
  loading?: boolean;
  disabled?: boolean;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  closeOnClick?: boolean; // 点击后是否关闭抽屉
  onClick?: () => void | Promise<void>;
}

// 抽屉配置选项
export interface DrawerOptions {
  // 标题 - 支持字符串、组件、VNode 或渲染函数
  title?: string | Component | VNode | (() => VNode);

  // 内容 - 支持字符串、组件、VNode 或渲染函数
  content?: string | Component | VNode | (() => VNode);

  // 宽度（左右布局时使用）
  width?: number | string;

  // 高度（上下布局时使用）
  height?: number | string;

  // 抽屉位置
  placement?: 'top' | 'right' | 'bottom' | 'left';

  // 是否显示底部按钮
  showFooter?: boolean;

  // 确认按钮配置（false 表示不显示）
  confirmButton?: DrawerButtonConfig | false;

  // 取消按钮配置（false 表示不显示）
  cancelButton?: DrawerButtonConfig | false;

  // 自定义按钮列表
  customButtons?: DrawerButtonConfig[];

  // 是否显示遮罩层
  showMask?: boolean;

  // 点击遮罩层是否关闭
  maskClosable?: boolean;

  // 按 ESC 键是否关闭
  closeOnEsc?: boolean;

  // 是否显示关闭图标
  closable?: boolean;

  // 是否自动聚焦
  autoFocus?: boolean;

  // 是否锁定焦点
  trapFocus?: boolean;

  // 是否可调整大小
  resizable?: boolean;

  // 是否启用横向滚动
  xScrollable?: boolean;

  // 样式配置
  bodyStyle?: string | Record<string, string>;
  headerStyle?: string | Record<string, string>;
  footerStyle?: string | Record<string, string>;

  // 生命周期钩子
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onClose?: () => void;
  onAfterEnter?: () => void;
  onAfterLeave?: () => void;
  onMaskClick?: () => void;
}

// 抽屉实例
export interface DrawerInstance {
  // 关闭抽屉
  close: () => void;

  // 销毁抽屉实例
  destroy: () => void;

  // 更新配置
  updateOptions: (options: Partial<DrawerOptions>) => void;

  // 响应式状态
  state: {
    visible: Ref<boolean>;
    loading: Ref<boolean>;
    disabled: Ref<boolean>;
  };

  // 手动控制方法
  setLoading: (loading: boolean) => void;
  setDisabled: (disabled: boolean) => void;

  // 确认和取消方法
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
}
