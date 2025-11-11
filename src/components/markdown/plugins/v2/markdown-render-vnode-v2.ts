/**
 * Markdown 渲染 VNode 插件 V2（性能优化版本）
 * @module markdown-render-vnode-v2
 */

import type MarkdownIt from 'markdown-it';
import type { VNode } from 'vue';
import { Fragment, createVNode } from 'vue';
import { PERFORMANCE_CONFIG } from './constants';
import { defaultRenderRules, setCodeRendererOptions } from './renderers';
import { processToken } from './token-processor';
import type {
  MarkdownRenderer,
  RenderEnv,
  RenderOptions,
  Token,
  VueMarkdownPluginOptions
} from './types';
import { createCommentNode, createFragmentNode, createHtmlVNode, validateAttrName } from './utils';

/** VNode 缓存 */
const vnodeCache = new Map<string, VNode>();

/**
 * 清理过期缓存
 */
function cleanCache(): void {
  if (vnodeCache.size > PERFORMANCE_CONFIG.CACHE_MAX_SIZE) {
    const keys = Array.from(vnodeCache.keys());
    const toDelete = keys.slice(0, Math.floor(keys.length / 2));
    toDelete.forEach(key => vnodeCache.delete(key));
  }
}

/**
 * 渲染 Token 属性（性能优化）
 */
function renderAttrs(this: MarkdownRenderer, token: Token): Record<string, any> {
  if (!token.attrs || token.attrs.length === 0) {
    return {};
  }

  const result: Record<string, any> = {};

  // 使用 for 循环替代 forEach（性能优化）
  for (let i = 0; i < token.attrs.length; i++) {
    const [name, value] = token.attrs[i];
    if (validateAttrName(name)) {
      result[name] = value;
    }
  }

  return result;
}

/**
 * 渲染单个 Token（性能优化）
 */
function renderToken(
  this: MarkdownRenderer,
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv
): VNode | null {
  const token = tokens[idx];

  // 闭合标签，不渲染
  if (token.nesting === -1) {
    return null;
  }

  // 隐藏的 Token（tight list paragraphs）
  if (token.hidden) {
    return createFragmentNode([]);
  }

  // 注释节点
  if (token.tag === '--') {
    return createCommentNode();
  }

  // 普通标签
  return createVNode(token.tag, this.renderAttrs(token), []);
}

/**
 * 渲染 Token 数组（核心渲染逻辑，性能优化）
 */
function render(
  this: MarkdownRenderer,
  tokens: Token[],
  options: RenderOptions,
  env: RenderEnv
): VNode[] {
  const rules = this.rules;
  const vNodeParents: VNode[] = [];
  const results: VNode[] = [];

  // 预处理所有 tokens（批量处理，减少函数调用）
  for (let i = 0; i < tokens.length; i++) {
    processToken(tokens[i], env);
  }

  // 主渲染循环
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const type = token.type;

    let vnode: VNode | null = null;
    let parent: VNode | null = null;

    // 内联内容
    if (type === 'inline') {
      const children = this.render(token.children || [], options, env);
      vnode = createFragmentNode(children);
    }
    // 自定义规则
    else if (rules[type]) {
      const result = rules[type](tokens, i, options, env, this);

      if (typeof result === 'string') {
        vnode = createHtmlVNode(result);
      } else if (result && typeof result === 'object' && 'node' in result && 'parent' in result) {
        parent = (result as any).parent;
        vnode = (result as any).node;
      } else {
        vnode = result as VNode;
      }
    }
    // 默认渲染
    else {
      vnode = this.renderToken(tokens, i, options, env);
    }

    // 处理父子关系
    let isChild = false;
    const parentNode = vNodeParents.length > 0 ? vNodeParents[vNodeParents.length - 1] : null;

    if (vnode && parentNode) {
      if (typeof parentNode.type === 'string' || parentNode.type === Fragment) {
        const children = Array.isArray(parentNode.children) ? parentNode.children : [];
        parentNode.children = children.concat([vnode]);
      }
      isChild = true;
    }

    // 更新父节点栈
    if (token.nesting === 1) {
      vNodeParents.push(parent || vnode!);
    } else if (token.nesting === -1) {
      vNodeParents.pop();
    }

    // 收集根节点
    if (!isChild && vnode) {
      results.push(vnode);
    }
  }

  return results;
}

/**
 * Markdown VNode 插件 V2
 */
const MarkdownVuePluginV2 = (md: MarkdownIt, options: VueMarkdownPluginOptions = {}): void => {
  // 设置代码渲染器选项
  setCodeRendererOptions(options);

  // 应用渲染规则
  Object.assign(md.renderer.rules, defaultRenderRules);

  // 覆盖渲染方法
  md.renderer.render = render as any;
  md.renderer.renderInline = render as any;
  md.renderer.renderAttrs = renderAttrs as any;
  md.renderer.renderToken = renderToken as any;

  // 性能监控（开发模式）
  if (process.env.NODE_ENV === 'development') {
    const originalRender: any = md.renderer.render;
    (md.renderer.render as any) = function(this: any, tokens: any, options: any, env: any): any {
      const start = performance.now();
      const result = originalRender.call(this, tokens, options, env);
      const duration = performance.now() - start;
      if (duration > 50) {
        console.warn(`[Markdown Renderer V2] Slow render detected: ${duration.toFixed(2)}ms`);
      }
      return result;
    };
  }

  // 清理缓存（定期执行）
  if (PERFORMANCE_CONFIG.ENABLE_VNODE_CACHE) {
    setInterval(cleanCache, 60000); // 每分钟清理一次
  }
};

export default MarkdownVuePluginV2;

// 导出类型和工具
export type {
  CodeBlockMeta, MarkdownRenderer, RenderEnv, RenderOptions, Token, VueMarkdownPluginOptions
} from './types';

export * from './constants';
export { defaultRenderRules } from './renderers';
export * from './utils';

