/**
 * G19: ForkCompactLayer — 使用 fork 子代理进行压缩摘要
 *
 * 对齐 Claude Code 的 fork-agent compact 机制:
 *
 * 当 AutoCompact 熔断或需要避免同一 LLM 调用上下文时， ForkCompactLayer 委托一个 fork 子代理来生成摘要。
 *
 * fork 子代理继承父代理的消息前缀（共享 prompt cache）， 指令文本是唯一的变量部分，最大化 cache 命中率。
 *
 * 位置: AutoCompact 之后、PartialCompact 之前 条件: 1) forkSpawner 注入 2) 不在 fork 子进程内 3) 达到 token 阈值
 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type {
  CompressLayer,
  CompressResult,
  CompressState,
  CompressStats
} from '../types/compressor';
import type { ForkCompactConfig } from '../types/config';
import type { ForkSpawnerFn } from '../types/injection';
import { estimateTokens } from '../utils/tokenEstimate';
import { createSummaryMessage } from '../utils/messageHelpers';

/** 默认配置 */
const DEFAULT_FORK_COMPACT_THRESHOLD_RATIO = 0.8;
const DEFAULT_FORK_COMPACT_MESSAGES_TO_KEEP = 4;
const DEFAULT_FORK_COMPACT_MAX_FORK_DEPTH = 2;
const DEFAULT_FORK_COMPACT_MAX_FAILURES = 3;

/** ForkCompact 压缩层 */
export class ForkCompactLayer implements CompressLayer {
  readonly name = 'ForkCompact';
  private readonly thresholdRatio: number;
  private readonly messagesToKeep: number;
  private readonly maxForkDepth: number;
  private readonly maxFailures: number;
  private readonly fallbackToAutoCompact: boolean;
  private readonly forkSpawner?: ForkSpawnerFn;

  constructor(config?: ForkCompactConfig, forkSpawner?: ForkSpawnerFn) {
    this.thresholdRatio = config?.thresholdRatio ?? DEFAULT_FORK_COMPACT_THRESHOLD_RATIO;
    this.messagesToKeep = config?.messagesToKeep ?? DEFAULT_FORK_COMPACT_MESSAGES_TO_KEEP;
    this.maxForkDepth = config?.maxForkDepth ?? DEFAULT_FORK_COMPACT_MAX_FORK_DEPTH;
    this.maxFailures = config?.maxFailures ?? DEFAULT_FORK_COMPACT_MAX_FAILURES;
    this.fallbackToAutoCompact = config?.fallbackToAutoCompact ?? false;
    this.forkSpawner = forkSpawner;
  }

  async compress(messages: readonly AgentMessage[], state: CompressState): Promise<CompressResult> {
    // 熔断器检查
    const forkFailures = state.forkCompactFailures ?? 0;
    if (forkFailures >= this.maxFailures) {
      return { messages, didCompress: false };
    }

    // 无 fork spawner → 无法压缩
    if (!this.forkSpawner) {
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

    // 调用 fork 子代理生成摘要
    const startTime = Date.now();
    try {
      const summaryText = await this.forkSpawner(
        toCompact,
        this.maxForkDepth,
        state.config.autoCompact?.summarySections
      );

      if (!summaryText) {
        // fork 子代理返回空 → 递增熔断器
        this.incrementForkFailures(state);
        return { messages, didCompress: false };
      }

      const summaryMsg = createSummaryMessage(summaryText);
      const resultMessages = [...toKeep, summaryMsg];

      const stats: CompressStats = {
        generatedSummary: true,
        summaryMessageCount: toCompact.length,
        forkCompactSummary: true,
        forkCompactDurationMs: Date.now() - startTime
      };

      return { messages: resultMessages, didCompress: true, stats };
    } catch {
      // fork 失败 → 递增熔断器
      this.incrementForkFailures(state);

      if (this.fallbackToAutoCompact) {
        // 回退到 AutoCompact 层处理（不在此层执行，让 AutoCompactLayer 在下轮处理）
        return { messages, didCompress: false };
      }

      return { messages, didCompress: false };
    }
  }

  /** 递增 fork 熔断器计数 */
  private incrementForkFailures(state: CompressState): void {
    state.forkCompactFailures = (state.forkCompactFailures ?? 0) + 1;
  }
}
