/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-07-08 14:03:06
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-07-11 16:28:11
 * @FilePath: \umi-enterprise-saas-web\src\typings\drawer.d.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { CSSProperties, Component, VNode } from 'vue';

export type DrawerPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface DrawerButtonConfig {
  text: string;
  type?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void | Promise<void>;
}

export interface DrawerOptions {
  trapFocus?: boolean;
  onMaskClick?: ((e: MouseEvent) => void) | undefined;
  showMask?: boolean | 'transparent';
  // 基础配置
  title?: string | VNode | (() => VNode) | Component;
  content?: string | VNode | Component;
  width?: string | number;
  height?: string | number;
  placement?: DrawerPlacement;
  resizable?: boolean;

  // 行为配置
  closable?: boolean;
  maskClosable?: boolean;
  closeOnEsc?: boolean;
  autoFocus?: boolean;

  // 样式配置
  bodyStyle?: CSSProperties;
  headerStyle?: CSSProperties;
  footerStyle?: CSSProperties;

  // 按钮配置
  showFooter?: boolean;
  confirmButton?: DrawerButtonConfig;
  cancelButton?: DrawerButtonConfig;
  customButtons?: DrawerButtonConfig[];

  // 事件回调
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onClose?: () => void;
  onAfterEnter?: () => void;
  onAfterLeave?: () => void;
}

export interface DrawerInstance {
  close: () => void;
  destroy: () => void;
  updateOptions: (options: Partial<DrawerOptions>) => void;
}
