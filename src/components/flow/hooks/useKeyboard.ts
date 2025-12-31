/**
 * 键盘快捷键管理 Hook
 *
 * 处理键盘快捷键的注册和处理，基于 FlowKeyboardHandler 核心逻辑
 * 提供 Vue 响应式封装
 */

import { onUnmounted, type Ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { FlowKeyboardHandler } from '../core/interaction/FlowKeyboardHandler';
import type { KeyBinding, KeyHandler } from '../core/interaction/FlowKeyboardHandler';

export interface UseKeyboardOptions {
  /** 是否启用键盘快捷键 */
  enabled?: Ref<boolean> | (() => boolean) | boolean;
  /** 目标元素（默认为 document） */
  target?: Ref<HTMLElement | null> | HTMLElement | null;
  /** 键盘事件处理回调 */
  onKeyDown?: (event: KeyboardEvent) => void;
}

export interface UseKeyboardReturn {
  /** 键盘处理器实例 */
  keyboardHandler: FlowKeyboardHandler;
  /** 注册快捷键 */
  register: (
    binding: KeyBinding,
    handler: KeyHandler,
    options?: {
      description?: string;
      priority?: number;
      preventDefault?: boolean;
      stopPropagation?: boolean;
    }
  ) => () => void;
  /** 取消注册快捷键 */
  unregister: (binding: KeyBinding, handler?: KeyHandler) => void;
  /** 启用键盘快捷键 */
  enable: () => void;
  /** 禁用键盘快捷键 */
  disable: () => void;
  /** 检查是否启用 */
  isEnabled: () => boolean;
  /** 清空所有快捷键 */
  clear: () => void;
}

/**
 * 键盘快捷键管理 Hook
 */
export function useKeyboard(options: UseKeyboardOptions = {}): UseKeyboardReturn {
  const { enabled = true, target, onKeyDown } = options;

  /** 创建键盘处理器实例 */
  const keyboardHandler = new FlowKeyboardHandler();

  /** 检查是否启用 */
  const checkEnabled = (): boolean => {
    if (typeof enabled === 'function') {
      return enabled();
    }
    if (typeof enabled === 'object' && enabled !== null && 'value' in enabled) {
      return enabled.value;
    }
    return enabled === true;
  };

  /** 处理键盘事件 */
  const handleKeyDown = (event: KeyboardEvent) => {
    // 检查是否启用
    if (!checkEnabled()) {
      return;
    }

    // 调用用户回调
    if (onKeyDown) {
      onKeyDown(event);
    }

    // 处理快捷键
    keyboardHandler.handle(event);
  };

  // 注册键盘事件监听器
  const targetElement = target
    ? typeof target === 'object' && 'value' in target
      ? target.value || document
      : target || document
    : document;

  useEventListener(targetElement, 'keydown', handleKeyDown);

  /** 注册快捷键 */
  const register = (
    binding: KeyBinding,
    handler: KeyHandler,
    options?: {
      description?: string;
      priority?: number;
      preventDefault?: boolean;
      stopPropagation?: boolean;
    }
  ): (() => void) => {
    return keyboardHandler.register(binding, handler, options);
  };

  /** 取消注册快捷键 */
  const unregister = (binding: KeyBinding, handler?: KeyHandler): void => {
    keyboardHandler.unregister(binding, handler);
  };

  /** 启用键盘快捷键 */
  const enable = (): void => {
    keyboardHandler.enable();
  };

  /** 禁用键盘快捷键 */
  const disable = (): void => {
    keyboardHandler.disable();
  };

  /** 检查是否启用 */
  const isEnabled = (): boolean => {
    return keyboardHandler.isEnabled();
  };

  /** 清空所有快捷键 */
  const clear = (): void => {
    keyboardHandler.clear();
  };

  // 组件卸载时清理
  onUnmounted(() => {
    clear();
  });

  return {
    keyboardHandler,
    register,
    unregister,
    enable,
    disable,
    isEnabled,
    clear
  };
}

