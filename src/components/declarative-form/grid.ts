import type { DeclarativeFieldConfig } from './types';

/**
 * 声明式表单栅格布局相关的常量与纯函数。
 *
 * 职责包括：
 *
 * - 解析字段占列（`span`）与 `NGrid.cols` 的容量
 * - 为栅格模式提供控件样式（列宽自适应）
 * - 支撑 `useGridFormCollapse` 判断是否展示展开按钮（`gridExceedsCollapsedRows`）
 */

/** 栅格默认列数：窄屏 1 列 → 宽屏 4 列（弹窗等多列表单，透传 `NGrid.cols`） */
export const DEFAULT_GRID_COLS = '1 s:2 m:3 l:4';

/**
 * 检索栏栅格列数：窄屏 1 列 → 大屏 7 列。
 *
 * 命名断点（`s:` / `l:`）仅适用于 `NGrid.responsive="screen"`；`self` 时由 SearchBar 先解析为数字再传入。
 */
export const SEARCH_GRID_COLS = '1 s:2 m:3 l:6 xl:7';

/** 检索栏 `NGi suffix` 占列，与 Naive `NGrid` 收起算法一致 */
export const SEARCH_GRID_SUFFIX_SPAN = 1;

/** 与 Naive UI `NGrid`（`responsive="screen"`）一致的断点，用于按视口解析 `cols` */
export const NAIVE_GRID_BREAKPOINTS = {
  xs: 0,
  s: 640,
  m: 1024,
  l: 1280,
  xl: 1536,
  xxl: 1920
} as const;

/**
 * 栅格控件默认宽度策略（`width` / `min-width` / `max-width`）见 `declarative-form.scss` 的
 * `.declarative-form__control`。 此处仅保留需按字段覆盖的 `maxWidth`。
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

/** 栅格下仅注入字段级 `maxWidth` 覆盖；其余宽度由 `.declarative-form__control` 样式承担 */
export function resolveGridControlStyle(field: DeclarativeFieldConfig) {
  if (field.gridMaxWidth) {
    return { maxWidth: field.gridMaxWidth };
  }
  if (field.type === 'date-range') {
    return { maxWidth: DATE_RANGE_GRID_MAX_WIDTH };
  }
  return undefined;
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
 * 用于未接入 {@link useResponsiveGridColCount} 时的回退上界。
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
 * 按当前列数判断收起后是否会超过 `collapsedRows` 行（对齐 Naive UI `NGrid` 收起逻辑）。
 *
 * 用于：宽屏仅 1 行无需按钮，缩窄后列数变少、行数变多时再显示展开/收起。
 *
 * @param fields 筛选项（不含 suffix）
 * @param responsiveCols 当前栅格实际列数
 * @param collapsedRows 收起保留行数
 * @param suffixSpan 默认 {@link SEARCH_GRID_SUFFIX_SPAN}
 */
export function gridExceedsCollapsedRows(
  fields: DeclarativeFieldConfig[],
  responsiveCols: number,
  collapsedRows: number,
  suffixSpan = SEARCH_GRID_SUFFIX_SPAN
): boolean {
  const cols = Math.max(responsiveCols, 1);
  const rows = Math.max(collapsedRows, 1);
  const rowCapacity = cols * rows;
  let spanCounter = 0;

  for (const field of fields) {
    const childSpan = Math.min(resolveFieldSpan(field), cols);
    const remainder = spanCounter % cols;
    if (childSpan + remainder > cols) {
      spanCounter += cols - remainder;
    }
    if (childSpan + spanCounter + suffixSpan > rowCapacity) {
      return true;
    }
    spanCounter += childSpan;
  }

  return false;
}
