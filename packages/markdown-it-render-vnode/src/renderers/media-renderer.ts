/**
 * 媒体渲染器模块
 *
 * @module renderers/media-renderer
 */

import type { FrameworkNode } from '../adapters/types';
import { getAdapter } from '../adapters/manager';
import type { MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import { onLeavePictureInPicture } from '../utils';

/** 图片渲染规则 */
export function renderImage(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): FrameworkNode {
  const token = tokens[idx];
  const adapter = getAdapter();
  const baseAttrs = renderer.renderAttrs(token);

  // 添加 alt 文本
  const attrs = {
    ...baseAttrs,
    alt: renderer.renderInlineAsText(token.children || [], options, env)
  };

  return adapter.createElement('img', attrs, []);
}

/** 媒体元素渲染规则 */
export function renderMedia(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): FrameworkNode {
  const token = tokens[idx];
  const adapter = getAdapter();
  const baseAttrs = renderer.renderAttrs(token);

  // 创建扩展属性对象（包含非字符串类型的属性）
  const attrs = {
    ...baseAttrs,
    controlsList: 'nodownload',
    controls: true,
    onLeavepictureinpicture: onLeavePictureInPicture
  };

  return adapter.createElement(token.tag, attrs, []);
}

