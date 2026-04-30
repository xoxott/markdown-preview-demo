/** 简易 token 估算 — 字符数 / 4（粗略但足够用于阈值判断） */

import type { AgentMessage } from '@suga/ai-agent-loop';

/** 默认 token 估算：总字符数 / 4 */
export function estimateTokens(messages: readonly AgentMessage[]): number {
  let totalChars = 0;
  for (const msg of messages) {
    if (msg.role === 'user') {
      totalChars += msg.content.length;
    } else if (msg.role === 'assistant') {
      totalChars += msg.content.length;
      for (const tu of msg.toolUses) {
        totalChars += JSON.stringify(tu.input).length;
      }
    } else if (msg.role === 'tool_result') {
      const resultStr = typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result ?? '');
      totalChars += resultStr.length + (msg.error?.length ?? 0);
    }
  }
  return Math.ceil(totalChars / 4);
}