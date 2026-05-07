/**
 * APIMicrocompactLayer — API端 context management 策略
 *
 * N19: 清除指定类型的消息块以节省 token：
 *
 * - clear_tool_uses: 清除工具调用（保留结果）
 * - clear_tool_results: 清除工具结果（保留调用）
 * - clear_thinking: 清除 thinking 块
 */

import type { AgentMessage, UserMessage } from '@suga/ai-agent-loop';
import type { CompressLayer, CompressResult, CompressState } from '../types/compressor';

/** APIMicrocompactConfig */
export interface APIMicrocompactConfig {
  readonly enabled: boolean;
  readonly strategies: readonly ('clear_tool_uses' | 'clear_tool_results' | 'clear_thinking')[];
}

export const DEFAULT_API_MICROCOMPACT_CONFIG: APIMicrocompactConfig = {
  enabled: true,
  strategies: ['clear_tool_results', 'clear_thinking']
};

export class APIMicrocompactLayer implements CompressLayer {
  readonly name = 'APIMicrocompact';

  constructor(private readonly config: APIMicrocompactConfig = DEFAULT_API_MICROCOMPACT_CONFIG) {}

  async compress(
    messages: readonly AgentMessage[],
    _state: CompressState
  ): Promise<CompressResult> {
    if (!this.config.enabled) {
      return { messages, didCompress: false };
    }

    const result: AgentMessage[] = [];
    let replacedToolResults = 0;

    for (const msg of messages) {
      if (msg.role === 'tool_result') {
        if (this.config.strategies.includes('clear_tool_results')) {
          result.push({ ...msg, result: '[tool result collapsed]' });
          replacedToolResults += 1;
        } else {
          result.push(msg);
        }
        continue;
      }

      if (msg.role === 'assistant') {
        const stripUses =
          this.config.strategies.includes('clear_tool_uses') && msg.toolUses.length > 0;
        if (stripUses) {
          result.push({ ...msg, toolUses: [] });
        } else {
          result.push(msg);
        }
        continue;
      }

      // user
      const userMsg = msg as UserMessage;
      if (typeof userMsg.content === 'string') {
        result.push(userMsg);
        continue;
      }

      const parts = [...userMsg.content];
      let modified = false;
      if (this.config.strategies.includes('clear_tool_uses')) {
        const filtered = parts.filter(p => (p as { type?: string }).type !== 'tool_use');
        if (filtered.length < parts.length) {
          modified = true;
          parts.length = 0;
          parts.push(...filtered);
        }
      }
      if (this.config.strategies.includes('clear_thinking')) {
        const filtered = parts.filter(p => (p as { type?: string }).type !== 'thinking');
        if (filtered.length < parts.length) {
          modified = true;
          parts.length = 0;
          parts.push(...filtered);
        }
      }
      result.push(modified ? ({ ...userMsg, content: parts } as AgentMessage) : userMsg);
    }

    const didCompress = replacedToolResults > 0 || result.some((m, i) => m !== messages[i]);

    return {
      messages: result,
      didCompress,
      stats: didCompress ? { replacedToolResults, generatedSummary: false } : undefined
    };
  }
}
