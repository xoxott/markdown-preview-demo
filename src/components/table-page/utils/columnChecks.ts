import type { TableColumnCheckFixed } from '@suga/hooks';
import type { TableColumnConfig } from '../types';

type ColumnCheck = NaiveUI.TableColumnCheck;

function fixedFromColumn(col: TableColumnConfig): TableColumnCheckFixed {
  const f = (col as { fixed?: 'left' | 'right' }).fixed;
  return f === 'left' || f === 'right' ? f : 'unFixed';
}

/** 由 `TableColumnConfig[]` 生成列设置初始状态（全部勾选） */
export function getTablePageColumnChecks(columns: TableColumnConfig[]): ColumnCheck[] {
  return columns.map(col => ({
    key: String(col.key),
    title: typeof col.title === 'string' && col.title ? col.title : String(col.key),
    checked: true,
    visible: true,
    fixed: fixedFromColumn(col)
  }));
}

/** 列定义变更时合并勾选状态：新列默认勾选；已删列从 checks 中消失； 顺序与标题以当前 `columns` 为准（与 `useTable.reloadColumns` 行为一致）。 */
export function mergeTablePageColumnChecks(
  columns: TableColumnConfig[],
  prev: ColumnCheck[]
): ColumnCheck[] {
  const next = getTablePageColumnChecks(columns);
  const prevMap = new Map(prev.map(c => [c.key, c]));
  return next.map(c => {
    const p = prevMap.get(c.key);
    return {
      ...c,
      checked: p?.checked ?? c.checked,
      fixed: p?.fixed ?? c.fixed,
      visible: p?.visible ?? c.visible
    };
  });
}

/** 按列设置过滤并排序，得到实际传给 DataTable 的列配置 */
export function applyTablePageColumnChecks(
  columns: TableColumnConfig[],
  checks: ColumnCheck[]
): TableColumnConfig[] {
  const map = new Map(columns.map(c => [String(c.key), c]));
  const out: TableColumnConfig[] = [];
  for (const check of checks) {
    if (!check.checked) continue;
    const col = map.get(String(check.key));
    if (!col) continue;
    const fixed = check.fixed === 'left' || check.fixed === 'right' ? check.fixed : undefined;
    out.push({ ...col, fixed });
  }
  return out;
}
