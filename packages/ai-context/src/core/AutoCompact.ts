/** AutoCompact — token 达阈值时 LLM 摘要压缩 + 熔断器 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressLayer, CompressState, CompressResult } from '../types/compressor';
import type { AutoCompactConfig } from '../types/config';
import type { CallModelForSummary } from '../types/injection';
import type { SummarySections } from '../types/messages';
import {
  DEFAULT_AUTO_COMPACT_THRESHOLD_RATIO,
  DEFAULT_AUTO_COMPACT_MAX_FAILURES,
  DEFAULT_AUTO_COMPACT_MESSAGES_TO_KEEP
} from '../constants';
import { estimateTokens } from '../utils/tokenEstimate';
import { createSummaryMessage } from '../utils/messageHelpers';

/** AutoCompact 压缩层 */
export class AutoCompactLayer implements CompressLayer {
  readonly name = 'AutoCompact';
  private readonly thresholdRatio: number;
  private readonly maxConsecutiveFailures: number;
  private readonly messagesToKeep: number;
  private readonly summarySections?: SummarySections;
  private readonly callModelForSummary?: CallModelForSummary;

  constructor(
    config?: AutoCompactConfig,
    callModelForSummary?: CallModelForSummary,
    tokenEstimator?: (messages: readonly AgentMessage[]) => number
  ) {
    this.thresholdRatio = config?.thresholdRatio ?? DEFAULT_AUTO_COMPACT_THRESHOLD_RATIO;
    this.maxConsecutiveFailures =
      config?.maxConsecutiveFailures ?? DEFAULT_AUTO_COMPACT_MAX_FAILURES;
    this.messagesToKeep = config?.messagesToKeep ?? DEFAULT_AUTO_COMPACT_MESSAGES_TO_KEEP;
    this.summarySections = config?.summarySections;
    this.callModelForSummary = callModelForSummary;
  }

  async compress(messages: readonly AgentMessage[], state: CompressState): Promise<CompressResult> {
    // 熔断器检查
    if (state.autoCompactFailures >= this.maxConsecutiveFailures) {
      return { messages, didCompress: false };
    }

    // 无 LLM 摘要函数 → 无法压缩
    if (!this.callModelForSummary) {
      return { messages, didCompress: false };
    }

    // 估算 token
    const estimatedTokens = state.estimatedTokens || estimateTokens(messages);
    const threshold = state.contextWindow * this.thresholdRatio;

    // 未达阈值 → 跳过
    if (estimatedTokens < threshold) {
      return { messages, didCompress: false };
    }

    // 分割消息: toCompact(旧) + toKeep(最近)
    const keepCount = Math.min(this.messagesToKeep, messages.length);
    const toCompact = messages.slice(0, messages.length - keepCount);
    const toKeep = messages.slice(messages.length - keepCount);

    if (toCompact.length === 0) {
      return { messages, didCompress: false };
    }

    // 调用 LLM 生成摘要
    try {
      const summaryText = await this.callModelForSummary(toCompact, this.summarySections);
      const summaryMsg = createSummaryMessage(summaryText);
      const compressedMessages: AgentMessage[] = [summaryMsg, ...toKeep];

      return {
        messages: compressedMessages,
        didCompress: true,
        stats: {
          generatedSummary: true,
          summaryMessageCount: toCompact.length
        }
      };
    } catch {
      // 摘要失败 → 递增熔断器
      state.autoCompactFailures++;
      return { messages, didCompress: false };
    }
  }
}
