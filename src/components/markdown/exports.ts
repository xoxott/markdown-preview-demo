// 渲染器组件（可独立使用）
export { CodeBlock } from './components/CodeBlock';
export { MermaidRenderer } from './components/MermaidRenderer';
export { MindmapRenderer } from './components/MindmapRenderer';
export { EchartsRenderer } from './components/EchartsRenderer';
export { SvgRenderer } from './components/SvgRenderer';
export { ToolBar } from './components/ToolBar';
export { SandBox } from './components/SandBox';
export { ErrorMessage } from './components/ErrorMessage';

// Hooks
export { useMarkdownTheme } from './hooks/useMarkdownTheme';
export { useMermaid } from './hooks/useMermaid';
export { useMindmap } from './hooks/useMindmap';
export { useCodeTools, useSvgTools } from './hooks/useToolbar';

// 类型（从包中导入基础类型，从本地导入组件特有类型）
export type {
  Token,
  MarkdownRenderer as Renderer,
  CodeBlockMeta,
  RenderRule
} from '@suga/markdown-it-render-vnode';
export type { SvgMeta } from './plugins/types';

export type { MermaidRendererProps } from './components/MermaidRenderer';
export type { MindmapRendererProps } from './components/MindmapRenderer';
export type { EchartsRendererProps } from './components/EchartsRenderer';
export type { SvgRendererProps } from './components/SvgRenderer';
export type { ToolBarProps, ToolBarEmits, ZoomDirection } from './components/ToolBar';
export type { SandBoxProps, CodeMode } from './components/SandBox';
export type { ErrorMessageProps } from './components/ErrorMessage';

// 工具函数（从包中导入基础函数，从本地导入组件特有函数）
export { escapeHtml, unescapeAll, validateAttrName, isUrlSafe } from '@suga/markdown-it-render-vnode';
export { sanitizeSvg, sanitizeHtml } from './utils/security';

export {
  isSvgContent,
  extractSvgDimensions,
  setSvgDimensions,
  optimizeSvg,
  svgToDataUrl,
  downloadSvg,
  copySvgToClipboard,
  isValidSvg
} from './utils/svg-utils';

// 常量（从包中导入基础常量，从本地导入组件特有常量）
export { DOM_ATTR_NAME } from '@suga/markdown-it-render-vnode';
export {
  RUN_CODE_LANGS,
  CHART_LANGS,
  HIGHLIGHT_LANGS,
  SVG_SAFE_ATTRS,
  SVG_SAFE_TAGS
} from './constants';

