/**
 * 文本渲染器模块
 * @module renderers/text-renderer
 */

import type { VNode } from 'vue';
import { createVNode } from 'vue';
import type { Token, RenderOptions } from '../types';
import { createTextNode } from '../utils';

/**
 * 文本渲染规则
 */
export function renderText(tokens: Token[], idx: number): VNode {
  return createTextNode(tokens[idx].content);
}

/**
 * 硬换行渲染规则
 */
export function renderHardBreak(): VNode {
  return createVNode('br');
}

/**
 * 软换行渲染规则
 */
export function renderSoftBreak(
  tokens: Token[],
  idx: number,
  options: RenderOptions
): VNode | null {
  return options.breaks ? createVNode('br') : null;
}

