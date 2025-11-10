/** Markdown 组件统一导出 支持独立使用或集成使用 */

// 主组件
export { default as MarkdownPreview } from './MarkdownPreview';

// 渲染器组件（可独立使用）
export { CodeBlock } from './components/CodeBlock';
export { MermaidRenderer } from './components/MermaidRenderer';
export { MindmapRenderer } from './components/MindmapRenderer';
export { EchartsRenderer } from './components/EchartsRenderer';
export { SvgRenderer } from './components/SvgRenderer';
export { ToolBar } from './components/ToolBar';
export { SandBox } from './components/SandBox';

// Hooks
export { useMarkdownTheme } from './hooks/useMarkdownTheme';
export { useMermaid } from './hooks/useMermaid';
export { useMindmap } from './hooks/useMindmap';
export { useCodeTools, useSvgTools } from './hooks/useToolbar';

// 类型
export type { Token, Renderer, CodeBlockMeta, SvgMeta, RenderRule, MarkdownPluginOptions } from './plugins/types';

export type { MermaidRendererProps } from './components/MermaidRenderer';
export type { MindmapRendererProps } from './components/MindmapRenderer';
export type { EchartsRendererProps } from './components/EchartsRenderer';
export type { SvgRendererProps } from './components/SvgRenderer';
export type { ToolBarProps, ToolBarEmits, ZoomDirection } from './components/ToolBar';
export type { SandBoxProps, CodeMode } from './components/SandBox';

// 工具函数
export { escapeHtml, unescapeAll, validateAttrName, isUrlSafe, sanitizeSvg, sanitizeHtml } from './utils/security';

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

// 常量
export {
  DOM_ATTR_NAME,
  RUN_CODE_LANGS,
  CHART_LANGS,
  HIGHLIGHT_LANGS,
  SVG_SAFE_ATTRS,
  SVG_SAFE_TAGS
} from './constants';
