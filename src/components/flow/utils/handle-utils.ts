/**
 * 端口（Handle）工具函数
 *
 * 提供端口样式计算和位置计算相关的工具函数
 */

import type { FlowHandle } from '../types/flow-node';

/**
 * 端口颜色常量
 */
export const HANDLE_COLORS = {
  SOURCE: '#18a058', // 绿色表示输出端口
  TARGET: '#2080f0', // 蓝色表示输入端口
  DEFAULT: '#2080f0'
} as const;

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
  customStyle?: Record<string, any>
): Record<string, any> {
  const handleStyle: Record<string, any> = {
    position: 'absolute',
    width: `${HANDLE_SIZES.WIDTH}px`,
    height: `${HANDLE_SIZES.HEIGHT}px`,
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: `${HANDLE_SIZES.BORDER_WIDTH}px solid ${HANDLE_COLORS.DEFAULT}`,
    cursor: 'crosshair',
    zIndex: 10,
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    ...handle.style,
    ...customStyle
  };

  // 根据端口类型设置不同的颜色
  if (handle.type === 'source') {
    handleStyle.borderColor = HANDLE_COLORS.SOURCE;
  } else if (handle.type === 'target') {
    handleStyle.borderColor = HANDLE_COLORS.TARGET;
  }

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

