/** BlockingLimitPhase — token 超限预拦截 LoopPhase（避免浪费 API 调用） */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { CompressPipeline } from '../core/CompressPipeline';
import type { BlockingLimitConfig } from '../types/config';
import type { BlockingLimitError } from '../types/messages';
import type { TokenEstimator } from '../types/injection';
import { estimateTokensPrecise } from '../utils/tokenEstimate';
import { DEFAULT_BLOCKING_LIMIT_RESERVE_TOKENS, DEFAULT_CONTEXT_WINDOW } from '../constants';

/**
 * BlockingLimitPhase — 在 CallModelPhase 前拦截超限请求
 *
 * 当 estimatedTokens >= contextWindow - reserveTokens 时：
 *
 * 1. 尝试执行压缩（CompressPipeline）
 * 2. 压缩后仍超限 → 设置 ctx.error 终止（不浪费 API 调用）
 * 3. 压缩后不超限 → 正常 yield* next()
 *
 * 位置：在 CompressPhase 之后、CallModelPhase 之前插入 Phase 链
 */
export class BlockingLimitPhase implements LoopPhase {
  private readonly pipeline: CompressPipeline;
  private readonly reserveTokens: number;
  private readonly contextWindow: number;
  private readonly tokenEstimator: TokenEstimator;

  constructor(
    pipeline: CompressPipeline,
    config?: BlockingLimitConfig,
    tokenEstimator?: TokenEstimator
  ) {
    this.pipeline = pipeline;
    this.reserveTokens = config?.reserveTokens ?? DEFAULT_BLOCKING_LIMIT_RESERVE_TOKENS;
    this.contextWindow = pipeline.getState().contextWindow ?? DEFAULT_CONTEXT_WINDOW;
    this.tokenEstimator = tokenEstimator ?? estimateTokensPrecise;
  }

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 优先使用压缩后的消息
    const messages: readonly import('@suga/ai-agent-loop').AgentMessage[] =
      (ctx.meta.compressedMessages as
        | readonly import('@suga/ai-agent-loop').AgentMessage[]
        | undefined) ?? ctx.state.messages;

    const estimatedTokens = this.tokenEstimator(messages);
    const blockingThreshold = this.contextWindow - this.reserveTokens;

    // 未超限 → 正常通过
    if (estimatedTokens < blockingThreshold) {
      yield* next();
      return;
    }

    // 超限 → 尝试压缩（如果之前没压缩过）
    if (!ctx.meta.compressedMessages) {
      const compressResult = await this.pipeline.compress(messages);
      ctx.meta.compressedMessages = compressResult.messages;
      ctx.meta.compressStats = compressResult.stats;

      const compressedTokens = this.tokenEstimator(compressResult.messages);

      // 压缩后不超限 → 正常通过
      if (compressedTokens < blockingThreshold) {
        yield* next();
        return;
      }
    }

    // 压缩后仍超限 → 设置错误终止
    const blockingError: BlockingLimitError = {
      type: 'blocking_limit',
      estimatedTokens,
      contextWindow: this.contextWindow,
      reserveTokens: this.reserveTokens,
      message: `Context exceeds blocking limit (${estimatedTokens} tokens >= ${blockingThreshold} threshold). Compact first or reduce context.`
    };

    ctx.setError(new Error(blockingError.message));
    ctx.meta.blockingLimitError = blockingError;

    yield { type: 'turn_end', turnCount: ctx.state.turnCount };
  }
}
