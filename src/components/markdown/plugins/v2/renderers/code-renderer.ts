/**
 * 代码块渲染器模块
 * @module renderers/code-renderer
 */

import type { VNode } from 'vue';
import { Text, createVNode, defineAsyncComponent } from 'vue';
import { v4 as uuid } from 'uuid';
import type { Token, CodeBlockMeta, RenderOptions, RenderEnv, MarkdownRenderer, AsyncComponentOptions } from '../types';
import { DOM_ATTR_NAME, ASYNC_COMPONENT_CONFIG } from '../constants';
import { escapeHtml, unescapeAll, parseInfoString, mergeClasses, omitAttrs, isComponentOptions } from '../utils';

/** 插件选项缓存 */
let pluginOptions: any = null;

/**
 * 设置插件选项
 */
export function setCodeRendererOptions(options: any): void {
  pluginOptions = options;
}

/**
 * 行内代码渲染规则
 */
export function renderCodeInline(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): VNode {
  const token = tokens[idx];
  const attrs = renderer.renderAttrs(token);
  
  return createVNode('code', attrs, token.content);
}

/**
 * 代码块渲染规则
 */
export function renderCodeBlock(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): VNode {
  const token = tokens[idx];
  const originalAttrs = renderer.renderAttrs(token);
  
  // 分离源码行号属性
  const safeAttrs = omitAttrs(originalAttrs, [
    DOM_ATTR_NAME.SOURCE_LINE_START,
    DOM_ATTR_NAME.SOURCE_LINE_END
  ]);
  
  const preAttrs = {
    [DOM_ATTR_NAME.SOURCE_LINE_START]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_START],
    [DOM_ATTR_NAME.SOURCE_LINE_END]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_END]
  };
  
  return createVNode('pre', preAttrs, [
    createVNode('code', safeAttrs, [
      createVNode(Text, {}, token.content)
    ])
  ]);
}

/**
 * 围栏代码块渲染规则（性能优化版本）
 */
export function renderFence(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): VNode | string {
  const token = tokens[idx];
  const info = token.info ? unescapeAll(token.info).trim() : '';
  const [langName, langAttrs] = parseInfoString(info);
  const content = token.content;
  
  // 构造元数据
  const meta: CodeBlockMeta = {
    langName,
    content,
    attrs: Object.fromEntries(token.attrs || []),
    info,
    token
  };
  
  // 默认渲染函数
  const defaultRender = (): VNode | string => {
    const originalAttrs = renderer.renderAttrs(token);
    const safeAttrs = omitAttrs(originalAttrs, [
      DOM_ATTR_NAME.SOURCE_LINE_START,
      DOM_ATTR_NAME.SOURCE_LINE_END
    ]);
    
    // 代码高亮
    let highlighted: string;
    if (typeof options.highlight === 'function') {
      highlighted = options.highlight(content, langName, langAttrs) || escapeHtml(content);
    } else {
      highlighted = escapeHtml(content);
    }
    
    // 合并 class
    const classList = mergeClasses(
      safeAttrs.class,
      langName ? `${options.langPrefix || ''}${langName}` : undefined
    );
    
    if (classList) {
      safeAttrs.class = classList;
    }
    
    // 如果高亮结果包含 <pre> 标签，直接返回
    if (highlighted.indexOf('<pre') === 0) {
      return `${highlighted}\n`;
    }
    
    return createVNode(
      'pre',
      {
        'data-info': info,
        'data-lang': langName,
        [DOM_ATTR_NAME.SOURCE_LINE_START]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_START],
        [DOM_ATTR_NAME.SOURCE_LINE_END]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_END]
      },
      [
        createVNode(
          'code',
          {
            ...safeAttrs,
            innerHTML: highlighted
          },
          []
        )
      ]
    );
  };
  
  // 尝试使用自定义组件
  const customComponent = pluginOptions?.components?.codeBlock?.(meta);
  
  if (!customComponent) {
    return defaultRender();
  }
  
  try {
    let component: any = null;
    
    // Promise（动态导入）
    if (customComponent instanceof Promise) {
      component = defineAsyncComponent({
        loader: () => customComponent.then(m => m.default || m),
        loadingComponent: createVNode('div', { class: 'loading' }, 'Loading...'),
        delay: ASYNC_COMPONENT_CONFIG.DELAY,
        suspensible: ASYNC_COMPONENT_CONFIG.SUSPENSIBLE,
        timeout: ASYNC_COMPONENT_CONFIG.TIMEOUT,
        onError: () => defaultRender()
      } as AsyncComponentOptions);
    }
    // 组件工厂函数
    else if (typeof customComponent === 'function') {
      component = customComponent;
    }
    // 组件选项对象
    else if (isComponentOptions(customComponent)) {
      component = customComponent;
    }
    
    if (!component) {
      return defaultRender();
    }
    
    return createVNode(component, {
      key: `${langName}-${uuid()}`,
      meta,
      class: 'code-block-transition',
      onRenderFallback: defaultRender
    });
  } catch (error) {
    console.error('[Code Renderer] Custom component render failed:', error);
    return defaultRender();
  }
}

