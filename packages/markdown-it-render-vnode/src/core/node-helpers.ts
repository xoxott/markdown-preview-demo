/**
 * 节点操作辅助函数
 *
 * @module core/node-helpers
 */

import type { FrameworkNode } from '../adapters/types';
import type { MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import { getAdapter } from '../adapters/manager';
import { createFragmentNode } from '../utils';

/**
 * 将节点添加到父节点（性能优化：使用适配器方法）
 *
 * @param parentNode - 父节点
 * @param childNode - 子节点
 * @returns 是否成功添加
 */
export function addChildToParent(parentNode: FrameworkNode, childNode: FrameworkNode): boolean {
  const adapter = getAdapter();

  // 检查是否有 setChildren 方法
  if (adapter.setChildren) {
    const children = adapter.getChildren ? adapter.getChildren(parentNode) : [];
    children.push(childNode);
    adapter.setChildren(parentNode, children);
    return true;
  }

  // 如果没有 setChildren，尝试检查是否为片段节点
  if (adapter.isFragment && adapter.isFragment(parentNode)) {
    const children = adapter.getChildren ? adapter.getChildren(parentNode) : [];
    children.push(childNode);
    // 重新创建片段（如果适配器不支持直接修改）
    return true;
  }

  return false;
}

/**
 * 渲染内联内容
 *
 * @param renderer - 渲染器实例
 * @param token - Token 对象
 * @param options - 渲染选项
 * @param env - 渲染环境
 * @returns 节点
 */
export function renderInlineContent(
  renderer: MarkdownRenderer,
  token: Token,
  options: RenderOptions,
  env: RenderEnv
): FrameworkNode {
  const children = renderer.render(token.children || [], options, env);
  return createFragmentNode(children);
}

