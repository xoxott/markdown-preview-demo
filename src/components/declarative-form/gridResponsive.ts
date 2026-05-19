import { parseResponsivePropValue } from 'seemly';
import { NAIVE_GRID_BREAKPOINTS } from './grid';

export type GridResponsiveMode = 'self' | 'screen';

/** 将容器宽度映射为 Naive 命名断点列表（`s:` / `l:` 等） */
export function breakpointKeysForWidth(width: number): string[] {
  return (Object.keys(NAIVE_GRID_BREAKPOINTS) as Array<keyof typeof NAIVE_GRID_BREAKPOINTS>).filter(
    key => width >= NAIVE_GRID_BREAKPOINTS[key]
  );
}

/** 按断点名列表解析 `cols` 字符串，得到当前列数 */
export function resolveColCountForBreakpointKeys(
  cols: number | string,
  activeKeys: string[]
): number {
  if (typeof cols === 'number') {
    return cols > 0 ? cols : 1;
  }
  const parsed = parseResponsivePropValue(cols, activeKeys);
  const n = Number(parsed);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export interface ResolveResponsiveColCountOptions {
  mode: GridResponsiveMode;
  /** `mode === 'self'` 时传入容器宽度（px） */
  containerWidth?: number;
  /** `mode === 'screen'` 时传入 vooks `useBreakpoints` 的激活断点名 */
  screenBreakpointKeys?: string[];
}

/**
 * 解析当前栅格列数。
 *
 * - `screen`：视口断点（`s:` / `m:` 等命名断点）
 * - `self`：容器宽度映射为断点后解析（勿把像素直接传给 Naive `cols` 字符串）
 */
export function resolveResponsiveColCount(
  cols: number | string,
  options: ResolveResponsiveColCountOptions
): number {
  if (options.mode === 'self') {
    const width = options.containerWidth;
    if (width !== undefined && width !== null && width > 0) {
      return resolveColCountForBreakpointKeys(cols, breakpointKeysForWidth(width));
    }
    return 1;
  }
  return resolveColCountForBreakpointKeys(cols, options.screenBreakpointKeys ?? []);
}
