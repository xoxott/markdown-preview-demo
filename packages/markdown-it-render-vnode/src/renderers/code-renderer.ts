/**
 * 代码块渲染器模块
 *
 * @module renderers/code-renderer
 */

import { v4 as uuid } from 'uuid';
import type { CodeBlockMeta, FrameworkPluginOptions, MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import type { FrameworkComponent, FrameworkNode } from '../adapters/types';
import { DOM_ATTR_NAME } from '../constants';
import { getAdapter } from '../adapters/manager';
import { escapeHtml, isComponentOptions, mergeClasses, omitAttrs, parseInfoString, unescapeAll, createTextNode } from '../utils';
import { handleError } from '../utils/error-handler';

/** 插件选项缓存 */
let pluginOptions: FrameworkPluginOptions | null = null;

/** 设置插件选项 */
export function setCodeRendererOptions(options: FrameworkPluginOptions): void {
  pluginOptions = options;
}

/** 行内代码渲染规则 */
export function renderCodeInline(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): FrameworkNode | string {
  const token = tokens[idx];
  const adapter = getAdapter();
  const attrs = renderer.renderAttrs(token);

  return adapter.createElement('code', attrs, token.content);
}

/** 代码块渲染规则 */
export function renderCodeBlock(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): FrameworkNode {
  const token = tokens[idx];
  const adapter = getAdapter();
  const originalAttrs = renderer.renderAttrs(token);

  // 分离源码行号属性
  const safeAttrs = omitAttrs(originalAttrs, [DOM_ATTR_NAME.SOURCE_LINE_START, DOM_ATTR_NAME.SOURCE_LINE_END]);

  const preAttrs = {
    [DOM_ATTR_NAME.SOURCE_LINE_START]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_START],
    [DOM_ATTR_NAME.SOURCE_LINE_END]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_END]
  };

  const textNode = createTextNode(token.content);
  const codeNode = adapter.createElement('code', safeAttrs, typeof textNode === 'string' ? [textNode] : [textNode]);
  return adapter.createElement('pre', preAttrs, [codeNode]);
}

/**
 * 创建代码块元数据
 *
 * @param token - Token 对象
 * @param info - Info 字符串
 * @param langName - 语言名称
 * @returns 代码块元数据
 */
function createCodeBlockMeta(token: Token, info: string, langName: string): CodeBlockMeta {
  return {
    langName,
    content: token.content,
    attrs: Object.fromEntries(token.attrs || []),
    info,
    token
  };
}

/**
 * 高亮代码内容
 *
 * @param content - 代码内容
 * @param langName - 语言名称
 * @param langAttrs - 语言属性
 * @param options - 渲染选项
 * @returns 高亮后的 HTML 字符串
 */
function highlightCode(content: string, langName: string, langAttrs: string, options: RenderOptions): string {
  if (typeof options.highlight === 'function') {
    return options.highlight(content, langName, langAttrs) || escapeHtml(content);
  }
  return escapeHtml(content);
}

/**
 * 创建默认代码块节点
 *
 * @param token - Token 对象
 * @param info - Info 字符串
 * @param langName - 语言名称
 * @param highlighted - 高亮后的 HTML
 * @param renderer - 渲染器实例
 * @returns 节点或 HTML 字符串
 */
function createDefaultCodeBlockVNode(
  token: Token,
  info: string,
  langName: string,
  highlighted: string,
  renderer: MarkdownRenderer
): FrameworkNode | string {
  const adapter = getAdapter();

  // 如果高亮结果包含 <pre> 标签，直接返回
  if (highlighted.startsWith('<pre')) {
    return `${highlighted}\n`;
  }

  const originalAttrs = renderer.renderAttrs(token);
  const safeAttrs = omitAttrs(originalAttrs, [DOM_ATTR_NAME.SOURCE_LINE_START, DOM_ATTR_NAME.SOURCE_LINE_END]);

  const preAttrs = {
    'data-info': info,
    'data-lang': langName,
    [DOM_ATTR_NAME.SOURCE_LINE_START]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_START],
    [DOM_ATTR_NAME.SOURCE_LINE_END]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_END]
  };

  const codeAttrs = {
    ...safeAttrs,
    innerHTML: highlighted
  };

  return adapter.createElement('pre', preAttrs, [adapter.createElement('code', codeAttrs, [])]);
}

/**
 * 创建默认代码块渲染函数
 *
 * @param token - Token 对象
 * @param info - Info 字符串
 * @param langName - 语言名称
 * @param langAttrs - 语言属性
 * @param options - 渲染选项
 * @param renderer - 渲染器实例
 * @returns 默认渲染函数
 */
