/**
 * AutoDream — 自动记忆整合服务
 *
 * 时间门控 + 会话门控 + 锁的 /dream 记忆整合。 定期触发记忆整合，优化和合并现有记忆条目。
 */

/** AutoDream 配置 */
export interface AutoDreamConfig {
  readonly enabled: boolean;
  readonly intervalMs: number; // 门控间隔（默认 30min = 1800000）
  readonly sessionGateCount: number; // 会话门控：至少N次交互后触发（默认5）
  readonly maxDurationMs: number; // 最大执行时间（默认 60000）
}

export const DEFAULT_AUTO_DREAM_CONFIG: AutoDreamConfig = {
  enabled: true,
  intervalMs: 1800000, // 30 min
  sessionGateCount: 5,
  maxDurationMs: 60000
};

/** AutoDream 状态 */
export interface AutoDreamState {
  readonly lastDreamTime: number;
  readonly sessionInteractionCount: number;
  readonly isRunning: boolean;
  readonly lockAcquired: boolean;
}

/** AutoDream 触发条件检查 */
export function shouldTriggerAutoDream(state: AutoDreamState, config?: AutoDreamConfig): boolean {
  const effectiveConfig = config ?? DEFAULT_AUTO_DREAM_CONFIG;

  if (!effectiveConfig.enabled) return false;
  if (state.isRunning) return false; // 已在运行
  if (state.lockAcquired) return false; // 锁已被占用

  // 时间门控
  const elapsed = Date.now() - state.lastDreamTime;
  if (elapsed < effectiveConfig.intervalMs) return false;

  // 会话门控
  if (state.sessionInteractionCount < effectiveConfig.sessionGateCount) return false;

  return true;
}

/** AutoDream 结果 */
export interface AutoDreamResult {
  readonly memoriesProcessed: number;
  readonly memoriesMerged: number;
  readonly memoriesCreated: number;
  readonly durationMs: number;
}
