import { type Ref, computed, ref, toValue, watch } from 'vue';
import type { DeclarativeFieldConfig } from './types';
import { exceedsGridCapacity, pickLeadingFields } from './grid';

export interface UseGridFormCollapseOptions<
  T extends DeclarativeFieldConfig = DeclarativeFieldConfig
> {
  fields: Ref<T[]> | T[];
  cols: Ref<number | string> | number | string;
  collapsedRows: Ref<number> | number;
  collapsible: Ref<boolean> | boolean;
  defaultCollapsed: Ref<boolean> | boolean;
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
    return exceedsGridCapacity(
      toValue(options.fields),
      toValue(options.cols),
      toValue(options.collapsedRows)
    );
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
