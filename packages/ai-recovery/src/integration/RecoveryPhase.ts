/** RecoveryPhase — P1 Phase 链中的溢出检测与恢复 LoopPhase 实现 */

import type { MutableAgentContext, AgentEvent, LoopPhase } from '@suga/ai-agent-loop';
import type { CompressPipeline } from '@suga/ai-context';
import type { RecoveryConfig } from '../types/config';
import { ReactiveCompactRecovery } from '../core/ReactiveCompactRecovery';
import { MaxOutputTokensRecovery } from '../core/MaxOutputTokensRecovery';
import { TokenBudgetTracker } from '../core/TokenBudgetTracker';
import { ContextCollapseStrategy } from '../core/ContextCollapseStrategy';

/**
 * 恢复阶段 — 在 CallModelPhase 后检测溢出错误
 *
 * 检测五种溢出场景：
 *
 * 1. API 413 (prompt-too-long) → reactive_compact_retry
 *    - 调用 CompressPipeline.reactiveCompact 进行紧急压缩
 *    - 本轮产出被丢弃，使用压缩后的消息作为基础重新开始
 *
 * 2. max_output_tokens 耗尽 → escalation 或 recovery
 *    - 前 3 次：max_output_tokens_escalate（提升上限重试）
 *    - 3 次后：max_output_tokens_recovery（注入 recovery meta message）
 *
 * 3. context collapse → collapse_drain_retry
 *    - 增量折叠后排空溢出消息重试
 *
 * 4. token budget → token_budget_continuation
 *    - Token 预算未耗尽，注入 nudge 消息续写
 *
 * 5. stop_hook_blocking → 由 P4 HookStopPhase 处理，不在此 Phase
 *
 * RecoveryPhase 通过 ctx.meta 通信：
 * - ctx.meta.apiError → API 错误（413 等）
 * - ctx.meta.maxOutputTokensReached → 输出 token 耗尽标记
 * - ctx.meta.needsContextCollapse → 需要增量折叠
 * - ctx.meta.tokenBudget / tokenBudgetUsed → Token 预算状态
 */
export class RecoveryPhase implements LoopPhase {
  private readonly reactiveCompactRecovery: ReactiveCompactRecovery;
  private readonly maxOutputTokensRecovery: MaxOutputTokensRecovery;
  private readonly tokenBudgetTracker: TokenBudgetTracker;
  private readonly collapseStrategy: ContextCollapseStrategy;
  private readonly pipeline: CompressPipeline;

  constructor(pipeline: CompressPipeline, config?: RecoveryConfig) {
    this.pipeline = pipeline;
    this.reactiveCompactRecovery = new ReactiveCompactRecovery(
      pipeline,
      config?.isApiOverflowError
    );
    this.maxOutputTokensRecovery = new MaxOutputTokensRecovery(config?.maxOutputTokens);
    this.tokenBudgetTracker = new TokenBudgetTracker(config?.tokenBudget);
    this.collapseStrategy = new ContextCollapseStrategy(config?.contextCollapse);
  }

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 先执行后续阶段（CallModelPhase 等）
    yield* next();

    // 检查是否需要溢出恢复
    const apiError = ctx.meta.apiError as unknown | undefined;
    const maxOutputTokensReached = ctx.meta.maxOutputTokensReached as boolean | undefined;
    const needsContextCollapse = ctx.meta.needsContextCollapse as boolean | undefined;
    const tokenBudget = ctx.meta.tokenBudget as number | undefined;
    const tokenBudgetUsed = ctx.meta.tokenBudgetUsed as number | undefined;

    // API 413 → reactive_compact_retry
    if (apiError) {
      const result = await this.reactiveCompactRecovery.recover(apiError, ctx.state.messages);

      if (result.recovered) {
        ctx.state.transition = result.transition;
        ctx.meta.recoveryStrategy = result.strategy;
        ctx.meta.recovered = true;

        yield { type: 'turn_end', turnCount: ctx.state.turnCount };
        return;
      }

      // 恢复失败 → 错误已在 PostProcessPhase 处理
    }

    // max_output_tokens 耗尽 → escalation 或 recovery
    if (maxOutputTokensReached) {
      const result = this.maxOutputTokensRecovery.recover();

      ctx.state.transition = result.transition;
      ctx.meta.recoveryStrategy = result.strategy;
      ctx.meta.recovered = true;
      ctx.meta.currentEscalatedLimit = this.maxOutputTokensRecovery.currentEscalatedLimit;

      yield { type: 'turn_end', turnCount: ctx.state.turnCount };
      return;
    }

    // context collapse → collapse_drain_retry
    if (needsContextCollapse) {
      const transition = await this.collapseStrategy.collapse(ctx.state.messages, this.pipeline);
      ctx.state.transition = transition;
      ctx.meta.recoveryStrategy = 'collapse_drain_retry';
      ctx.meta.recovered = true;

      yield { type: 'turn_end', turnCount: ctx.state.turnCount };
      return;
    }

    // token budget → token_budget_continuation
    if (tokenBudget !== undefined && tokenBudgetUsed !== undefined) {
      if (this.tokenBudgetTracker.shouldContinue(tokenBudgetUsed, tokenBudget)) {
        const transition = this.tokenBudgetTracker.createContinuationTransition(
          tokenBudgetUsed,
          tokenBudget
        );
        ctx.state.transition = transition;
        ctx.meta.recoveryStrategy = 'token_budget_continuation';
        ctx.meta.recovered = true;
        this.tokenBudgetTracker.recordContinuation();

        yield { type: 'turn_end', turnCount: ctx.state.turnCount };
        return;
      }
    }
  }

  /** 获取 ReactiveCompactRecovery 实例（用于测试） */
  getReactiveCompactRecovery(): ReactiveCompactRecovery {
    return this.reactiveCompactRecovery;
  }

  /** 获取 MaxOutputTokensRecovery 实例（用于测试） */
  getMaxOutputTokensRecovery(): MaxOutputTokensRecovery {
    return this.maxOutputTokensRecovery;
  }

  /** 获取 TokenBudgetTracker 实例（用于测试） */
  getTokenBudgetTracker(): TokenBudgetTracker {
    return this.tokenBudgetTracker;
  }

  /** 获取 ContextCollapseStrategy 实例（用于测试） */
  getContextCollapseStrategy(): ContextCollapseStrategy {
    return this.collapseStrategy;
  }
}
