import { type Ref, computed, ref, toValue } from 'vue';
import { useElementSize } from '@vueuse/core';
import type { DeclarativeFieldConfig } from './types';
import type { GridResponsiveMode } from './gridResponsive';
import { useGridFormCollapse } from './useGridFormCollapse';
import { useResponsiveGridColCount } from './useResponsiveGridColCount';

export interface UseSearchGridLayoutOptions {
  cols: Ref<number | string> | number | string;
  gridResponsive: Ref<GridResponsiveMode> | GridResponsiveMode;
  gridXGap: number;
  gridYGap: number;
  fields: Ref<DeclarativeFieldConfig[]>;
  collapsible: Ref<boolean> | boolean;
  collapsedRows: Ref<number> | number;
  defaultCollapsed: Ref<boolean> | boolean;
}

/**
 * 检索栏栅格：容器宽度 / 视口列数 + 折叠行数判断 + 传给 `DeclarativeForm` 的 grid 绑定。
 *
 * `self` 模式下将列数解析为数字再传给 `NGrid`（命名断点字符串在 Naive `self` 下无效）。
 */
export function useSearchGridLayout(options: UseSearchGridLayoutOptions) {
  const isSelfResponsive = computed(() => toValue(options.gridResponsive) === 'self');
  const rootRef = ref<HTMLElement | null>(null);
  const { width } = useElementSize(rootRef);

  const containerWidth = computed(() =>
    isSelfResponsive.value && width.value > 0 ? width.value : undefined
  );

  const responsiveCols = useResponsiveGridColCount(
    options.cols,
    options.gridResponsive,
    containerWidth
  );

  const collapse = useGridFormCollapse({
    fields: options.fields,
    responsiveCols,
    collapsedRows: options.collapsedRows,
    collapsible: options.collapsible,
    defaultCollapsed: options.defaultCollapsed
  });

  const gridCollapsed = computed(() =>
    toValue(options.collapsible) ? collapse.collapsed.value : undefined
  );

  const gridBind = computed(() => {
    const base = { xGap: options.gridXGap, yGap: options.gridYGap };
    if (isSelfResponsive.value) {
      return { ...base, cols: responsiveCols.value };
    }
    return {
      ...base,
      cols: toValue(options.cols),
      responsive: toValue(options.gridResponsive)
    };
  });

  const gridResponsiveProp = computed(() =>
    isSelfResponsive.value ? undefined : toValue(options.gridResponsive)
  );

  return {
    rootRef,
    gridBind,
    gridResponsiveProp,
    gridCollapsed,
    ...collapse
  };
}
