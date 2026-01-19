/**
 * 全量渲染模块
 *
 * @module core/full-render
 */

import type { FrameworkNode } from '../adapters/types';
import type { MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import { setCurrentRenderer } from '../adapters/manager';
import { preprocessTokens } from '../token-processor';
import { addChildToParent, renderInlineContent } from './node-helpers';
import { parseRuleResult } from './rule-parser';

/**
 * 渲染 Token 数组（核心渲染逻辑，性能优化）
 *
 * @param renderer - 渲染器实例
 * @param tokens - Token 数组
 * @param options - 渲染选项
 * @param env - 渲染环境
 * @returns 节点数组
 */
export function render(
  renderer: MarkdownRenderer,
  tokens: Token[],
  options: RenderOptions,
  env: RenderEnv
): FrameworkNode[] {
  // 设置当前渲染上下文（确保嵌套调用能访问适配器）
  setCurrentRenderer(renderer);
  const rules = renderer.rules;
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
      vnode = renderInlineContent(renderer, token, options, env);
    }
    // 自定义规则
    else if (rules[type]) {
      const ruleResult = rules[type](tokens, i, options, env, renderer);
      const parsed = parseRuleResult(ruleResult);
      vnode = parsed.vnode;
      parent = parsed.parent;
    }
    // 默认渲染
    else {
      vnode = renderer.renderToken(tokens, i, options, env);
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

