/**
 * Markdown 渲染常量定义
 *
 * @module constants
 */

/** 安全检测正则表达式 */
export const SECURITY_PATTERNS = {
  /** 敏感 URL 协议检测 */
  SENSITIVE_URL: /^[\s\u0000-\u001F]*(?:javascript|vbscript|file|data):/i,

  /** 敏感属性名检测 */
  SENSITIVE_ATTR: /^(href|src|xlink:href|poster|srcset|action|formaction|cite|code|codebase|background|lowsrc|ping)$/i,

  /** 属性名格式验证 */
  ATTR_NAME: /^[a-zA-Z_:][a-zA-Z0-9:._-]*$/,

  /** 事件属性检测 */
  ATTR_EVENT: /^on/i
} as const;

/** 危险标签列表 */
export const DANGEROUS_TAGS: ReadonlySet<string> = new Set([
  'script',
  'iframe',
  'embed',
  'object',
  'style',
  'link',
  'base',
  'meta',
  'form',
  'input',
  'textarea',
  'button',
  'select',
  'option',
  'applet',
  'frame',
  'frameset',
  'bgsound',
  'keygen',
  'layer',
  'marquee',
  'noscript',
  'xml'
]);

/** 允许的安全标签列表 */
export const SAFE_TAGS: ReadonlySet<string> = new Set([
  'a',
  'abbr',
  'address',
  'article',
  'aside',
  'b',
  'blockquote',
  'br',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'dfn',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'main',
  'mark',
  'nav',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'samp',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'u',
  'ul',
  'var',
  'wbr'
]);

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

/** 异步组件加载配置 */
export const ASYNC_COMPONENT_CONFIG = {
  /** 加载延迟时间 (ms) */
  DELAY: 500,

  /** 超时时间 (ms) */
  TIMEOUT: 3000,

  /** 是否支持 Suspense */
  SUSPENSIBLE: true
} as const;

/** HTML 转义映射表 */
export const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} as const;

/** HTML 反转义映射表 */
export const HTML_UNESCAPE_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'"
} as const;

/** 性能优化配置 */
export const PERFORMANCE_CONFIG = {
  /** 是否启用属性对象池 */
  ENABLE_OBJECT_POOL: true,
  /** 对象池大小 */
  POOL_SIZE: 20,
  /** HTML VNode key 截取长度 */
  HTML_KEY_SUBSTRING_LENGTH: 20
} as const;

/** 性能监控配置 */
export const PERFORMANCE_MONITOR_CONFIG = {
  /** 性能阈值（毫秒） */
  THRESHOLD: 50
} as const;