function createDefaultRenderFn(
  token: Token,
  info: string,
  langName: string,
  langAttrs: string,
  options: RenderOptions,
  renderer: MarkdownRenderer
): () => FrameworkNode | string {
  return () => {
    const highlighted = highlightCode(token.content, langName, langAttrs, options);
    const originalAttrs = renderer.renderAttrs(token);
    const safeAttrs = omitAttrs(originalAttrs, [DOM_ATTR_NAME.SOURCE_LINE_START, DOM_ATTR_NAME.SOURCE_LINE_END]);

    // 合并 class（使用 options.langPrefix）
    const classList = mergeClasses(safeAttrs.class, langName ? `${options.langPrefix || ''}${langName}` : undefined);
    if (classList) {
      safeAttrs.class = classList;
    }

    return createDefaultCodeBlockVNode(token, info, langName, highlighted, renderer);
  };
}

/**
 * 解析自定义组件
 *
 * @param customComponent - 自定义组件（可能是 Promise、函数或组件对象）
 * @param defaultRender - 默认渲染函数
 * @returns 解析后的组件或 null
 */
function resolveCustomComponent(
  customComponent: FrameworkComponent | Promise<FrameworkComponent> | null,
  defaultRender: () => FrameworkNode | string
): FrameworkComponent | Promise<FrameworkComponent> | null {
  if (!customComponent) {
    return null;
  }

  // Promise（动态导入）- 直接返回 Promise，由适配器处理
  if (customComponent instanceof Promise) {
    return customComponent;
  }

  // 组件工厂函数或组件选项对象
  if (typeof customComponent === 'function' || isComponentOptions(customComponent)) {
    return customComponent;
  }

  return null;
}

/**
 * 创建自定义组件节点
 *
 * @param component - 组件（可能是 Promise）
 * @param langName - 语言名称
 * @param meta - 代码块元数据
 * @param defaultRender - 默认渲染函数
 * @returns 节点
 */
function createCustomComponentVNode(
  component: FrameworkComponent | Promise<FrameworkComponent>,
  langName: string,
  meta: CodeBlockMeta,
  defaultRender: () => FrameworkNode | string
): FrameworkNode {
  const adapter = getAdapter();

  // Promise（动态导入）- 适配器需要处理异步组件
  if (component instanceof Promise) {
    // 对于 Promise 组件，创建一个包装组件
    // 注意：不同框架的异步组件处理方式不同，这里提供一个基础实现
    // 具体框架的适配器可以覆盖此行为
    const fallback = defaultRender();
    const fallbackNode = typeof fallback === 'string' ? adapter.createText(fallback) : fallback;

    // 返回一个占位节点，实际加载由适配器或上层应用处理
    return adapter.createElement('div', {
      'data-async-component': 'true',
      'data-component-key': `${langName}-${uuid()}`
    }, [fallbackNode]);
  }

  // 普通组件
  // 注意：传递 undefined 而不是空数组，避免 Vue 3 的插槽警告
  // 空数组会被当作非函数值传递给默认插槽，导致警告
  return adapter.createElement(component, {
    key: `${langName}-${uuid()}`,
    meta,
    class: 'code-block-transition',
    onRenderFallback: defaultRender
  }, undefined);
}

/**
 * 围栏代码块渲染规则
 *
 * @param tokens - Token 数组
 * @param idx - 当前 Token 索引
 * @param options - 渲染选项
 * @param env - 渲染环境
 * @param renderer - 渲染器实例
 * @returns 节点或 HTML 字符串
 */
export function renderFence(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): FrameworkNode | string {
  const token = tokens[idx];
  const info = token.info ? unescapeAll(token.info).trim() : '';
  const [langName, langAttrs] = parseInfoString(info);

  // 构造元数据
  const meta = createCodeBlockMeta(token, info, langName);

  // 创建默认渲染函数
  const defaultRender = createDefaultRenderFn(token, info, langName, langAttrs, options, renderer);

  // 尝试使用自定义组件
  const customComponent = pluginOptions?.components?.codeBlock?.(meta);

  if (!customComponent) {
    return defaultRender();
  }

  try {
    const resolvedComponent = resolveCustomComponent(customComponent, defaultRender);

    if (!resolvedComponent) {
      return defaultRender();
    }

    return createCustomComponentVNode(resolvedComponent, langName, meta, defaultRender);
  } catch (error) {
    // 使用统一的错误处理
    const fallback = defaultRender();
    const fallbackNode = typeof fallback === 'string' ? getAdapter().createText(fallback) : fallback;
    return handleError(error, 'Custom component render failed', fallbackNode as FrameworkNode);
  }
}

