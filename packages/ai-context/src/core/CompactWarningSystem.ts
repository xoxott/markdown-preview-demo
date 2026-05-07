/**
 * CompactWarningSystem — autocompact 前的警告抑制/恢复
 *
 * N45: autocompact 前提醒用户，允许用户抑制/恢复警告。
 */

export interface CompactWarningConfig {
  readonly enabled: boolean;
  readonly suppressDurationMs: number; // 抑制持续时间（默认 300000 = 5min）
  readonly warnBeforeCompact: boolean; // 是否在 compact 前警告（默认 true）
}

export const DEFAULT_COMPACT_WARNING_CONFIG: CompactWarningConfig = {
  enabled: true,
  suppressDurationMs: 300000,
  warnBeforeCompact: true
};

export interface CompactWarningState {
  readonly suppressed: boolean;
  readonly suppressedUntil?: number;
  readonly lastWarningTime: number;
  readonly compactCount: number;
}

/** shouldShowCompactWarning — 判断是否应显示 compact 警告 */
export function shouldShowCompactWarning(
  state: CompactWarningState,
  config?: CompactWarningConfig
): boolean {
  const effectiveConfig = config ?? DEFAULT_COMPACT_WARNING_CONFIG;
  if (!effectiveConfig.enabled) return false;
  if (!effectiveConfig.warnBeforeCompact) return false;

  // 被抑制 → 检查是否过期
  if (state.suppressed) {
    if (state.suppressedUntil && Date.now() < state.suppressedUntil) {
      return false; // 还在抑制期
    }
    // 抑制已过期 → 重新允许警告
  }

  return true;
}

/** suppressCompactWarning — 抑制 compact 警告一段时间 */
export function suppressCompactWarning(
  state: CompactWarningState,
  config?: CompactWarningConfig
): CompactWarningState {
  const effectiveConfig = config ?? DEFAULT_COMPACT_WARNING_CONFIG;
  return {
    ...state,
    suppressed: true,
    suppressedUntil: Date.now() + effectiveConfig.suppressDurationMs
  };
}

/** unsuppressCompactWarning — 取消抑制 */
export function unsuppressCompactWarning(state: CompactWarningState): CompactWarningState {
  return {
    ...state,
    suppressed: false,
    suppressedUntil: undefined
  };
}

/** recordCompactOccurred — 记录一次 compact 发生 */
export function recordCompactOccurred(state: CompactWarningState): CompactWarningState {
  return {
    ...state,
    compactCount: state.compactCount + 1,
    lastWarningTime: Date.now()
  };
}
