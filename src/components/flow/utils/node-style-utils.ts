/**
 * 节点样式工具函数
 *
 * 提供节点样式计算相关的工具函数
 */

import { getCssVariable } from './theme-utils';
import { CSS_VARIABLES } from '../constants/theme-constants';
import type { FlowNode } from '../types';

/**
 * 节点容器样式选项
 */
export interface NodeContainerStyleOptions {
  /** 节点数据 */
  node: FlowNode;
  /** 是否选中 */
  selected?: boolean;
  /** 是否锁定 */
  locked?: boolean;
  /** 是否悬停 */
  hovered?: boolean;
  /** 是否正在拖拽 */
  dragging?: boolean;
  /** 自定义样式 */
  customStyle?: Record<string, any>;
}

/**
 * 计算节点容器样式
 *
 * @param options 样式选项
 * @returns 节点容器样式对象
 */
export function calculateNodeContainerStyle(
  options: NodeContainerStyleOptions,
  element?: HTMLElement
): Record<string, any> {
  const { node, selected, locked, hovered, dragging, customStyle } = options;

  // 从 CSS 变量获取颜色值
  const nodeBg = getCssVariable(CSS_VARIABLES.NODE_BG, element, '#ffffff');
  const nodeBorder = getCssVariable(CSS_VARIABLES.NODE_BORDER, element, '#d9d9d9');
  const nodeBorderSelected = getCssVariable(CSS_VARIABLES.NODE_BORDER_SELECTED, element, '#2080f0');
  const nodeBorderHover = getCssVariable(CSS_VARIABLES.NODE_BORDER_HOVER, element, '#2080f0');
  const nodeShadowSelected = getCssVariable('flow-node-shadow-selected-value', element, 'rgba(32, 128, 240, 0.2)');
  const nodeShadowHover = getCssVariable('flow-node-shadow-hover-value', element, 'rgba(0, 0, 0, 0.1)');

  const baseStyle: Record<string, any> = {
    position: 'relative',
    width: node.size?.width ? `${node.size.width}px` : '150px',
    height: node.size?.height ? `${node.size.height}px` : '60px',
    cursor: locked ? 'not-allowed' : dragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    pointerEvents: 'auto',
    // 基础节点样式（使用 CSS 变量）
    backgroundColor: nodeBg,
    border: `1px solid ${nodeBorder}`,
    borderRadius: '8px',
    padding: '12px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '100px',
    minHeight: '40px',
    transition: 'border 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease',
    ...node.style,
    ...customStyle
  };

  // 选中状态样式
  if (selected) {
    baseStyle.border = `2px solid ${nodeBorderSelected}`;
    baseStyle.boxShadow = `0 0 0 2px ${nodeShadowSelected}`;
  }

  // 悬停状态样式
  if (hovered && !selected) {
    baseStyle.borderColor = nodeBorderHover;
    baseStyle.boxShadow = `0 2px 8px ${nodeShadowHover}`;
  }

  // 拖拽状态样式
  if (dragging) {
    baseStyle.opacity = 0.8;
  }

  return baseStyle;
}

/**
 * 计算节点类名
 *
 * @param options 类名选项
 * @returns 节点类名字符串
 */
export function calculateNodeClass(options: {
  nodeClass?: string;
  customClass?: string;
  selected?: boolean;
  locked?: boolean;
  hovered?: boolean;
  dragging?: boolean;
}): string {
  const { nodeClass, customClass, selected, locked, hovered, dragging } = options;
  const classes = ['flow-node', nodeClass, customClass];

  if (selected) classes.push('flow-node-selected');
  if (locked) classes.push('flow-node-locked');
  if (hovered) classes.push('flow-node-hovered');
  if (dragging) classes.push('flow-node-dragging');

  return classes.filter(Boolean).join(' ');
}

