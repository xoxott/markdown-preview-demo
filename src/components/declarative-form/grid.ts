import type { DeclarativeFieldConfig } from './types';

/**
 * 声明式表单栅格布局相关的常量与纯函数。
 *
 * 职责包括：
 *
 * - 解析字段占列（`span`）与 `NGrid.cols` 的容量
 * - 为栅格模式提供控件样式（列宽自适应）
 * - 支撑 `useGridFormCollapse` 的「按 span 裁剪首屏字段」逻辑
 *
 * 容量计算采用「最大列数 × 行数」的保守估计：对响应式 `cols` 字符串取各断点列数的最大值， 以便在任意视口下收起逻辑都不会展示超出首屏行数的字段。
 */

/** 栅格默认列数：窄屏 1 列 → 宽屏 4 列（检索栏 / 通用栅格表单共用，透传 `NGrid.cols`） */
export const DEFAULT_GRID_COLS = '1 s:2 m:3 l:4';

/**
 * 栅格单元内控件的行内样式。
 *
 * 使 input / select / date-picker 等随 `NGi` 列宽伸缩，避免固定 `width` 撑破栅格。 由 `renderDeclarativeControl` 在
 * `isGrid === true` 时写入控件 `style`。
 */
export const gridControlStyle = {
  width: '100%',
  minWidth: 0,
  maxWidth: '100%'
} as const;

/**
 * 从 `componentProps` 中移除会破坏栅格列宽伸缩的 `style` 属性。
 *
 * 调用方若在 `DeclarativeFieldConfig.componentProps.style` 中写了 `width` / `minWidth` /
 * `maxWidth`，栅格模式下会被剥离；其余 style 键保留。
 *
 * @param componentProps 字段级透传属性
 * @returns 剥离宽度相关键后的新对象（浅拷贝，不修改入参）
 */
export function stripGridFixedWidthProps(
  componentProps: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...componentProps };
  const style = next.style;

  if (style && typeof style === 'object' && !Array.isArray(style)) {
    const { width: _w, minWidth: _min, maxWidth: _max, ...rest } = style as Record<string, unknown>;
    if (Object.keys(rest).length) next.style = rest;
    else delete next.style;
  }

  return next;
}

/** 栅格下默认占 2 列的字段 type（区间选择、穿梭框等）。`date-range` 默认 1 列并配合 {@link resolveGridControlStyle} 限制最大宽度。 */
export const GRID_WIDE_FIELD_TYPES = new Set(['datetime-range', 'time-range', 'transfer']);

/**
 * 解析单个字段在栅格中占用的列数（`NGi.span`）。
 *
 * 优先级：`field.span` 显式配置 > {@link GRID_WIDE_FIELD_TYPES} 默认 2 列 > 其余为 1（含 `date-range`）。
 *
 * @param field 字段配置
 * @returns 占列数，正整数
 */
export function resolveFieldSpan(field: DeclarativeFieldConfig): number {
  if (typeof field.span === 'number') return field.span;
  if (GRID_WIDE_FIELD_TYPES.has(field.type)) return 2;
  return 1;
}

/** 检索栏等栅格下 `date-range` 的默认最大宽度，避免单格过宽 */
const DATE_RANGE_GRID_MAX_WIDTH = 'min(100%, 280px)';

/**
 * 栅格模式下合并到控件 `style` 的宽度策略。
 *
 * 在 {@link gridControlStyle} 基础上：可设 `field.gridMaxWidth`；未设时 `date-range` 使用内置上限。
 */
export function resolveGridControlStyle(field: DeclarativeFieldConfig) {
  const base = { ...gridControlStyle };
  if (field.gridMaxWidth) {
    return { ...base, maxWidth: field.gridMaxWidth };
  }
  if (field.type === 'date-range') {
    return { ...base, maxWidth: DATE_RANGE_GRID_MAX_WIDTH };
  }
  return base;
}

/**
 * 从 `NGrid.cols` 配置中解析「最大列数」。
 *
 * - 数字：直接返回。
 * - 响应式字符串：遍历空格分隔片段，取最大列数。
 *
 *   - 裸数字如 `1`、`4`
 *   - 断点前缀如 `s:2`、`l:4`（见 Naive UI `NGrid` cols 语法）
 *
 * 用于容量估算；实际渲染列数仍由 Naive 按视口决定。
 *
 * @example
 *   resolveGridColCount(4); // 4
 *   resolveGridColCount('1 s:2 m:3 l:4'); // 4
 *
 * @param cols `gridCols` / `NGrid.cols` 的值
 * @returns 解析得到的最大列数，至少为 1
 */
export function resolveGridColCount(cols: number | string): number {
  if (typeof cols === 'number') return cols;

  let max = 1;
  for (const part of cols.trim().split(/\s+/)) {
    if (/^\d+$/.test(part)) {
      max = Math.max(max, Number(part));
    } else {
      const matched = part.match(/^[a-z]+:(\d+)$/i);
      if (matched) max = Math.max(max, Number(matched[1]));
    }
  }
  return max;
}

/**
 * 栅格可容纳的字段 span 总上限（用于收起首屏计算）。
 *
 * @param cols 栅格列数配置
 * @param rows 行数（如 `collapsedRows`）
 * @returns `resolveGridColCount(cols) × rows`
 */
export function getGridFieldCapacity(cols: number | string, rows: number): number {
  return resolveGridColCount(cols) * rows;
}

/**
 * 计算字段列表的 span 总和。
 *
 * @param fields 字段配置列表
 * @returns 各字段 `resolveFieldSpan` 之和
 */
export function sumFieldSpans(fields: DeclarativeFieldConfig[]): number {
  return fields.reduce((sum, field) => sum + resolveFieldSpan(field), 0);
}

/**
 * 收起状态下保留的「从头部连续」字段子集。
 *
 * 按 `fields` 顺序累加 span，直到再加下一个字段会超过 `cols × collapsedRows` 容量为止； 不跨行回填空隙（与 CSS 栅格换行一致，采用顺序截断近似）。
 *
 * @param fields 完整字段列表
 * @param cols 栅格列数配置
 * @param collapsedRows 收起时展示的行数
 * @returns 首屏可见字段（可能为空数组）
 * @see useGridFormCollapse
 */
export function pickLeadingFields(
  fields: DeclarativeFieldConfig[],
  cols: number | string,
  collapsedRows: number
): DeclarativeFieldConfig[] {
  const capacity = getGridFieldCapacity(cols, collapsedRows);
  const result: DeclarativeFieldConfig[] = [];
  let used = 0;

  for (const field of fields) {
    const span = resolveFieldSpan(field);
    if (used + span > capacity) break;
    result.push(field);
    used += span;
  }

  return result;
}

/**
 * 判断字段总 span 是否超出栅格容量，用于决定是否展示「展开 / 收起」按钮。
 *
 * @param fields 完整字段列表
 * @param cols 栅格列数配置
 * @param rows 收起时对应的行数（与 `collapsedRows` 一致）
 * @returns 若 `sumFieldSpans(fields) > getGridFieldCapacity(cols, rows)` 则为 true
 * @see useGridFormCollapse
 */
export function exceedsGridCapacity(
  fields: DeclarativeFieldConfig[],
  cols: number | string,
  rows: number
): boolean {
  return sumFieldSpans(fields) > getGridFieldCapacity(cols, rows);
}
