/**
 * APIMicrocompactLayer — API端 context management 策略
 *
 * N19: 清除指定类型的消息块以节省 token：
 *
 * - clear_tool_uses: 清除工具调用（保留结果）
 * - clear_tool_results: 清除工具结果（保留调用）
 * - clear_thinking: 清除 thinking 块
 */

import type { AgentMessage } from '@suga/ai-agent-loop';
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
      let modified = false;
      let newContent: any = msg.content;

      // 处理字符串内容
      if (typeof msg.content === 'string') {
        // clear_tool_results: tool role messages → collapse
        if (this.config.strategies.includes('clear_tool_results') && (msg as any).role === 'tool') {
          newContent = '[tool result collapsed]';
          replacedToolResults++;
          modified = true;
        }
      }

      // 处理数组内容（assistant messages with blocks）
      if (Array.isArray(msg.content)) {
        let blocks = [...(msg.content as any[])];

        if (this.config.strategies.includes('clear_tool_uses')) {
          const filtered = blocks.filter((b: any) => b.type !== 'tool_use');
          if (filtered.length < blocks.length) {
            blocks = filtered;
            modified = true;
          }
        }

        if (this.config.strategies.includes('clear_thinking')) {
          const filtered = blocks.filter((b: any) => b.type !== 'thinking');
          if (filtered.length < blocks.length) {
            blocks = filtered;
            modified = true;
          }
        }

        if (modified) newContent = blocks;
      }

      result.push(modified ? ({ ...msg, content: newContent } as AgentMessage) : msg);
    }

    const didCompress = replacedToolResults > 0 || result.some((m, i) => m !== messages[i]);

    return {
      messages: result,
      didCompress,
      stats: didCompress ? { replacedToolResults, generatedSummary: false } : undefined
    };
  }
}
