/** SessionMemoryCompact — SM文件优先压缩策略 */

import type {
  CompactHostProvider,
  CompactMessage,
  CompactResult,
  SessionMemoryCompactConfig
} from '../types/compact';
import { DEFAULT_SESSION_MEMORY_COMPACT_CONFIG } from '../types/compact';

/**
 * SessionMemoryCompact — 用session memory文件替代LLM摘要
 *
 * 算法：
 *
 * 1. 读取 session memory 文件
 * 2. SM为空/null → 返回null (fallback到autoCompact)
 * 3. 找到 lastSummarizedMessageId 在消息中的位置
 * 4. 计算保留边界: minTokens + minTextBlockMessages + maxTokens
 * 5. 用SM内容替代被折叠的消息段
 * 6. 如果折叠后token仍超threshold → 返回null
 */
export class SessionMemoryCompact {
  private readonly config: SessionMemoryCompactConfig;

  constructor(config?: Partial<SessionMemoryCompactConfig>) {
    this.config = { ...DEFAULT_SESSION_MEMORY_COMPACT_CONFIG, ...config };
  }

  /** 执行session memory压缩 */
  async compact(
    messages: CompactMessage[],
    hostProvider: CompactHostProvider
  ): Promise<CompactResult> {
    // 1. 读取SM文件
    const smContent = await hostProvider.readSessionMemory();
    if (!smContent || smContent.trim() === '') {
      return { wasCompacted: false }; // fallback到LLM摘要
    }

    // 2. 找到lastSummarizedMessageId
    const lastSummarizedId = hostProvider.getLastSummarizedMessageId();
    if (!lastSummarizedId) {
      return { wasCompacted: false }; // 无boundary，fallback
    }

    const lastSummarizedIndex = messages.findIndex(m => m.id === lastSummarizedId);
    if (lastSummarizedIndex === -1) {
      return { wasCompacted: false }; // ID不在当前消息中
    }

    // 3. 计算保留边界
    const keepIndex = this.calculateKeepBoundary(messages, lastSummarizedIndex, hostProvider);
    if (keepIndex === null) {
      return { wasCompacted: false };
    }

    // 4. 替换折叠段为SM内容
    const preCompactTokenCount = hostProvider.estimateTokens(messages.map(m => m.content).join(''));

    const summaryMessage: CompactMessage = {
      role: 'system',
      content: `This session is being continued from a previous conversation.\n\n${smContent}`,
      id: `sm_compact_boundary_${Date.now()}`
    };

    const messagesToKeep = messages.slice(keepIndex);
    const compactedMessages = [summaryMessage, ...messagesToKeep];

    const postCompactTokenCount = hostProvider.estimateTokens(
      compactedMessages.map(m => m.content).join('')
    );

    // 5. 如果折叠后仍超threshold → 返回null
    const maxTokens = hostProvider.getMaxTokens();
    if (postCompactTokenCount >= maxTokens * 0.95) {
      return { wasCompacted: false };
    }

    return {
      wasCompacted: true,
      strategy: 'session_memory',
      preCompactTokenCount,
      postCompactTokenCount,
      summary: smContent,
      boundaryMessageId: summaryMessage.id
    };
  }

  /** 计算保留边界 */
  private calculateKeepBoundary(
    messages: CompactMessage[],
    lastSummarizedIndex: number,
    hostProvider: CompactHostProvider
  ): number | null {
    // 从lastSummarizedIndex+1开始扩展，直到满足minTokens和minTextBlockMessages
    let keepIndex = lastSummarizedIndex + 1;
    let tokenCount = 0;
    let textBlockMessages = 0;

    // 向前扩展以满足最小要求
    while (keepIndex > 0) {
      const prevMessage = messages[keepIndex - 1];
      tokenCount += hostProvider.estimateTokens(prevMessage.content);

      if (prevMessage.role === 'user' || prevMessage.role === 'assistant') {
        textBlockMessages++;
      }

      // 检查是否达到最大token限制
      if (tokenCount >= this.config.maxTokens) {
        break;
      }

      // 检查是否满足最小要求
      if (
        tokenCount >= this.config.minTokens &&
        textBlockMessages >= this.config.minTextBlockMessages
      ) {
        break;
      }

      keepIndex--;
    }

    // 如果无法满足最小要求
    if (tokenCount < this.config.minTokens && keepIndex > 0) {
      // 尽量保留更多
      return Math.max(0, keepIndex);
    }

    return keepIndex;
  }
}
