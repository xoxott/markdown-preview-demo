/** TokenBudgetTracker — Token 预算续写追踪器 */

import type { AgentMessage, ContinueTransition } from '@suga/ai-agent-loop';
import type { TokenBudgetConfig } from '../types/config';

/** 生成唯一 ID */
function generateId(): string {
  return `nudge_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Token 预算续写追踪器
 *
 * 参考 Claude Code checkTokenBudget:
 * - turnTokens < budget * budgetRatio → 应继续生成
 * - continuationCount >= maxContinuations → 强制停止
 * - 递减收益: 最近两轮增量 < minDeltaTokens → 强制停止
 *
 * nudge 消息: "Stopped at X% (Y/Z). Keep working — do not summarize."
 * (isMeta: true — 不计入对话质量评估)
 */
export class TokenBudgetTracker {
  private continuationCount = 0;
  private readonly budgetRatio: number;
  private readonly maxContinuations: number;
  private readonly minDeltaTokens: number;
  private lastDelta: number | undefined;
  private secondLastDelta: number | undefined;

  constructor(config?: TokenBudgetConfig) {
    this.budgetRatio = config?.budgetRatio ?? 0.9;
    this.maxContinuations = config?.maxContinuations ?? 3;
    this.minDeltaTokens = config?.minDeltaTokens ?? 500;
  }

  /** 检查是否应继续生成 */
  shouldContinue(turnTokens: number, budget: number): boolean {
    // 预算使用比例低于阈值 → token 尚未耗尽，需要续写
    if (turnTokens >= budget * this.budgetRatio) return false;
    // 已达最大续写次数
    if (this.continuationCount >= this.maxContinuations) return false;
    return true;
  }

  /** 检查递减收益 */
  isDiminishingReturns(lastDelta: number, secondLastDelta: number): boolean {
    return (
      this.continuationCount >= this.maxContinuations ||
      (lastDelta < this.minDeltaTokens && secondLastDelta < this.minDeltaTokens)
    );
  }

  /** 生成续写 nudge 消息 */
  createNudgeMessage(turnTokens: number, budget: number): AgentMessage {
    const percentage = Math.round((turnTokens / budget) * 100);
    return {
      id: generateId(),
      role: 'user',
      content: `Stopped at ${percentage}% (${turnTokens}/${budget}). Keep working — do not summarize.`,
      timestamp: Date.now(),
      isMeta: true
    };
  }

  /** 创建 token_budget_continuation ContinueTransition */
  createContinuationTransition(turnTokens: number, budget: number): ContinueTransition {
    const nudgeMessage = this.createNudgeMessage(turnTokens, budget);
    return {
      type: 'token_budget_continuation',
      nudgeMessage,
      budgetUsage: turnTokens / budget
    };
  }

  /** 记录续写次数和增量 */
  recordContinuation(deltaTokens?: number): void {
    this.continuationCount++;
    if (deltaTokens !== undefined) {
      this.secondLastDelta = this.lastDelta;
      this.lastDelta = deltaTokens;
    }
  }

  /** 重置续写状态 */
  reset(): void {
    this.continuationCount = 0;
    this.lastDelta = undefined;
    this.secondLastDelta = undefined;
  }

  /** 当前续写次数 */
  get currentContinuationCount(): number {
    return this.continuationCount;
  }

  /** 上一次增量 tokens */
  get lastDeltaTokens(): number | undefined {
    return this.lastDelta;
  }

  /** 第二次增量 tokens */
  get secondLastDeltaTokens(): number | undefined {
    return this.secondLastDelta;
  }
}
