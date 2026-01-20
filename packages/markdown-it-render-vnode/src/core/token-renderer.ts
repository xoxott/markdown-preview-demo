/**
 * Token 渲染模块
 *
 * @module core/token-renderer
 */

import type { FrameworkNode } from '../adapters/types';
import type { MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import { getAdapter } from '../adapters/manager';
import { createCommentNode, createFragmentNode, validateAttrName, validateAttrValue } from '../utils';
import { renderInlineContent } from './node-helpers';
import { parseRuleResult } from './rule-parser';

/**
 * 渲染 Token 属性（性能优化 + 安全验证）
 *
 * @param token - Token 对象
 * @returns 属性对象
 */
export function renderAttrs(token: Token): Record<string, string> {
  if (!token.attrs || token.attrs.length === 0) {
    return {};
  }

  const result: Record<string, string> = {};

  // 使用 for 循环替代 forEach（性能优化）
  for (let i = 0; i < token.attrs.length; i++) {
    const [name, value] = token.attrs[i];

    // 验证属性名称
    if (!validateAttrName(name)) {
      continue;
    }

    // 验证属性值安全性
    if (!validateAttrValue(name, value)) {
      // 对于不安全的 URL，替换为安全的占位符
      result[name] = '#';
      continue;
    }

    result[name] = value;
  }

  return result;
}

/**
 * 渲染单个 Token（性能优化）
 *
 * @param renderer - 渲染器实例
 * @param tokens - Token 数组
 * @param idx - Token 索引
 * @param options - 渲染选项（当前未使用，保留以符合 MarkdownRenderer 接口）
 * @param env - 渲染环境（当前未使用，保留以符合 MarkdownRenderer 接口）
 * @returns 节点或 null
 */
export function renderToken(
  renderer: MarkdownRenderer,
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
  return adapter.createElement(token.tag, renderAttrs(token), []);
}

/**
 * 渲染单个 Token（辅助函数）
 *
 * @param renderer - 渲染器实例
 * @param tokens - Token 数组
 * @param index - 当前索引
 * @param options - 渲染选项
 * @param env - 渲染环境
 * @returns 节点和父节点
 */
export function renderSingleToken(
  renderer: MarkdownRenderer,
  tokens: Token[],
  index: number,
  options: RenderOptions,
  env: RenderEnv
): { vnode: FrameworkNode | null; parent: FrameworkNode | null } {
  const token = tokens[index];
  const type = token.type;

  if (type === 'inline') {
    return { vnode: renderInlineContent(renderer, token, options, env), parent: null };
  }

  if (renderer.rules[type]) {
    const ruleResult = renderer.rules[type](tokens, index, options, env, renderer);
    return parseRuleResult(ruleResult);
  }

  return { vnode: renderToken(renderer, tokens, index, options, env), parent: null };
}

