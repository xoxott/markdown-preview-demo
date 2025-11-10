import type { VNode } from 'vue';

/** Markdown Token 属性 */
export type Attr = [string, string];

/** Markdown Token 接口 */
export interface Token {
  /** Token 类型 */
  type: string;
  /** HTML 标签名 */
  tag: string;
  /** 属性数组 */
  attrs: Attr[] | null;
  /** 设置属性 */
  attrSet(name: string, value: string): void;
  /** 获取属性 */
  attrGet(name: string): string | null;
  /** 获取属性索引 */
  attrIndex(name: string): number;
  /** 源码行号映射 [起始行, 结束行] */
  map: [number, number] | null;
  /** 嵌套级别: 1=开始标签, 0=自闭合, -1=结束标签 */
  nesting: number;
  /** 嵌套深度 */
  level: number;
  /** 子 Token */
  children: Token[] | null;
  /** Token 内容 */
  content: string;
  /** 标记符号 */
  markup: string;
  /** 附加信息 */
  info: string;
  /** 元数据 */
  meta?: any;
  /** 是否为块级元素 */
  block?: boolean;
  /** 是否隐藏 */
  hidden?: boolean;
}

/** Markdown 渲染器接口 */
export interface Renderer {
  /** 渲染 Token 数组为 VNode */
  render(tokens: Token[], options: any, env?: any): VNode | VNode[];
  /** 渲染行内 Token */
  renderInline(tokens: Token[], options?: any, env?: any): VNode | VNode[];
  /** 将行内 Token 渲染为纯文本 */
  renderInlineAsText(tokens: Token[], options: any, env: any): string;
  /** 渲染 Token 属性 */
  renderAttrs(token: Token): Record<string, any>;
  /** 渲染单个 Token */
  renderToken(tokens: Token[], index: number, options?: any, env?: any, self?: Renderer): VNode | string;
  /** 渲染规则映射 */
  rules: Record<string, RenderRule>;
}

/** 渲染规则函数类型 */
export type RenderRule = (
  tokens: Token[],
  idx: number,
  options: any,
  env: any,
  self: Renderer
) => VNode | VNode[] | string | null;

/** 代码块元数据 */
export interface CodeBlockMeta {
  /** 语言名称 */
  langName: string;
  /** 代码内容 */
  content: string;
  /** 属性对象 */
  attrs: Record<string, string>;
  /** 完整的 info 字符串 */
  info: string;
  /** 原始 Token */
  token: Token;
}

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

/** Markdown 插件选项 */
export interface MarkdownPluginOptions<T = any> {
  /** 框架类型 */
  framework?: 'vue' | 'react';
  /** 自定义组件映射 */
  components?: {
    /** 代码块组件 */
    codeBlock?: (meta: CodeBlockMeta) => T | null;
    /** SVG 渲染组件 */
    svgRenderer?: (meta: SvgMeta) => T | null;
  };
}

/** 异步组件选项 */
export interface AsyncComponentOptions<Component> {
  /** 组件加载器 */
  loader: () => Promise<Component>;
  /** 加载中显示的组件 */
  loadingComponent?: any;
  /** 错误时显示的组件 */
  errorComponent?: any;
  /** 延迟显示加载组件的时间（ms） */
  delay?: number;
  /** 超时时间（ms） */
  timeout?: number;
  /** 是否可挂起 */
  suspensible?: boolean;
  /** 错误处理回调 */
  onError?: (error: Error) => any;
}

/** 框架适配器接口 */
export interface FrameworkAdapter<VNode = any, Component = any> {
  /** 创建文本节点 */
  createTextNode(content: string): VNode;
  /** 创建元素节点 */
  createElement(tag: string, props: any, children?: VNode[]): VNode;
  /** 创建片段节点 */
  createFragment(children: VNode[]): VNode;
  /** 创建注释节点 */
  createComment(): VNode;
  /** 创建 HTML 节点 */
  createHtmlNode(html: string): VNode;
  /** 创建异步组件 */
  createAsyncComponent(options: AsyncComponentOptions<Component>): Component;
  /** 判断是否为组件选项 */
  isComponentOptions(obj: any): boolean;
}

/** 渲染环境变量 */
export interface RenderEnv {
  /** 是否为安全模式 */
  safeMode?: boolean;
  /** 宏行信息 */
  macroLines?: Array<{
    matchPos: number;
    lineOffset: number;
    posOffset: number;
    currentPosOffset: number;
  }>;
  /** 行起始位置 */
  bMarks?: number[];
  /** 行结束位置 */
  eMarks?: number[];
  /** 其他环境变量 */
  [key: string]: any;
}
