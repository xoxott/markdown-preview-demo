/**
 * Markdown 插件导出
 * @module plugins
 */

// 导出原版插件（保持向后兼容）
export { default as MarkdownVuePlugin } from './markdown-render-vnode';
export { default } from './markdown-render-vnode';

// 导出 V2 优化版本
export { default as MarkdownVuePluginV2 } from './markdown-render-vnode-v2';

// 导出类型
export type { Token, Renderer, CodeBlockMeta } from './type.d';
export type {
  RenderOptions,
  RenderEnv,
  MarkdownRenderer,
  VueMarkdownPluginOptions,
  CodeBlockMeta as CodeBlockMetaV2
} from './v2/types';

