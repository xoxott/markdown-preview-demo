/**
 * 核心渲染器模块
 *
 * @module core/renderer
 */

import type {
  MarkdownRenderer,
  RenderEnv,
  RenderOptions,
  Token
} from '../types';
import type { FrameworkNode } from '../adapters/types';
import { getAdapter } from '../adapters/manager';
import { preprocessTokens } from '../token-processor';
import {
  createCommentNode,
  createFragmentNode,
  createHtmlVNode,
  validateAttrName
} from '../utils';

/**
 * 规则渲染结果类型
 */
export interface RuleRenderResult {
  node?: FrameworkNode;
  parent?: FrameworkNode;
}

/**
 * 解析规则渲染结果
 *
 * @param result - 规则函数返回的结果
 * @returns 节点和可选的父节点
 */
export function parseRuleResult(
  result: FrameworkNode | FrameworkNode[] | string | RuleRenderResult | null
): { vnode: FrameworkNode | null; parent: FrameworkNode | null } {
  if (!result) {
    return { vnode: null, parent: null };
  }

  // 字符串结果，转换为 HTML 节点
  if (typeof result === 'string') {
    return { vnode: createHtmlVNode(result), parent: null };
  }

  // 包含 node 和 parent 的对象
  if (typeof result === 'object' && 'node' in result && 'parent' in result) {
    const ruleResult = result as RuleRenderResult;
    return {
      vnode: ruleResult.node || null,
      parent: ruleResult.parent || null
    };
  }

  // 节点或节点数组
  if (Array.isArray(result)) {
    return { vnode: createFragmentNode(result), parent: null };
  }

  return { vnode: result as FrameworkNode, parent: null };
}

/**
 * 将节点添加到父节点（性能优化：使用适配器方法）
 *
 * @param parentNode - 父节点
 * @param childNode - 子节点
 * @returns 是否成功添加
 */
export function addChildToParent(parentNode: FrameworkNode, childNode: FrameworkNode): boolean {
  const adapter = getAdapter();

  // 检查是否有 setChildren 方法
  if (adapter.setChildren) {
    const children = adapter.getChildren ? adapter.getChildren(parentNode) : [];
    children.push(childNode);
    adapter.setChildren(parentNode, children);
    return true;
  }

  // 如果没有 setChildren，尝试检查是否为片段节点
  if (adapter.isFragment && adapter.isFragment(parentNode)) {
    const children = adapter.getChildren ? adapter.getChildren(parentNode) : [];
    children.push(childNode);
    // 重新创建片段（如果适配器不支持直接修改）
    return true;
  }

  return false;
}

/**
 * 渲染内联内容
 *
 * @param renderer - 渲染器实例
 * @param token - Token 对象
 * @param options - 渲染选项
 * @param env - 渲染环境
 * @returns 节点
 */
export function renderInlineContent(
  renderer: MarkdownRenderer,
  token: Token,
  options: RenderOptions,
  env: RenderEnv
): FrameworkNode {
  const children = renderer.render(token.children || [], options, env);
  return createFragmentNode(children);
}

/**
 * 渲染 Token 属性（性能优化）
 *
 * @param token - Token 对象
 * @returns 属性对象
 */
export function renderAttrs(this: MarkdownRenderer, token: Token): Record<string, string> {
  if (!token.attrs || token.attrs.length === 0) {
    return {};
  }

  const result: Record<string, string> = {};

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
 *
 * @param tokens - Token 数组
 * @param idx - Token 索引
 * @param options - 渲染选项（当前未使用，保留以符合 MarkdownRenderer 接口）
 * @param env - 渲染环境（当前未使用，保留以符合 MarkdownRenderer 接口）
 * @returns 节点或 null
 */
export function renderToken(
  this: MarkdownRenderer,
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv
): FrameworkNode | null {
  const token = tokens[idx];
  const adapter = getAdapter();

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
  // 注意：options 和 env 参数保留以符合接口规范，未来可用于：
  // - 根据 options 调整渲染行为（如自定义属性处理）
  // - 根据 env.safeMode 进行安全过滤
  return adapter.createElement(token.tag, this.renderAttrs(token), []);
}

/**
 * 渲染 Token 数组（核心渲染逻辑，性能优化）
 *
 * @param tokens - Token 数组
 * @param options - 渲染选项
 * @param env - 渲染环境
 * @returns 节点数组
 */
export function render(this: MarkdownRenderer, tokens: Token[], options: RenderOptions, env: RenderEnv): FrameworkNode[] {
  const rules = this.rules;
  const vNodeParents: FrameworkNode[] = [];
  const results: FrameworkNode[] = [];

  // 预处理所有 tokens（批量处理，减少函数调用）
  preprocessTokens(tokens, env);

  // 主渲染循环
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const type = token.type;

    let vnode: FrameworkNode | null = null;
    let parent: FrameworkNode | null = null;

    // 内联内容
    if (type === 'inline') {
      vnode = renderInlineContent(this, token, options, env);
    }
    // 自定义规则
    else if (rules[type]) {
      const ruleResult = rules[type](tokens, i, options, env, this);
      const parsed = parseRuleResult(ruleResult);
      vnode = parsed.vnode;
      parent = parsed.parent;
    }
    // 默认渲染
    else {
      vnode = this.renderToken(tokens, i, options, env);
    }

    // 处理父子关系
    const parentNode = vNodeParents.length > 0 ? vNodeParents[vNodeParents.length - 1] : null;
    const isChild = vnode && parentNode ? addChildToParent(parentNode, vnode) : false;

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

