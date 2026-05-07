/**
 * DiagnosticTracking — IDE/MCP诊断基线跟踪+增量检测
 *
 * N31: 对齐 CC services/diagnosticTracking.ts 跟踪IDE和MCP提供的诊断信息基线，检测增量变化。
 */

// ============================================================
// 类型定义
// ============================================================

/** 诊断严重级别 */
export type DiagnosticSeverity = 'error' | 'warning' | 'information' | 'hint';

/** 单条诊断 */
export interface DiagnosticItem {
  readonly id: string;
  readonly filePath: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly source?: string;
  readonly line?: number;
  readonly column?: number;
  readonly code?: string;
}

/** 诊断变更类型 */
export type DiagnosticChangeType = 'added' | 'removed' | 'modified';

/** 诊断变更 */
export interface DiagnosticChange {
  readonly type: DiagnosticChangeType;
  readonly diagnostic: DiagnosticItem;
  readonly previousDiagnostic?: DiagnosticItem;
}

/** DiagnosticTracking 配置 */
export interface DiagnosticTrackingConfig {
  readonly enabled: boolean;
  readonly trackBaseline: boolean;
  readonly trackIncremental: boolean;
  readonly maxBaselineSize: number;
}

export const DEFAULT_DIAGNOSTIC_TRACKING_CONFIG: DiagnosticTrackingConfig = {
  enabled: true,
  trackBaseline: true,
  trackIncremental: true,
  maxBaselineSize: 500
};

/** DiagnosticTrackingState */
export interface DiagnosticTrackingState {
  readonly baseline: readonly DiagnosticItem[];
  readonly changes: readonly DiagnosticChange[];
  readonly lastBaselineUpdate: number;
}

// ============================================================
// 核心函数
// ============================================================

/** createInitialDiagnosticState — 创建初始状态 */
export function createInitialDiagnosticState(): DiagnosticTrackingState {
  return {
    baseline: [],
    changes: [],
    lastBaselineUpdate: 0
  };
}

/** updateDiagnosticBaseline — 更新基线诊断 */
export function updateDiagnosticBaseline(
  state: DiagnosticTrackingState,
  newDiagnostics: readonly DiagnosticItem[],
  config?: DiagnosticTrackingConfig
): DiagnosticTrackingState {
  const effectiveConfig = config ?? DEFAULT_DIAGNOSTIC_TRACKING_CONFIG;
  if (!effectiveConfig.enabled || !effectiveConfig.trackBaseline) return state;

  // 限制基线大小
  const limited = newDiagnostics.slice(0, effectiveConfig.maxBaselineSize);

  // 检测增量变化
  const changes = effectiveConfig.trackIncremental
    ? detectDiagnosticChanges(state.baseline, limited)
    : [];

  return {
    baseline: limited,
    changes,
    lastBaselineUpdate: Date.now()
  };
}

/** detectDiagnosticChanges — 检测增量变化 */
export function detectDiagnosticChanges(
  oldBaseline: readonly DiagnosticItem[],
  newBaseline: readonly DiagnosticItem[]
): readonly DiagnosticChange[] {
  const changes: DiagnosticChange[] = [];

  const oldMap = new Map(oldBaseline.map(d => [d.id, d]));
  const newMap = new Map(newBaseline.map(d => [d.id, d]));

  // 新增的诊断
  for (const [id, diagnostic] of newMap) {
    if (!oldMap.has(id)) {
      changes.push({ type: 'added', diagnostic });
    }
  }

  // 移除的诊断
  for (const [id, diagnostic] of oldMap) {
    if (!newMap.has(id)) {
      changes.push({ type: 'removed', diagnostic });
    }
  }

  // 修改的诊断（同一ID但内容不同）
  for (const [id, newDiag] of newMap) {
    const oldDiag = oldMap.get(id);
    if (oldDiag && diagnosticModified(oldDiag, newDiag)) {
      changes.push({ type: 'modified', diagnostic: newDiag, previousDiagnostic: oldDiag });
    }
  }

  return changes;
}

/** diagnosticModified — 判断诊断是否修改 */
function diagnosticModified(old: DiagnosticItem, new_: DiagnosticItem): boolean {
  return (
    old.message !== new_.message ||
    old.severity !== new_.severity ||
    old.line !== new_.line ||
    old.code !== new_.code
  );
}

/** getNewErrors — 获取新增的error级别诊断 */
export function getNewErrors(changes: readonly DiagnosticChange[]): readonly DiagnosticItem[] {
  return changes
    .filter(c => c.type === 'added' && c.diagnostic.severity === 'error')
    .map(c => c.diagnostic);
}

/** getResolvedErrors — 获取已解决的error级别诊断 */
export function getResolvedErrors(changes: readonly DiagnosticChange[]): readonly DiagnosticItem[] {
  return changes
    .filter(c => c.type === 'removed' && c.diagnostic.severity === 'error')
    .map(c => c.diagnostic);
}
