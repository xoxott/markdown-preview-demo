import { type Ref, computed, ref, toValue, watch } from 'vue';
import type { DeclarativeFieldConfig } from './types';
import { SEARCH_GRID_SUFFIX_SPAN, gridExceedsCollapsedRows } from './grid';

export interface UseGridFormCollapseOptions<
  T extends DeclarativeFieldConfig = DeclarativeFieldConfig
> {
  fields: Ref<T[]> | T[];
  responsiveCols: Ref<number> | number;
  collapsedRows: Ref<number> | number;
  collapsible: Ref<boolean> | boolean;
  defaultCollapsed: Ref<boolean> | boolean;
}

function normalizeColCount(cols: number): number {
  return cols > 0 ? cols : 1;
}

/** 栅格检索展开 / 收起：是否显示按钮、是否透传 `NGrid.collapsed` 由 {@link gridExceedsCollapsedRows} 判定 */
export function useGridFormCollapse<T extends DeclarativeFieldConfig>(
  options: UseGridFormCollapseOptions<T>
) {
  const collapsed = ref(toValue(options.defaultCollapsed));

  watch(
    () => toValue(options.defaultCollapsed),
    value => {
      collapsed.value = value;
    }
  );

  const colCount = computed(() => normalizeColCount(toValue(options.responsiveCols)));

  const exceedsCollapsedRows = computed(() =>
    gridExceedsCollapsedRows(
      toValue(options.fields),
      colCount.value,
      toValue(options.collapsedRows),
      SEARCH_GRID_SUFFIX_SPAN
    )
  );

  const showCollapseToggle = computed(
    () => toValue(options.collapsible) && exceedsCollapsedRows.value
  );

  /** 布局变窄导致超出 `collapsedRows` 时自动收起 */
  watch([colCount, () => toValue(options.fields), () => toValue(options.collapsible)], () => {
    if (!toValue(options.collapsible) || !exceedsCollapsedRows.value) return;
    collapsed.value = true;
  });

  const toggleCollapsed = () => {
    collapsed.value = !collapsed.value;
  };

  return {
    collapsed,
    showCollapseToggle,
    toggleCollapsed
  };
}
