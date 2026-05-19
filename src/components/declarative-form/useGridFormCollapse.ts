import { type Ref, computed, ref, toValue, watch } from 'vue';
import type { DeclarativeFieldConfig } from './types';
import { exceedsGridCapacity, pickLeadingFields } from './grid';

/** 检索栏 `NGi suffix` 默认占 1 列，与 Naive `NGrid` 收起容量计算一致 */
export const SEARCH_GRID_SUFFIX_SPAN = 1;

export interface UseGridFormCollapseOptions<
  T extends DeclarativeFieldConfig = DeclarativeFieldConfig
> {
  fields: Ref<T[]> | T[];
  cols: Ref<number | string> | number | string;
  collapsedRows: Ref<number> | number;
  collapsible: Ref<boolean> | boolean;
  defaultCollapsed: Ref<boolean> | boolean;
  /** 当前视口列数；未传则回退为 `cols` 的最大列数 */
  responsiveCols?: Ref<number> | number;
  /** `NGrid` suffix 插槽的 `overflow`（收起态下由 Naive 按实际布局计算） */
  gridOverflow?: Ref<boolean> | boolean;
}

/** 栅格表单展开 / 收起：收起时按 span 裁剪可见字段 */
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

  const visibleFields = computed(() => {
    const fields = toValue(options.fields);
    if (!toValue(options.collapsible) || !collapsed.value) return fields;
    return pickLeadingFields(fields, toValue(options.cols), toValue(options.collapsedRows)) as T[];
  });

  const showCollapseToggle = computed(() => {
    if (!toValue(options.collapsible)) return false;
    const cols =
      options.responsiveCols !== undefined
        ? toValue(options.responsiveCols)
        : toValue(options.cols);
    const estimatedOverflow = exceedsGridCapacity(
      toValue(options.fields),
      cols,
      toValue(options.collapsedRows),
      SEARCH_GRID_SUFFIX_SPAN
    );
    if (collapsed.value) {
      return toValue(options.gridOverflow) ?? estimatedOverflow;
    }
    return estimatedOverflow;
  });

  const toggleCollapsed = () => {
    collapsed.value = !collapsed.value;
  };

  return {
    collapsed,
    visibleFields,
    showCollapseToggle,
    toggleCollapsed
  };
}
