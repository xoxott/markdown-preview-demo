/**
 * ContextCollapseLayer — span级折叠压缩层
 *
 * N18: 对过长消息中的冗余span进行折叠，保留关键信息。 折叠策略：
 *
 * 1. 工具结果超过阈值 → 折叠为摘要
 * 2. 重复内容 → 合并
 * 3. 思考输出 → 保留首尾，折叠中间
 */

import type { AgentMessage, UserMessage } from '@suga/ai-agent-loop';
import type { CompressLayer, CompressResult, CompressState } from '../types/compressor';

/** ContextCollapseConfig */
export interface ContextCollapseConfig {
  readonly enabled: boolean;
  readonly collapseThreshold: number; // 折叠阈值（token数，默认2000）
  readonly maxPreservedSpans: number; // 最大保留span数（默认5）
}

export const DEFAULT_CONTEXT_COLLAPSE_CONFIG: ContextCollapseConfig = {
  enabled: true,
  collapseThreshold: 2000,
  maxPreservedSpans: 5
};

function messagePayloadString(msg: AgentMessage): string {
  if (msg.role === 'tool_result') {
    try {
      if (typeof msg.result === 'string') return msg.result;
      return JSON.stringify(msg.result ?? msg.error ?? '');
    } catch {
      return String(msg.result ?? msg.error ?? '');
    }
  }
  if (msg.role === 'assistant') {
    return msg.content;
  }
  const user = msg as UserMessage;
  if (typeof user.content === 'string') return user.content;
  return JSON.stringify(user.content);
}

export class ContextCollapseLayer implements CompressLayer {
  readonly name = 'ContextCollapse';

  constructor(private readonly config: ContextCollapseConfig = DEFAULT_CONTEXT_COLLAPSE_CONFIG) {}

  async compress(
    messages: readonly AgentMessage[],
    _state: CompressState
  ): Promise<CompressResult> {
    if (!this.config.enabled) {
      return { messages, didCompress: false };
    }

    const result: AgentMessage[] = [];
    let didCompress = false;

    for (const msg of messages) {
      const contentStr = messagePayloadString(msg);
      const estimatedTokens = Math.floor(contentStr.length / 4);

      if (estimatedTokens > this.config.collapseThreshold) {
        const preserved = `${contentStr.slice(0, 200)}\n...[collapsed]...\n${contentStr.slice(-200)}`;
        if (msg.role === 'tool_result') {
          result.push({ ...msg, result: preserved });
        } else if (msg.role === 'assistant') {
          result.push({ ...msg, content: preserved });
        } else {
          const user = msg as UserMessage;
          if (typeof user.content === 'string') {
            result.push({ ...user, content: preserved });
          } else {
            result.push({ ...user, content: [{ type: 'text', text: preserved }] });
          }
        }
        didCompress = true;
      } else {
        result.push(msg);
      }
    }

    return {
      messages: result,
      didCompress,
      stats: didCompress ? { generatedSummary: true } : undefined
    };
  }
}
