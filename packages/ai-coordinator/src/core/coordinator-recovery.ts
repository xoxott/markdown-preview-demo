/**
 * Coordinator 模式恢复 — 从持久化状态恢复 coordinator 配置
 *
 * N11: 会话启动时从存储中恢复 coordinator 模式配置。 包括：模式恢复、worker列表恢复、scratchpad恢复。
 */

import type { CoordinatorModeConfig, SessionMode } from '../types/coordinator-mode';

/** 持久化的 coordinator 状态 */
export interface PersistedCoordinatorState {
  readonly mode: SessionMode;
  readonly lastActiveTime: number;
  readonly scratchpadDir?: string;
  readonly workerTypes?: readonly string[];
  readonly leaderAgentType?: string;
}

/** CoordinatorStateStore — 宿主注入的持久化存储接口 */
export interface CoordinatorStateStore {
  readonly load: () => PersistedCoordinatorState | null;
  readonly save: (state: PersistedCoordinatorState) => void;
}

/** recoverCoordinatorMode — 从持久化状态恢复 coordinator 模式配置 */
export function recoverCoordinatorMode(
  store: CoordinatorStateStore,
  defaultConfig?: CoordinatorModeConfig
): CoordinatorModeConfig {
  const persisted = store.load();

  if (!persisted) {
    // 无持久化数据 → 使用默认配置
    return defaultConfig ?? { mode: 'single' };
  }

  // 检查是否过时（超过1小时未活跃 → 回退到single）
  const staleThresholdMs = 3600000; // 1 hour
  if (
    Date.now() - persisted.lastActiveTime > staleThresholdMs &&
    persisted.mode === 'coordinator'
  ) {
    // coordinator 过时 → 回退到 single
    return { mode: 'single' };
  }

  return {
    mode: persisted.mode,
    scratchpadDir: persisted.scratchpadDir,
    workerToolAllowlist: undefined // 从workerTypes推导
  };
}

/** persistCoordinatorState — 持久化当前 coordinator 状态 */
export function persistCoordinatorState(
  config: CoordinatorModeConfig,
  store: CoordinatorStateStore
): void {
  const state: PersistedCoordinatorState = {
    mode: config.mode,
    lastActiveTime: Date.now(),
    scratchpadDir: config.scratchpadDir
  };
  store.save(state);
}
