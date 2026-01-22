/**
 * Vue 适配器
 *
 * @module markdown-it-render-vnode-vue
 */

import type {
  FrameworkAdapter,
  FrameworkComponent,
  FrameworkNode,
  NodeChildren,
  NodeProps
} from '@suga/markdown-it-render-vnode/adapters';
import type { Component, VNode } from 'vue';
import { Comment, Fragment, Text, createVNode } from 'vue';

/**
 * 规范化子节点
 */
function normalizeChildren(children: NodeChildren): VNode[] {
  if (!children) {
    return [];
  }

  if (Array.isArray(children)) {
    return children
      .filter((child): child is VNode | string => child != null)
      .map((child) => (typeof child === 'string' ? createVNode(Text, {}, child) : (child as VNode)));
  }

  if (typeof children === 'string' || typeof children === 'number') {
    return [createVNode(Text, {}, String(children))];
  }

  return [children as VNode];
}

/**
 * Vue 适配器实现
 */
export const vueAdapter: FrameworkAdapter = {
  createElement(tag: string | FrameworkComponent, props: NodeProps | null, children: NodeChildren): FrameworkNode {
    // 处理子节点：扁平化数组，过滤 null/undefined
    const normalizedChildren = normalizeChildren(children);

    // 提取 Vue 的 key（如果存在 data-token-key）
    const vueProps = props ? { ...props } : {};
    let key: string | undefined;

    if (vueProps['data-token-key']) {
      key = vueProps['data-token-key'] as string;
      // 保留 data-token-key 作为属性，便于调试
    }

    // 判断 tag 是 HTML 元素还是 Vue 组件
    const isComponent = typeof tag !== 'string';

    let vnodeChildren: VNode[] | undefined;
    if (normalizedChildren.length === 0) {
      vnodeChildren = isComponent ? undefined : [];
    } else {
      vnodeChildren = normalizedChildren;
    }

    const vnode = createVNode(tag as string | Component, vueProps, vnodeChildren);
    if (key) {
      vnode.key = key;
    }

    return vnode;
  },

  createText(text: string): FrameworkNode {
    return createVNode(Text, {}, text);
  },

  createFragment(children: FrameworkNode[]): FrameworkNode {
    return createVNode(Fragment, {}, children as VNode[]);
  },

  createComment(): FrameworkNode {
    return createVNode(Comment);
  },

  isFragment(node: FrameworkNode): boolean {
    const vnode = node as VNode;
    return vnode.type === Fragment;
  },

  getChildren(node: FrameworkNode): FrameworkNode[] {
    const vnode = node as VNode;
    return (Array.isArray(vnode.children) ? vnode.children : []) as FrameworkNode[];
  },

  setChildren(node: FrameworkNode, children: FrameworkNode[]): void {
    const vnode = node as VNode;
    vnode.children = children as VNode[];
  }
};

// 默认导出适配器
export default vueAdapter;

