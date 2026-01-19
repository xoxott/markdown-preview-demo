/**
 * React 适配器
 *
 * @module markdown-it-render-vnode-react
 */

import React from 'react';
import type { ReactElement } from 'react';
import type { FrameworkAdapter, FrameworkComponent, FrameworkNode, NodeChildren, NodeProps } from '@suga/markdown-it-render-vnode/adapters';

/**
 * 规范化子节点
 */
function normalizeChildren(children: NodeChildren): ReactElement[] {
  if (!children) {
    return [];
  }

  if (Array.isArray(children)) {
    return children.filter((child) => child != null) as ReactElement[];
  }

  return [children as ReactElement];
}

/**
 * React 适配器实现
 */
export const reactAdapter: FrameworkAdapter = {
  createElement(tag: string | FrameworkComponent, props: NodeProps | null, children: NodeChildren): FrameworkNode {
    // 处理子节点：React 可以直接接受数组
    const normalizedChildren = normalizeChildren(children);
    return React.createElement(tag as string | React.ComponentType, props || {}, ...normalizedChildren);
  },

  createText(text: string): string {
    // React 中文本直接作为字符串返回
    return text;
  },

  createFragment(children: FrameworkNode[]): FrameworkNode {
    return React.createElement(React.Fragment, {}, ...(children as ReactElement[]));
  },

  createComment(): null {
    // React 不支持注释节点
    return null;
  },

  isFragment(node: FrameworkNode): boolean {
    const element = node as ReactElement;
    return element?.type === React.Fragment;
  },

  getChildren(node: FrameworkNode): FrameworkNode[] {
    const element = node as ReactElement;
    const children = element?.props?.children;
    return Array.isArray(children) ? (children as FrameworkNode[]) : children ? [children as FrameworkNode] : [];
  }
};

// 默认导出适配器
export default reactAdapter;

