import { type Ref, computed, toValue } from 'vue';
import { parseResponsivePropValue } from 'seemly';
import { useBreakpoints } from 'vooks';
import { NAIVE_GRID_BREAKPOINTS, resolveGridColCount } from './grid';

/** 按视口解析 `NGrid.cols`（`responsive="screen"`），与 Naive `NGrid` 列数一致 */
export function useResponsiveGridColCount(
  cols: Ref<number | string> | number | string,
  responsive: Ref<'self' | 'screen'> | 'self' | 'screen' = 'screen'
) {
  const breakpoints = useBreakpoints(NAIVE_GRID_BREAKPOINTS);

  return computed(() => {
    const colsValue = toValue(cols);
    if (toValue(responsive) !== 'screen') {
      return resolveGridColCount(colsValue);
    }
    const activeKeys = breakpoints.value;
    const parsed = parseResponsivePropValue(colsValue.toString(), activeKeys);
    const n = Number(parsed);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
}
