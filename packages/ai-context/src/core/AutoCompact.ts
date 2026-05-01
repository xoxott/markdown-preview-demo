/** AutoCompact — token 达阈值时 LLM 摘要压缩 + 熔断器 + PTL Retry */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressLayer, CompressResult, CompressState } from '../types/compressor';
import type { AutoCompactConfig } from '../types/config';
import type { AttachmentRebuildConfig } from '../types/attachment';
import type { CallModelForSummary, TokenEstimator } from '../types/injection';
import type { SummarySections } from '../types/messages';
import {
  DEFAULT_AUTO_COMPACT_MAX_FAILURES,
  DEFAULT_AUTO_COMPACT_MESSAGES_TO_KEEP,
  DEFAULT_AUTO_COMPACT_THRESHOLD_RATIO
} from '../constants';
import { estimateTokens } from '../utils/tokenEstimate';
import { createSummaryMessage } from '../utils/messageHelpers';
import type { PTLRetryHandler } from './PTLRetryHandler';
import { AttachmentRebuilder } from './AttachmentRebuilder';

/** AutoCompact 压缩层 */
export class AutoCompactLayer implements CompressLayer {
  readonly name = 'AutoCompact';
  private readonly thresholdRatio: number;
  private readonly maxConsecutiveFailures: number;
  private readonly messagesToKeep: number;
  private readonly summarySections?: SummarySections;
  private readonly callModelForSummary?: CallModelForSummary;
  private readonly ptlRetryHandler?: PTLRetryHandler;
  private readonly tokenEstimator: TokenEstimator;
  private readonly attachmentRebuilder?: AttachmentRebuilder;

  constructor(
    config?: AutoCompactConfig,
    callModelForSummary?: CallModelForSummary,
    tokenEstimator?: TokenEstimator,
    ptlRetryHandler?: PTLRetryHandler,
    attachmentRebuildConfig?: AttachmentRebuildConfig
  ) {
    this.thresholdRatio = config?.thresholdRatio ?? DEFAULT_AUTO_COMPACT_THRESHOLD_RATIO;
    this.maxConsecutiveFailures =
      config?.maxConsecutiveFailures ?? DEFAULT_AUTO_COMPACT_MAX_FAILURES;
    this.messagesToKeep = config?.messagesToKeep ?? DEFAULT_AUTO_COMPACT_MESSAGES_TO_KEEP;
    this.summarySections = config?.summarySections;
    this.callModelForSummary = callModelForSummary;
    this.tokenEstimator = tokenEstimator ?? estimateTokens;
    this.ptlRetryHandler = ptlRetryHandler;
    this.attachmentRebuilder = attachmentRebuildConfig
      ? new AttachmentRebuilder(attachmentRebuildConfig)
      : undefined;
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
    const estimatedTokens = state.estimatedTokens || this.tokenEstimator(messages);
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

    // 调用 LLM 生成摘要（带 PTL Retry）
    try {
      let summaryText: string;

      if (this.ptlRetryHandler) {
        // 使用 PTL Retry 机制
        const result = await this.ptlRetryHandler.retrySummary(
          toCompact,
          this.callModelForSummary,
          this.tokenEstimator,
          state.contextWindow,
          this.summarySections
        );

        if (result === null) {
          // PTL retry 全部失败 → 递增熔断器
          state.autoCompactFailures++;
          return { messages, didCompress: false };
        }

        summaryText = result;
      } else {
        // 无 PTL Retry → 直接调用（原有行为）
        summaryText = await this.callModelForSummary(toCompact, this.summarySections);
      }

      const summaryMsg = createSummaryMessage(summaryText);

      // Post-compact 附件重建
      let attachmentMessages: AgentMessage[] = [];
      if (this.attachmentRebuilder) {
        const rebuildResult = this.attachmentRebuilder.rebuild();
        attachmentMessages = rebuildResult.attachments as AgentMessage[];
      }

      const compressedMessages: AgentMessage[] = [summaryMsg, ...attachmentMessages, ...toKeep];

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
