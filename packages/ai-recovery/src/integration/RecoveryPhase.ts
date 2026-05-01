/** RecoveryPhase — P1 Phase 链中的溢出检测与恢复 LoopPhase 实现 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { CompressPipeline } from '@suga/ai-context';
import type { RecoveryConfig } from '../types/config';
import type { ApiOverflowError, RecoveryStrategy } from '../types/recovery';
import { ReactiveCompactRecovery } from '../core/ReactiveCompactRecovery';
import { MaxOutputTokensRecovery } from '../core/MaxOutputTokensRecovery';
import { TokenBudgetTracker } from '../core/TokenBudgetTracker';
import { ContextCollapseStrategy } from '../core/ContextCollapseStrategy';

/** 默认每策略最大尝试次数 */
const DEFAULT_MAX_ATTEMPTS_PER_STRATEGY = 1;

/**
 * 恢复阶段 — 在 CallModelPhase 后检测溢出错误
 *
 * 检测五种溢出场景：
 *
 * 1. API 413 (prompt-too-long) → reactive_compact_retry
 *
 *    - 调用 CompressPipeline.reactiveCompact 进行紧急压缩
 *    - 本轮产出被丢弃，使用压缩后的消息作为基础重新开始
 * 2. max_output_tokens 耗尽 → escalation 或 recovery
 *
 *    - 前 3 次：max_output_tokens_escalate（提升上限重试）
 *    - 3 次后：max_output_tokens_recovery（注入 recovery meta message）
 * 3. context collapse → collapse_drain_retry
 *
 *    - 增量折叠后排空溢出消息重试
 * 4. token budget → token_budget_continuation
 *
 *    - Token 预算未耗尽，注入 nudge 消息续写
 *    - 递减收益检测 → token_budget_diminishing（不续写）
 * 5. stop_hook_blocking → 由 P4 HookStopPhase 处理，不在此 Phase
 *
 * 螺旋防护：per-strategy attempt tracking
 *
 * - 每种 RecoveryStrategy 有独立的最大尝试次数
 * - 超过次数 → spiral_terminated（终止循环）
 * - 无溢出检测时重置所有计数
 *
 * RecoveryPhase 通过 ctx.meta 通信：
 *
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
  private readonly spiralGuardEnabled: boolean;
  private readonly maxAttemptsPerStrategy: Partial<Record<RecoveryStrategy, number>>;
  private readonly previousBudgetUsedField: string;
  private attemptCounts = new Map<RecoveryStrategy, number>();

  constructor(pipeline: CompressPipeline, config?: RecoveryConfig) {
    this.pipeline = pipeline;
    this.reactiveCompactRecovery = new ReactiveCompactRecovery(
      pipeline,
      config?.isApiOverflowError
    );
    this.maxOutputTokensRecovery = new MaxOutputTokensRecovery(config?.maxOutputTokens);
    this.tokenBudgetTracker = new TokenBudgetTracker(config?.tokenBudget);
    this.collapseStrategy = new ContextCollapseStrategy(config?.contextCollapse);
    this.spiralGuardEnabled = config?.spiralGuard?.enabled ?? true;
    this.maxAttemptsPerStrategy = config?.spiralGuard?.maxAttemptsPerStrategy ?? {};
    this.previousBudgetUsedField =
      config?.tokenBudget?.previousBudgetUsedField ?? 'previousTokenBudgetUsed';
  }

  /** 获取策略的最大尝试次数 */
  private getMaxAttempts(strategy: RecoveryStrategy): number {
    return this.maxAttemptsPerStrategy[strategy] ?? DEFAULT_MAX_ATTEMPTS_PER_STRATEGY;
  }

  /** 检查策略是否已超过最大尝试次数 */
  private isSpiralDetected(strategy: RecoveryStrategy): boolean {
    if (!this.spiralGuardEnabled) return false;
    const current = this.attemptCounts.get(strategy) ?? 0;
    return current >= this.getMaxAttempts(strategy);
  }

  /** 记录策略尝试 */
  private recordAttempt(strategy: RecoveryStrategy): void {
    const current = this.attemptCounts.get(strategy) ?? 0;
    this.attemptCounts.set(strategy, current + 1);
  }

  /** 螺旋终止处理 */
  private handleSpiralTermination(
    ctx: MutableAgentContext,
    strategy: RecoveryStrategy
  ): AgentEvent {
    ctx.state.transition = {
      type: 'model_error',
      error: new Error(
        `Spiral detected: ${strategy} already attempted ${this.attemptCounts.get(strategy)} times`
      )
    };
    ctx.meta.recoveryStrategy = 'spiral_terminated';
    ctx.meta.recovered = false;
    ctx.meta.hasAttemptedReactiveCompact = (this.attemptCounts.get('reactive_compact') ?? 0) > 0;
    return { type: 'turn_end', turnCount: ctx.state.turnCount };
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

    // API 413 → reactive_compact_retry（带螺旋防护）
    if (apiError) {
      if (this.isSpiralDetected('reactive_compact')) {
        yield this.handleSpiralTermination(ctx, 'reactive_compact');
        return;
      }

      const result = await this.reactiveCompactRecovery.recover(apiError, ctx.state.messages);

      if (result.recovered) {
        ctx.state.transition = result.transition;
        ctx.meta.recoveryStrategy = result.strategy;
        ctx.meta.recovered = true;
        ctx.meta.hasAttemptedReactiveCompact = true;
        // 将 PTL token gap 写入 meta（指导后续压缩量）
        const apiErrorInfo = apiError as ApiOverflowError | undefined;
        if (apiErrorInfo?.tokenGap !== undefined) {
          ctx.meta.ptlTokenGap = apiErrorInfo.tokenGap;
        }
        this.recordAttempt('reactive_compact');

        yield { type: 'turn_end', turnCount: ctx.state.turnCount };
        return;
      }

      // 恢复失败 → 错误已在 PostProcessPhase 处理
    }

    // max_output_tokens 耗尽 → escalation 或 recovery
    // 注：max_output_tokens 有自己的 escalation 机制（maxEscalations=3），
    // 不受 spiralGuard 限制 — 它是阶梯式升级而非重复同一手段
    if (maxOutputTokensReached) {
      const result = this.maxOutputTokensRecovery.recover();

      ctx.state.transition = result.transition;
      ctx.meta.recoveryStrategy = result.strategy;
      ctx.meta.recovered = true;
      ctx.meta.currentEscalatedLimit = this.maxOutputTokensRecovery.currentEscalatedLimit;

      yield { type: 'turn_end', turnCount: ctx.state.turnCount };
      return;
    }

    // context collapse → collapse_drain_retry（带螺旋防护 + collapseInProgress 互斥）
    if (needsContextCollapse) {
      if (this.isSpiralDetected('collapse_drain_retry')) {
        yield this.handleSpiralTermination(ctx, 'collapse_drain_retry');
        return;
      }

      // 设置 collapseInProgress 标记（与 AutoCompact 互斥）
      ctx.meta.collapseInProgress = true;

      const transition = await this.collapseStrategy.collapse(ctx.state.messages, this.pipeline);
      ctx.state.transition = transition;
      ctx.meta.recoveryStrategy = 'collapse_drain_retry';
      ctx.meta.recovered = true;
      ctx.meta.collapseCommitLog = this.collapseStrategy.commitLog;
      this.recordAttempt('collapse_drain_retry');

      // collapse 完成 → 清除标记
      ctx.meta.collapseInProgress = false;

      yield { type: 'turn_end', turnCount: ctx.state.turnCount };
      return;
    }

    // token budget → token_budget_continuation 或 token_budget_diminishing
    if (tokenBudget !== undefined && tokenBudgetUsed !== undefined) {
      if (this.tokenBudgetTracker.shouldContinue(tokenBudgetUsed, tokenBudget)) {
        // 检查递减收益
        const previousUsed = ctx.meta[this.previousBudgetUsedField] as number | undefined;
        if (previousUsed !== undefined) {
          const delta = tokenBudgetUsed - previousUsed;
          const lastDelta = this.tokenBudgetTracker.lastDeltaTokens ?? delta;
          const secondDelta = this.tokenBudgetTracker.secondLastDeltaTokens ?? delta;

          if (this.tokenBudgetTracker.isDiminishingReturns(lastDelta, secondDelta)) {
            ctx.meta.recoveryStrategy = 'token_budget_diminishing';
            ctx.meta.recovered = false;
            // 递减收益 → 不续写，正常结束本轮
          } else {
            const transition = this.tokenBudgetTracker.createContinuationTransition(
              tokenBudgetUsed,
              tokenBudget
            );
            ctx.state.transition = transition;
            ctx.meta.recoveryStrategy = 'token_budget_continuation';
            ctx.meta.recovered = true;
            this.tokenBudgetTracker.recordContinuation(delta);
            // 存储本轮使用量供下一轮比较
            ctx.meta[this.previousBudgetUsedField] = tokenBudgetUsed;

            yield { type: 'turn_end', turnCount: ctx.state.turnCount };
            return;
          }
        } else {
          // 首次续写（无 previousUsed）→ 直接续写
          const transition = this.tokenBudgetTracker.createContinuationTransition(
            tokenBudgetUsed,
            tokenBudget
          );
          ctx.state.transition = transition;
          ctx.meta.recoveryStrategy = 'token_budget_continuation';
          ctx.meta.recovered = true;
          this.tokenBudgetTracker.recordContinuation();
          ctx.meta[this.previousBudgetUsedField] = tokenBudgetUsed;

          yield { type: 'turn_end', turnCount: ctx.state.turnCount };
          return;
        }
      }
    }

    // 无溢出检测 → 重置螺旋防护计数
    this.attemptCounts.clear();
    // 重置 token budget 状态
    this.tokenBudgetTracker.reset();
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
