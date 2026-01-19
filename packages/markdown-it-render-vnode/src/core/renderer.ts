/**
 * 核心渲染器模块（统一导出接口）
 *
 * @module core/renderer
 * @description 此模块作为核心渲染功能的统一入口，将各功能模块组装并导出
 */

import type { FrameworkNode } from '../adapters/types';
import type { MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import { render as fullRender } from './full-render';
import { renderAttrs as renderTokenAttrs, renderToken as renderSingleTokenFunc } from './token-renderer';

/**
 * 渲染 Token 数组（全量渲染）
 *
 * @param tokens - Token 数组
 * @param options - 渲染选项
 * @param env - 渲染环境
 * @returns 节点数组
 */
export function render(this: MarkdownRenderer, tokens: Token[], options: RenderOptions, env: RenderEnv): FrameworkNode[] {
  return fullRender(this, tokens, options, env);
}

/**
 * 渲染 Token 属性
 *
 * @param token - Token 对象
 * @returns 属性对象
 */
export function renderAttrs(this: MarkdownRenderer, token: Token): Record<string, string> {
  return renderTokenAttrs(token);
}

/**
 * 渲染单个 Token
 *
 * @param tokens - Token 数组
 * @param idx - Token 索引
 * @param options - 渲染选项
 * @param env - 渲染环境
 * @returns 节点或 null
 */
export function renderToken(
  this: MarkdownRenderer,
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv
): FrameworkNode | null {
  return renderSingleTokenFunc(this, tokens, idx, options, env);
}

// 导出子模块的类型和工具函数
export type { RuleRenderResult } from './rule-parser';
export { parseRuleResult } from './rule-parser';
export { addChildToParent, renderInlineContent } from './node-helpers';
export { renderSingleToken } from './token-renderer';

