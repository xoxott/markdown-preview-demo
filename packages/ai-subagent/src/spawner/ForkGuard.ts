/** ForkGuard — Fork 递归防护标记 + 深度检测 + 标签注入 */

import type { AgentMessage, AssistantMessage } from '@suga/ai-agent-loop';

/**
 * Fork 递归防护标记 — 注入到 fork 子代理的 system prompt 中
 *
 * 参考 Claude Code 的 <fork-boilerplate> 标签:
 *
 * - 所有 fork 子代理的 system prompt 包含此标记
 * - isInForkChild 检测消息历史中是否有此标记
 * - 防止 fork 嵌套（子代理不能再 fork）
 */
export const FORK_BOILERPLATE = '<fork-boilerplate>';

/**
 * 检测当前是否在 fork child 中
 *
 * 扫描消息历史中的 assistant 消息，检查 content 是否包含 `<fork-boilerplate>` 标签。 如果发现标签，说明当前 AgentLoop 是一个 fork
 * 子代理，不应再 spawn fork。
 *
 * @param messages 消息历史
 * @returns 是否在 fork child 中
 */
export function isInForkChild(messages: readonly AgentMessage[]): boolean {
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const content = (msg as AssistantMessage).content;
      if (typeof content === 'string' && content.includes(FORK_BOILERPLATE)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 计算当前 fork 嵌套深度
 *
 * 深度 = 消息历史中包含 `<fork-boilerplate>` 的 assistant 消息数量。 深度 0 = 在父 AgentLoop 中（无 fork 标签）。 深度 1 = 在一级
 * fork child 中。 深度 2 = 在二级嵌套 fork child 中（不允许）。
 *
 * @param messages 消息历史
 * @returns fork 嵌套深度
 */
export function getForkDepth(messages: readonly AgentMessage[]): number {
  let depth = 0;
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const content = (msg as AssistantMessage).content;
      if (typeof content === 'string' && content.includes(FORK_BOILERPLATE)) {
        depth++;
      }
    }
  }
  return depth;
}

/**
 * 在 system prompt 前注入 fork 标记
 *
 * 如果原始 system prompt 已包含 `<fork-boilerplate>`，则不再重复注入。
 *
 * @param systemPrompt 原始 system prompt
 * @returns 注入标记后的 system prompt
 */
export function injectForkBoilerplate(systemPrompt: string): string {
  if (systemPrompt.includes(FORK_BOILERPLATE)) {
    return systemPrompt; // 已包含标记，不再重复
  }

  return `${FORK_BOILERPLATE}\n\n${systemPrompt}`;
}
