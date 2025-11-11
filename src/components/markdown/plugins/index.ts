/**
 * Markdown 插件导出
 * @module plugins
 */

// 导出 V2 版本作为默认版本
export { default as MarkdownVuePlugin } from './v2/markdown-render-vnode-v2';
export { default } from './v2/markdown-render-vnode-v2';

// 导出类型
export type {
  Token,
  Renderer,
  RenderOptions,
  RenderEnv,
  MarkdownRenderer,
  VueMarkdownPluginOptions,
  CodeBlockMeta
} from './v2/types';

