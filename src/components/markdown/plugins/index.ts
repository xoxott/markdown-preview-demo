/**
 * Markdown 插件导出
 *
 * @module plugins
 */

import type MarkdownIt from 'markdown-it';
import markdownItRenderVnode from '@suga/markdown-it-render-vnode';
import type { FrameworkPluginOptions } from '@suga/markdown-it-render-vnode';
import { vueAdapter } from '@suga/markdown-it-render-vnode-vue';

// 导出插件（使用 Vue 适配器）
export const MarkdownVuePlugin = (
  md: MarkdownIt,
  options?: Omit<FrameworkPluginOptions, 'adapter'>
) => {
  return markdownItRenderVnode(md, { adapter: vueAdapter, ...options });
};

export default MarkdownVuePlugin;

// 导出类型
export type {
  Token,
  RenderOptions,
  RenderEnv,
  MarkdownRenderer,
  FrameworkPluginOptions as VueMarkdownPluginOptions,
  CodeBlockMeta
} from '@suga/markdown-it-render-vnode';
