/** DOM 属性名称常量 */
export const DOM_ATTR_NAME = {
  /** 源代码起始行号 (1-based) */
  SOURCE_LINE_START: 'data-source-line-start',
  /** 源代码结束行号 (1-based) */
  SOURCE_LINE_END: 'data-source-line-end',
  /** 原始未处理内容 */
  ORIGIN_CONTENT: 'data-origin-content',
  /** 语法块类型标识 */
  SYNTAX_TYPE: 'data-syntax-type',
  /** Token 索引标识 */
  TOKEN_IDX: 'data-token-idx',
  /** 代码块语言类型 */
  CODE_LANG: 'data-code-lang',
  /** 是否折叠状态 */
  COLLAPSE_STATE: 'data-collapse-state',
  /** 安全渲染标识 */
  SANITIZED: 'data-sanitized'
} as const;

/** 支持运行的代码语言 */
export const RUN_CODE_LANGS = ['vue', 'javascript', 'typescript', 'js', 'ts','vue3'] as const;

/** 图表渲染语言 */
export const CHART_LANGS = ['mermaid', 'markmap', 'echarts'] as const;

/** 支持语法高亮的语言列表 */
export const HIGHLIGHT_LANGS = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'scala',
  'html',
  'css',
  'scss',
  'less',
  'json',
  'xml',
  'yaml',
  'markdown',
  'bash',
  'shell',
  'sql',
  'vue',
  'react',
  'angular'
] as const;

/** 默认代码块样式 */
export const DEFAULT_CODE_STYLE = {
  margin: '0',
  padding: '0',
  fontSize: '14px',
  marginBottom: '0'
} as const;

/** SVG 安全属性白名单 */
export const SVG_SAFE_ATTRS = [
  'width',
  'height',
  'viewBox',
  'xmlns',
  'fill',
  'stroke',
  'stroke-width',
  'transform',
  'd',
  'cx',
  'cy',
  'r',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'class',
  'id',
  'style'
] as const;

/** SVG 安全标签白名单 */
export const SVG_SAFE_TAGS = [
  'svg',
  'g',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'text',
  'tspan',
  'defs',
  'use',
  'symbol',
  'marker',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'pattern'
] as const;
