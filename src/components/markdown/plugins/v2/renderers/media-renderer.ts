/**
 * 媒体渲染器模块
 *
 * @module renderers/media-renderer
 */

import type { VNode } from 'vue';
import { createVNode } from 'vue';
import type { MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import { onLeavePictureInPicture } from '../utils';

/** 图片渲染规则 */
export function renderImage(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): VNode {
  const token = tokens[idx];
  const attrs = renderer.renderAttrs(token);

  // 添加 alt 文本
  attrs.alt = renderer.renderInlineAsText(token.children || [], options, env);

  return createVNode('img', attrs, []);
}

/** 媒体元素渲染规则 */
export function renderMedia(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): VNode {
  const token = tokens[idx];
  const attrs = renderer.renderAttrs(token);

  // 添加媒体控制属性
  attrs.controlsList = 'nodownload';
  attrs.controls = true;
  attrs.onLeavepictureinpicture = onLeavePictureInPicture;

  return createVNode(token.tag, attrs, []);
}
