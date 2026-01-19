/**
 * Markdown 插件类型定义
 *
 * 从包中导入基础类型，只保留组件特有的类型定义
 */

// 从包中导入基础类型
export type {
  Token,
  RenderOptions,
  RenderEnv,
  MarkdownRenderer,
  CodeBlockMeta,
  RenderRule,
  FrameworkPluginOptions
} from '@suga/markdown-it-render-vnode';

// 组件特有的类型定义

/** SVG 元数据 */
export interface SvgMeta {
  /** SVG 内容 */
  content: string;
  /** ViewBox 属性 */
  viewBox?: string;
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 属性对象 */
  attrs?: Record<string, string>;
  /** 是否为内联 SVG */
  inline?: boolean;
}
