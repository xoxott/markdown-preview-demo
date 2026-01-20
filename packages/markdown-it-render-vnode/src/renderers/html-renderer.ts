/**
 * HTML 渲染器模块
 *
 * @module renderers/html-renderer
 */

import type { FrameworkNode } from '../adapters/types';
import type { MarkdownRenderer, RenderEnv, RenderOptions, Token } from '../types';
import { createHtmlVNode } from '../utils';

/** 扩展的 Token 类型（包含 contentVNode） */
interface ExtendedToken extends Token {
  contentVNode?: FrameworkNode;
}

/** HTML 块和行内渲染规则（合并重复逻辑） */
export function renderHtml(
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv,
  renderer: MarkdownRenderer
): FrameworkNode {
  const token = tokens[idx] as ExtendedToken;

  // 如果 Token 已有 contentVNode，直接返回
  if (token.contentVNode) {
    return token.contentVNode;
  }

  // 从环境变量获取安全模式配置（默认启用）
  const safeMode = env.safeMode !== false;

  // 创建 HTML 节点并应用安全过滤
  return createHtmlVNode(token.content, safeMode);
}

