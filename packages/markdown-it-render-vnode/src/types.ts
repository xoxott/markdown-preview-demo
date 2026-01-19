/**
 * Markdown 渲染类型定义
 *
 * @module types
 */

import type Token from 'markdown-it/lib/token.mjs';
import type Renderer from 'markdown-it/lib/renderer.mjs';
import type { FrameworkNode, FrameworkComponent } from './adapters/types';

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
) => FrameworkNode | FrameworkNode[] | string | null;

/** 渲染规则集合 */
export interface RenderRules {
  [key: string]: RenderRule;
}

/** 渲染选项 */
export interface RenderOptions {
  breaks?: boolean;
  langPrefix?: string;
  highlight?: (code: string, lang: string, attrs: string) => string;
  [key: string]: unknown;
}

/** 渲染环境 */
export interface RenderEnv {
  safeMode?: boolean;
  macroLines?: Array<{
    matchPos: number;
    lineOffset: number;
    posOffset: number;
    currentPosOffset: number;
  }>;
  bMarks?: number[];
  eMarks?: number[];
  [key: string]: unknown;
}

/** Markdown 渲染器接口 */
export interface MarkdownRenderer {
  rules: RenderRules;
  options: RenderOptions;
  render(tokens: Token[], options: RenderOptions, env: RenderEnv): FrameworkNode[];
  renderInline(tokens: Token[], options: RenderOptions, env: RenderEnv): FrameworkNode[];
  renderInlineAsText(tokens: Token[], options: RenderOptions, env: RenderEnv): string;
  renderAttrs(token: Token): Record<string, string>;
  renderToken(tokens: Token[], idx: number, options: RenderOptions, env: RenderEnv): FrameworkNode | null;
}

/** 错误处理模式 */
export type ErrorHandlingMode = 'silent' | 'warn' | 'strict';

/** 错误处理配置 */
export interface ErrorHandlerConfig {
  /** 错误处理模式 */
  mode?: ErrorHandlingMode;
  /** 自定义错误消息前缀 */
  errorPrefix?: string;
}

/** 插件配置选项 */
export interface FrameworkPluginOptions {
  /** 框架适配器（必需） */
  adapter: import('./adapters/types').FrameworkAdapter;

  /** 自定义组件 */
  components?: {
    /** 代码块组件工厂 */
    codeBlock?: (meta: CodeBlockMeta) => FrameworkComponent | Promise<FrameworkComponent> | null;
    /** 表格组件工厂 */
    table?: (meta: { token: Token }) => FrameworkComponent | Promise<FrameworkComponent> | null;
    /** 链接组件工厂 */
    link?: (meta: { token: Token; href: string; title?: string }) => FrameworkComponent | Promise<FrameworkComponent> | null;
    /** 图片组件工厂 */
    image?: (meta: { token: Token; src: string; alt: string; title?: string }) => FrameworkComponent | Promise<FrameworkComponent> | null;
  };

  /** 性能配置（预留用于未来扩展） */
  performance?: {
    /** 预留字段，暂无使用 */
    _reserved?: never;
  };

  /** 错误处理配置 */
  errorHandler?: ErrorHandlerConfig;

  /** 自定义渲染规则（可覆盖默认规则） */
  customRules?: Partial<RenderRules>;
}

/** 异步组件选项 */
export interface AsyncComponentOptions {
  /** 组件加载器 */
  loader: () => Promise<FrameworkComponent>;
  /** 加载中组件 */
  loadingComponent?: FrameworkComponent;
  /** 错误组件 */
  errorComponent?: FrameworkComponent;
  /** 延迟时间 */
  delay?: number;
  /** 超时时间 */
  timeout?: number;
  /** 是否可挂起 */
  suspensible?: boolean;
  /** 错误回调 */
  onError?: (error: Error) => void;
}


