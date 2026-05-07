/**
 * InMemoryDiagnosticRegistry — 诊断基线跟踪和增量变化检测
 *
 * N15+N31: IDE/MCP 诊断基线跟踪 + 增量检测
 */

export interface DiagnosticEntry {
  readonly filePath: string;
  readonly severity: 'error' | 'warning' | 'info' | 'hint';
  readonly message: string;
  readonly source?: string;
  readonly code?: string;
  readonly line?: number;
  readonly column?: number;
  readonly timestamp: number;
}

export interface DiagnosticChange {
  readonly type: 'added' | 'removed' | 'modified';
  readonly filePath: string;
  readonly diagnostic: DiagnosticEntry;
}

export class InMemoryDiagnosticRegistry {
  private readonly diagnostics = new Map<string, DiagnosticEntry[]>();
  private lastBaselineTime = 0;

  /** 设置文件诊断基线 */
  setBaseline(filePath: string, entries: readonly DiagnosticEntry[]): void {
    this.diagnostics.set(filePath, [...entries]);
    this.lastBaselineTime = Date.now();
  }

  /** 获取文件诊断 */
  get(filePath: string): readonly DiagnosticEntry[] {
    return this.diagnostics.get(filePath) ?? [];
  }

  /** 检测增量变化（与上次基线比较） */
  detectChanges(
    filePath: string,
    current: readonly DiagnosticEntry[]
  ): readonly DiagnosticChange[] {
    const baseline = this.diagnostics.get(filePath) ?? [];
    const changes: DiagnosticChange[] = [];

    // 新增的诊断
    for (const diag of current) {
      const match = baseline.find(
        b =>
          b.filePath === diag.filePath && b.severity === diag.severity && b.message === diag.message
      );
      if (!match) {
        changes.push({ type: 'added', filePath, diagnostic: diag });
      }
    }

    // 移除的诊断
    for (const diag of baseline) {
      const match = current.find(
        c =>
          c.filePath === diag.filePath && c.severity === diag.severity && c.message === diag.message
      );
      if (!match) {
        changes.push({ type: 'removed', filePath, diagnostic: diag });
      }
    }

    // 更新基线
    this.setBaseline(filePath, current);

    return changes;
  }

  /** 获取上次基线时间 */
  get baselineTime(): number {
    return this.lastBaselineTime;
  }

  /** 清空所有诊断 */
  reset(): void {
    this.diagnostics.clear();
    this.lastBaselineTime = 0;
  }

  /** 诊断总数 */
  get size(): number {
    let count = 0;
    for (const entries of this.diagnostics.values()) count += entries.length;
    return count;
  }
}
