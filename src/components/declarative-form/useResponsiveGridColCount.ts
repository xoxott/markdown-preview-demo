import { type Ref, computed, toValue } from 'vue';
import { useBreakpoints } from 'vooks';
import { NAIVE_GRID_BREAKPOINTS } from './grid';
import { resolveResponsiveColCount } from './gridResponsive';

/** 跟踪视口或容器宽度，解析与 `NGrid` 一致的当前列数 */
export function useResponsiveGridColCount(
  cols: Ref<number | string> | number | string,
  responsive: Ref<'self' | 'screen'> | 'self' | 'screen',
  containerWidth?: Ref<number | undefined>
) {
  const screenBreakpoints = useBreakpoints(NAIVE_GRID_BREAKPOINTS);

  return computed(() => {
    const mode = toValue(responsive);
    return resolveResponsiveColCount(toValue(cols), {
      mode,
      containerWidth: containerWidth ? toValue(containerWidth) : undefined,
      screenBreakpointKeys: screenBreakpoints.value
    });
  });
}
