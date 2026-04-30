/** 恢复系统配置 */

import type { ReactiveCompactConfig } from '@suga/ai-context';

/** 恢复系统全局配置 */
export interface RecoveryConfig {
  /** ReactiveCompact 配置（API 413 紧急压缩） */
  readonly reactiveCompact?: ReactiveCompactConfig;
  /** 输出 token 耗尽恢复配置 */
  readonly maxOutputTokens?: MaxOutputTokensRecoveryConfig;
  /** 增量折叠恢复配置 */
  readonly contextCollapse?: ContextCollapseConfig;
  /** Token 预算续写配置 */
  readonly tokenBudget?: TokenBudgetConfig;
  /** 自定义 API 错误检测器（默认检测 statusCode === 413） */
  readonly isApiOverflowError?: (error: unknown) => boolean;
}

/** MaxOutputTokensRecovery 配置 */
export interface MaxOutputTokensRecoveryConfig {
  /** 最大 escalation 次数（默认 3） */
  readonly maxEscalations?: number;
  /** 逐步提升的输出 token 上限（默认 [8192, 16384, 65536]） */
  readonly escalationLimits?: readonly number[];
}

/** ContextCollapse 配置 */
export interface ContextCollapseConfig {
  /** 强制折叠阈值（默认 0.95） */
  readonly drainThreshold?: number;
  /** 折叠计划触发阈值（默认 0.90） */
  readonly planThreshold?: number;
}

/** TokenBudgetContinuation 配置 */
export interface TokenBudgetConfig {
  /** 预算使用比例阈值（默认 0.9，低于此值触发续写） */
  readonly budgetRatio?: number;
  /** 最大续写次数（默认 3） */
  readonly maxContinuations?: number;
  /** 递减收益最小增量阈值（默认 500 tokens） */
  readonly minDeltaTokens?: number;
}
