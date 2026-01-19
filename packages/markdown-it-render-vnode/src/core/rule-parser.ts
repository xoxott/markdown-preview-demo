/**
 * 渲染规则解析模块
 *
 * @module core/rule-parser
 */

import type { FrameworkNode } from '../adapters/types';
import { createFragmentNode, createHtmlVNode } from '../utils';

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

