/**
 * Markdown 渲染常量定义
 * @module constants
 */

/** 安全检测正则表达式 */
export const SECURITY_PATTERNS = {
  /** 敏感 URL 协议检测 */
  SENSITIVE_URL: /^javascript:|vbscript:|file:|data:/i,
  
  /** 敏感属性名检测 */
  SENSITIVE_ATTR: /^(href|src|xlink:href|poster|srcset)$/i,
  
  /** 属性名格式验证 */
  ATTR_NAME: /^[a-zA-Z_:][a-zA-Z0-9:._-]*$/,
  
  /** 事件属性检测 */
  ATTR_EVENT: /^on/i
} as const;

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
  /** 是否启用 VNode 缓存 */
  ENABLE_VNODE_CACHE: true,
  
  /** 缓存最大数量 */
  CACHE_MAX_SIZE: 100,
  
  /** 是否启用属性对象池 */
  ENABLE_OBJECT_POOL: true
} as const;

