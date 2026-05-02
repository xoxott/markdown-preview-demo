/** MicroCompactStrategy — per-turn轻量压缩 */

import type {
  CompactHostProvider,
  CompactMessage,
  CompactResult,
  MicroCompactConfig
} from '../types/compact';
import { DEFAULT_MICRO_COMPACT_CONFIG } from '../types/compact';

const CLEARED_MESSAGE = '[Old tool result content cleared]';

/**
 * MicroCompactStrategy — 每轮轻量压缩
 *
 * 算法：
 *
 * 1. 检查时间间隔: (now - lastAssistantTimestamp) >= gapThresholdMinutes
 * 2. 收集 compactable tool results
 * 3. 保留最近 keepRecent 个，其余替换为 CLEARED_MESSAGE
 * 4. 返回修改后的 messages
 */
export class MicroCompactStrategy {
  private readonly config: MicroCompactConfig;
  private lastAssistantTimestamp: number | null = null;

  constructor(config?: Partial<MicroCompactConfig>) {
    this.config = { ...DEFAULT_MICRO_COMPACT_CONFIG, ...config };
  }

  /** 执行micro压缩 */
  async compact(
    messages: CompactMessage[],
    hostProvider: CompactHostProvider
  ): Promise<CompactResult> {
    if (!this.config.enabled) {
      return { wasCompacted: false };
    }

    // 找到最后一条assistant消息的时间
    const lastAssistant = this.findLastAssistantTimestamp(messages);
    if (lastAssistant === null) {
      return { wasCompacted: false };
    }

    // 检查时间间隔
    const gapMinutes = (Date.now() - lastAssistant) / 60000;
    if (gapMinutes < this.config.gapThresholdMinutes) {
      return { wasCompacted: false };
    }

    // 收集可压缩的tool结果
    const toolResults = this.findCompactableToolResults(messages);
    if (toolResults.length <= this.config.keepRecent) {
      return { wasCompacted: false }; // 不需要压缩
    }

    // 替换旧的tool结果内容
    const preCompactTokenCount = hostProvider.estimateTokens(messages.map(m => m.content).join(''));

    const messagesToKeep = this.config.keepRecent;
    const clearedCount = toolResults.length - messagesToKeep;

    const compactedMessages = messages.map(m => {
      if (m.isToolUse && this.config.compactableTools.includes(m.toolName ?? '')) {
        const toolIndex = toolResults.indexOf(m);
        if (toolIndex !== -1 && toolIndex < clearedCount) {
          return { ...m, content: CLEARED_MESSAGE };
        }
      }
      return m;
    });

    const postCompactTokenCount = hostProvider.estimateTokens(
      compactedMessages.map(m => m.content).join('')
    );

    this.lastAssistantTimestamp = lastAssistant;

    return {
      wasCompacted: true,
      strategy: 'micro',
      preCompactTokenCount,
      postCompactTokenCount
    };
  }

  /** 找到最后assistant消息的时间戳 */
  private findLastAssistantTimestamp(messages: CompactMessage[]): number | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].timestamp) {
        return messages[i].timestamp!;
      }
    }
    return this.lastAssistantTimestamp;
  }

  /** 找到所有可压缩的tool结果消息 */
  private findCompactableToolResults(messages: CompactMessage[]): CompactMessage[] {
    return messages.filter(
      m => m.isToolUse && this.config.compactableTools.includes(m.toolName ?? '')
    );
  }

  /** 重置状态 */
  resetState(): void {
    this.lastAssistantTimestamp = null;
  }
}
