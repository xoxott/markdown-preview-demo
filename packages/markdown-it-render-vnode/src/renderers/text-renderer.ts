/* eslint-disable max-params */
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
  _tokens: Token[],
  idx: number,
  _options: RenderOptions,
  _env: RenderEnv,
  _renderer: MarkdownRenderer
): FrameworkNode | string {
  return createTextNode(tokens[idx].content);
}

/** 硬换行渲染规则 */
export function renderHardBreak(
  _tokens: Token[],
  _idx: number,
  _options: RenderOptions,
  _env: RenderEnv,
  _renderer: MarkdownRenderer
): FrameworkNode {
  const adapter = getAdapter();
  return adapter.createElement('br', null, []);
}

/** 软换行渲染规则 */
export function renderSoftBreak(
  _tokens: Token[],
  _idx: number,
  options: RenderOptions,
  _env: RenderEnv,
  _renderer: MarkdownRenderer
): FrameworkNode | null {
  if (options.breaks) {
    const adapter = getAdapter();
    return adapter.createElement('br', null, []);
  }
  return null;
}
