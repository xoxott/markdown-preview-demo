/** 恢复系统类型定义 */

import type { ContinueTransition } from '@suga/ai-agent-loop';

/** API 溢出错误信息 */
export interface ApiOverflowError {
  /** HTTP 状态码 */
  readonly statusCode: number;
  /** 错误消息 */
  readonly message: string;
  /** 原始错误对象 */
  readonly originalError?: unknown;
}

/** 恢复结果 */
export interface RecoveryResult {
  /** 恢复后的 ContinueTransition */
  readonly transition: ContinueTransition;
  /** 恢复策略描述 */
  readonly strategy: RecoveryStrategy;
  /** 是否成功恢复 */
  readonly recovered: boolean;
}

/** 恢复策略类型 */
export type RecoveryStrategy =
  | 'reactive_compact'
  | 'max_output_tokens_escalate'
  | 'max_output_tokens_recovery'
  | 'collapse_drain_retry'
  | 'token_budget_continuation'
  | 'no_recovery_needed';

/** 恢复 meta 信息（写入 ctx.meta） */
export interface RecoveryMeta {
  /** API 溢出错误 */
  readonly apiError?: ApiOverflowError;
  /** 输出 token 是否耗尽 */
  readonly maxOutputTokensReached?: boolean;
  /** 当前 escalation 上限 */
  readonly currentEscalatedLimit?: number;
  /** 恢复策略 */
  readonly recoveryStrategy?: RecoveryStrategy;
  /** 是否需要增量折叠 */
  readonly needsContextCollapse?: boolean;
  /** Token 预算总量 */
  readonly tokenBudget?: number;
  /** Token 预算已使用量 */
  readonly tokenBudgetUsed?: number;
}
