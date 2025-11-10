import type { VNode } from 'vue';

export type Attr = [string, string];
export interface Token {
  type: string;
  tag: string;
  attrs: Array<Attr> | null;
  attrSet(name: string, value: string): void;
  attrGet(name: string): string | null;
  attrIndex(name: string): number;
  map: [number, number] | null;
  nesting: number;
  level: number;
  children: Token[] | null;
  content: string;
  markup: string;
  info: string;
  meta?: any;
  block?: boolean;
  hidden?: boolean;
}

export interface Renderer {
  render(tokens: Token[], idx: number, options: any, env?: any, self?: Renderer): VNode | VNode[];
  renderInlineAsText(tokens: Token[], options: any, env: any): string;
  renderAttrs(token: Token): string;
  renderToken(tokens: Token[], index: number, options?: any, env?: any, self?: Renderer): string;
  renderInline(tokens: Token[], options?: any, env?: any): VNode | VNode[];
  rules: Record<
    string,
    (tokens: Token[], idx: number, options: any, env: any, self: Renderer) => VNode | VNode[] | string
  >;
}

export interface CodeBlockMeta {
  langName: string;
  content: string;
  attrs: Record<string, string>;
  info: string;
  token: Token;
}
export interface MarkdownPluginOptions<T = any> {
  framework: 'vue' | 'react';
  components?: {
    codeBlock?: (meta: CodeBlockMeta) => T | null;
  };
}
export interface FrameworkAdapter<VNode = any, Component = any> {
  createTextNode(content: string): VNode;
  createElement(tag: string, props: any, children?: VNode[]): VNode;
  createFragment(children: VNode[]): VNode;
  createComment(): VNode;
  createHtmlNode(html: string): VNode;
  createAsyncComponent(options: AsyncComponentOptions<Component>): Component;
  isComponentOptions(obj: any): boolean;
}
export interface AsyncComponentOptions<Component> {
  loader: () => Promise<Component>;
  loadingComponent?: any;
  errorComponent?: any;
  delay?: number;
  timeout?: number;
  onError?: (error: Error) => any;
}
