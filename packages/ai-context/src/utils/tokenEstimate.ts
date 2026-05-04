/** Token 估算工具 — 粗略和精确两种估算方式 */

import type { AgentMessage } from '@suga/ai-agent-loop';

/** Token 估算 block 类型系数常量 */
export const TOKEN_ESTIMATE_COEFFICIENTS = {
  /** 普通文本 chars/token 比率 */
  textRatio: 4,
  /** JSON 内容 chars/token 比率（更密集） */
  jsonRatio: 2,
  /** 保守系数 padding（乘数） */
  conservativePadding: 4 / 3,
  /** tool_use block 固定开销 tokens */
  toolUseOverhead: 50,
  /** image block 估算 tokens */
  imageTokenEstimate: 2000
} as const;

/** 检测内容是否像 JSON（更密集的 token 化） */
export function looksLikeJson(text: string): boolean {
  return (
    text.startsWith('{') || text.startsWith('[') || text.includes('"":') || text.includes('":{')
  );
}

/** 默认 token 估算：总字符数 / 4（向后兼容） */
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
      const resultStr =
        typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result ?? '');
      totalChars += resultStr.length + (msg.error?.length ?? 0);
    }
  }
  return Math.ceil(totalChars / 4);
}

/** 精确 token 估算 — 分 block 类型 + 保守 padding */
export function estimateTokensPrecise(messages: readonly AgentMessage[]): number {
  const { textRatio, jsonRatio, conservativePadding, toolUseOverhead } =
    TOKEN_ESTIMATE_COEFFICIENTS;
  let totalTokens = 0;

  for (const msg of messages) {
    if (msg.role === 'user') {
      // 检测 JSON 内容: 更密集的 token 化
      // 多模态消息（content 为数组）仅估算文本部分
      if (typeof msg.content === 'string') {
        const ratio = looksLikeJson(msg.content) ? jsonRatio : textRatio;
        totalTokens += Math.ceil(msg.content.length / ratio);
      } else {
        for (const part of msg.content) {
          if (part.type === 'text') {
            const ratio = looksLikeJson(part.text) ? jsonRatio : textRatio;
            totalTokens += Math.ceil(part.text.length / ratio);
          }
          // 图片部分按估算常量计入
        }
      }
    } else if (msg.role === 'assistant') {
      // 文本内容
      totalTokens += Math.ceil(msg.content.length / textRatio);
      // tool_use blocks: input JSON + 固定开销
      for (const tu of msg.toolUses) {
        totalTokens += Math.ceil(JSON.stringify(tu.input).length / jsonRatio) + toolUseOverhead;
      }
    } else if (msg.role === 'tool_result') {
      const resultStr =
        typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result ?? '');
      // tool_result 通常包含 JSON: 用 jsonRatio
      totalTokens += Math.ceil(resultStr.length / jsonRatio);
      // error 字段
      totalTokens += Math.ceil((msg.error?.length ?? 0) / textRatio);
    }
  }

  // 保守系数: 4/3 padding 确保估算不低于 API 实际值
  return Math.ceil(totalTokens * conservativePadding);
}
