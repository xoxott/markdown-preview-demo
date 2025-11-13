/**
 * Markdown 渲染类型定义
 *
 * @module types
 */

import type { Component, VNode } from 'vue';
import type Token from 'markdown-it/lib/token.mjs';
import type Renderer from 'markdown-it/lib/renderer.mjs';

/** 导出 Token 类型 */
export type { Token, Renderer };

/** 属性元组 */
export type Attr = [string, string];

/** 代码块元数据 */
export interface CodeBlockMeta {
  /** 语言名称 */
  langName: string;

  /** 代码内容 */
  content: string;

  /** 属性对象 */
  attrs: Record<string, string>;

  /** 完整 info 字符串 */
  info: string;

  /** 原始 Token */
  token: Token;
}

/** 渲染规则函数签名 */
export type RenderRule = (
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
) => VNode | VNode[] | string | null;

/** 渲染规则集合 */
export interface RenderRules {
  [key: string]: RenderRule;
}

/** 渲染选项 */
export interface RenderOptions {
  /** 是否启用换行符转 <br> */
  breaks?: boolean;

  /** 语言前缀 */
  langPrefix?: string;

  /** 高亮函数 */
  highlight?: (code: string, lang: string, attrs: string) => string;

  /** 插件选项 */
  [key: string]: any;
}

/** 渲染环境 */
export interface RenderEnv {
  /** 是否安全模式 */
  safeMode?: boolean;

  /** 宏定义行 */
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

/** Markdown 渲染器接口 */
export interface MarkdownRenderer {
  /** 渲染规则 */
  rules: RenderRules;

  /** 渲染 Token 数组 */
  render(tokens: Token[], options: RenderOptions, env: RenderEnv): VNode[];

  /** 渲染行内内容 */
  renderInline(tokens: Token[], options: RenderOptions, env: RenderEnv): VNode[];

  /** 渲染行内文本 */
  renderInlineAsText(tokens: Token[], options: RenderOptions, env: RenderEnv): string;

  /** 渲染属性 */
  renderAttrs(token: Token): Record<string, any>;

  /** 渲染单个 Token */
  renderToken(tokens: Token[], idx: number, options: RenderOptions, env: RenderEnv): VNode | null;
}

/** 插件配置选项 */
export interface VueMarkdownPluginOptions {
  /** 自定义组件 */
  components?: {
    /** 代码块组件工厂 */
    codeBlock?: (meta: CodeBlockMeta) => Component | Promise<Component> | null;
  };

  /** 性能配置 */
  performance?: {
    /** 是否启用缓存 */
    enableCache?: boolean;

    /** 缓存大小 */
    cacheSize?: number;
  };
}

/** 异步组件选项 */
export interface AsyncComponentOptions {
  /** 组件加载器 */
  loader: () => Promise<any>;

  /** 加载中组件 */
  loadingComponent?: any;

  /** 错误组件 */
  errorComponent?: any;

  /** 延迟时间 */
  delay?: number;

  /** 超时时间 */
  timeout?: number;

  /** 是否可挂起 */
  suspensible?: boolean;

  /** 错误回调 */
  onError?: () => any;
}

/** VNode 父节点栈项 */
export interface VNodeParentItem {
  vnode: VNode;
  depth: number;
}

/** 渲染上下文 */
export interface RenderContext {
  /** 当前选项 */
  options: RenderOptions;

  /** 当前环境 */
  env: RenderEnv;

  /** 渲染器实例 */
  renderer: MarkdownRenderer;

  /** 父节点栈 */
  parentStack: VNode[];
}

/** 属性对象池项 */
export interface PooledAttrs {
  attrs: Record<string, any>;
  inUse: boolean;
}

/** 缓存项 */
export interface CacheItem<T> {
  key: string;
  value: T;
  timestamp: number;
}
