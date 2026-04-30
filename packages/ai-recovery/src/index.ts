/** @suga/ai-recovery — 溢出恢复系统 公共 API */

// 核心实现
export { ReactiveCompactRecovery, extractApiError } from './core/ReactiveCompactRecovery';
export { MaxOutputTokensRecovery } from './core/MaxOutputTokensRecovery';
export { TokenBudgetTracker } from './core/TokenBudgetTracker';
export { ContextCollapseStrategy } from './core/ContextCollapseStrategy';

// 集成阶段
export { RecoveryPhase } from './integration/RecoveryPhase';

// 类型导出
export type {
  RecoveryConfig,
  MaxOutputTokensRecoveryConfig,
  ContextCollapseConfig,
  TokenBudgetConfig
} from './types/config';

export type {
  ApiOverflowError,
  RecoveryResult,
  RecoveryStrategy,
  RecoveryMeta
} from './types/recovery';
