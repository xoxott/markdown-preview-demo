/**
 * 渲染器入口模块
 *
 * @module renderers
 */

import type { RenderRules } from '../types';
import { renderCodeBlock, renderCodeInline, renderFence, setCodeRendererOptions } from './code-renderer';
import { renderHtmlBlock, renderHtmlInline } from './html-renderer';
import { renderHardBreak, renderSoftBreak, renderText } from './text-renderer';
import { renderImage, renderMedia } from './media-renderer';

/** 默认渲染规则集合 */
export const defaultRenderRules: RenderRules = {
  // 代码相关
  code_inline: renderCodeInline,
  code_block: renderCodeBlock,
  fence: renderFence,

  // HTML 相关
  html_block: renderHtmlBlock,
  html_inline: renderHtmlInline,

  // 文本相关
  text: renderText,
  hardbreak: renderHardBreak,
  softbreak: renderSoftBreak,

  // 媒体相关
  image: renderImage,
  media: renderMedia
};

/** 导出设置函数 */
export { setCodeRendererOptions };

/** 导出所有渲染器 */
export * from './code-renderer';
export * from './html-renderer';
export * from './text-renderer';
export * from './media-renderer';
