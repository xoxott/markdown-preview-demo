/**
 * 文本渲染器模块
 *
 * @module renderers/text-renderer
 */

import type { FrameworkNode } from '../adapters/types';
import type { MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import { getAdapter } from '../adapters/manager';
import { createTextNode } from '../utils';

/** 文本渲染规则 */
export function renderText(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): FrameworkNode | string {
  return createTextNode(tokens[idx].content);
}

/** 硬换行渲染规则 */
export function renderHardBreak(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): FrameworkNode {
  const adapter = getAdapter();
  return adapter.createElement('br', null, []);
}

/** 软换行渲染规则 */
export function renderSoftBreak(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): FrameworkNode | null {
  if (options.breaks) {
    const adapter = getAdapter();
    return adapter.createElement('br', null, []);
  }
  return null;
}

