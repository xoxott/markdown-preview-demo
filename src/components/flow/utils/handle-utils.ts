/**
 * 端口（Handle）工具函数
 *
 * 提供端口样式计算和位置计算相关的工具函数
 */

import type { FlowHandle } from '../types/flow-node';
import { getCssVariable } from './theme-utils';
import { CSS_VARIABLES } from '../constants/theme-constants';

/**
 * 端口颜色常量
 *
 * 注意：这些值仅作为默认值，实际颜色应该从 CSS 变量中获取
 * 使用 getCssVariable() 函数可以获取当前主题的颜色值
 * CSS 变量名：--flow-handle-border-source, --flow-handle-border-target, --flow-handle-border-default
 */
export const HANDLE_COLORS = {
  SOURCE: '#18a058', // 绿色表示输出端口
  TARGET: '#2080f0', // 蓝色表示输入端口
  DEFAULT: '#2080f0'
} as const;

/**
 * 获取端口颜色（从 CSS 变量）
 *
 * @param type 端口类型
 * @param element 元素（用于获取 CSS 变量）
 * @returns 端口颜色值
 */
export function getHandleColor(
  type: 'source' | 'target' | 'default',
  element?: HTMLElement
): string {
  const variableName = type === 'source'
    ? CSS_VARIABLES.HANDLE_BORDER_SOURCE
    : type === 'target'
    ? CSS_VARIABLES.HANDLE_BORDER_TARGET
    : CSS_VARIABLES.HANDLE_BORDER_DEFAULT;

  return getCssVariable(variableName, element, HANDLE_COLORS[type.toUpperCase() as keyof typeof HANDLE_COLORS]);
}

/**
 * 端口尺寸常量
 */
export const HANDLE_SIZES = {
  WIDTH: 12,
  HEIGHT: 12,
  BORDER_WIDTH: 2
} as const;

/**
 * 计算端口样式
 *
 * @param handle 端口数据
 * @param customStyle 自定义样式
 * @returns 端口样式对象
 */
export function calculateHandleStyle(
  handle: FlowHandle,
  customStyle?: Record<string, any>,
  element?: HTMLElement
): Record<string, any> {
  // 获取端口颜色（从 CSS 变量）
  const borderColor = getHandleColor(handle.type || 'default', element);
  const bgColor = getCssVariable(CSS_VARIABLES.HANDLE_BG, element, '#fff');

  const handleStyle: Record<string, any> = {
    position: 'absolute',
    width: `${HANDLE_SIZES.WIDTH}px`,
    height: `${HANDLE_SIZES.HEIGHT}px`,
    borderRadius: '50%',
    backgroundColor: bgColor,
    border: `${HANDLE_SIZES.BORDER_WIDTH}px solid ${borderColor}`,
    cursor: 'crosshair',
    zIndex: 10,
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    ...handle.style,
    ...customStyle
  };

  return handleStyle;
}

/**
 * 计算端口位置样式
 *
 * @param handle 端口数据
 * @returns 位置样式对象
 */
export function calculateHandlePositionStyle(handle: FlowHandle): Record<string, string> {
  const positionStyle: Record<string, string> = {};

  switch (handle.position) {
    case 'top':
      positionStyle.left = '50%';
      positionStyle.top = '0';
      positionStyle.transform = 'translate(-50%, -50%)';
      break;
    case 'bottom':
      positionStyle.left = '50%';
      positionStyle.bottom = '0';
      positionStyle.transform = 'translate(-50%, 50%)';
      break;
    case 'left':
      positionStyle.left = '0';
      positionStyle.top = '50%';
      positionStyle.transform = 'translate(-50%, -50%)';
      break;
    case 'right':
      positionStyle.right = '0';
      positionStyle.top = '50%';
      positionStyle.transform = 'translate(50%, -50%)';
      break;
  }

  return positionStyle;
}

/**
 * 获取端口类名
 *
 * @param handle 端口数据
 * @returns 端口类名字符串
 */
export function getHandleClass(handle: FlowHandle): string {
  return `flow-handle flow-handle-${handle.type} flow-handle-${handle.position}`;
}

