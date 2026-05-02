/** @suga/ai-recovery — 溢出恢复系统 公共 API */

// 核心实现
export { ReactiveCompactRecovery, extractApiError } from './core/ReactiveCompactRecovery';
export { MaxOutputTokensRecovery } from './core/MaxOutputTokensRecovery';
export { TokenBudgetTracker } from './core/TokenBudgetTracker';
export { ContextCollapseStrategy } from './core/ContextCollapseStrategy';
export { CollapseCommitLogImpl } from './core/CollapseCommitLog';
export { parsePTLTokenGap } from './core/PTLTokenGapParser';

// Compact策略
export { AutoCompactStrategy } from './core/AutoCompactStrategy';
export { MicroCompactStrategy } from './core/MicroCompactStrategy';
export { SessionMemoryCompact } from './core/SessionMemoryCompact';
export { CompactOrchestrator } from './core/CompactOrchestrator';

// 集成阶段
export { RecoveryPhase } from './integration/RecoveryPhase';

// 类型导出
export type {
  RecoveryConfig,
  MaxOutputTokensRecoveryConfig,
  ContextCollapseConfig,
  TokenBudgetConfig,
  SpiralGuardConfig
} from './types/config';

export type {
  ApiOverflowError,
  RecoveryResult,
  RecoveryStrategy,
  RecoveryMeta
} from './types/recovery';

export type {
  CollapseSpan,
  CollapseSpanStatus,
  DrainResult,
  CollapseCommitLog
} from './types/collapse';

export type { PTLTokenGapResult } from './core/PTLTokenGapParser';

// Compact策略类型导出
export type {
  CompactMessage,
  CompactResult,
  CompactHostProvider,
  AutoCompactConfig,
  MicroCompactConfig,
  SessionMemoryCompactConfig
} from './types/compact';

export {
  DEFAULT_AUTO_COMPACT_CONFIG,
  DEFAULT_MICRO_COMPACT_CONFIG,
  DEFAULT_SESSION_MEMORY_COMPACT_CONFIG
} from './types/compact';
