/**
 * HTML 渲染器模块
 * @module renderers/html-renderer
 */

import type { VNode } from 'vue';
import type { Token } from '../types';
import { createHtmlVNode } from '../utils';

/**
 * HTML 块和行内渲染规则（合并重复逻辑）
 */
export function renderHtml(tokens: Token[], idx: number): VNode {
  const token = tokens[idx] as any;
  
  // 如果 Token 已有 contentVNode，直接返回
  if (token.contentVNode) {
    return token.contentVNode;
  }
  
  // 创建 HTML VNode
  return createHtmlVNode(token.content);
}

/**
 * HTML 块渲染规则
 */
export const renderHtmlBlock = renderHtml;

/**
 * HTML 行内渲染规则
 */
export const renderHtmlInline = renderHtml;

