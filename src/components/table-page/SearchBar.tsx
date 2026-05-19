import { type PropType, computed, defineComponent, ref, toRef } from 'vue';
import {
  DeclarativeForm,
  SEARCH_GRID_COLS,
  useGridFormCollapse,
  useResponsiveGridColCount
} from '@/components/declarative-form';
import type { DeclarativeFormSuffixSlotProps } from '@/components/declarative-form';
import type { SearchFieldConfig } from './types';
import SearchFormSuffix from './SearchFormSuffix';

/** 表格页检索条：栅格排布筛选项，操作区占最后一行尾列（对齐 Pro Naive `ProSearchForm`）。 */
export default defineComponent({
  name: 'SearchBar',
  props: {
    config: {
      type: Array as PropType<SearchFieldConfig[]>,
      required: true
    },
    model: {
      type: Object as PropType<object>,
      required: true
    },
    onSearch: {
      type: Function as PropType<() => void>,
      required: true
    },
    onReset: {
      type: Function as PropType<() => void>,
      required: true
    },
    onUpdateModel: {
      type: Function as PropType<(field: string, value: unknown) => void>,
      required: true
    },
    labelPlacement: {
      type: String as PropType<'left' | 'top'>,
      default: 'left'
    },
    labelWidth: {
      type: [Number, String] as PropType<number | string>,
      default: 80
    },
    showLabel: {
      type: Boolean,
      default: true
    },
    showActionButtons: {
      type: Boolean,
      default: true
    },
    cols: {
      type: [Number, String] as PropType<number | string>,
      default: SEARCH_GRID_COLS
    },
    gridXGap: {
      type: Number,
      default: 24
    },
    /** 换行时的行间距；检索项已关闭 feedback，需靠 yGap 撑开多行 */
    gridYGap: {
      type: Number,
      default: 16
    },
    gridResponsive: {
      type: String as PropType<'self' | 'screen'>,
      default: 'screen'
    },
    collapsible: {
      type: Boolean,
      default: false
    },
    collapsedRows: {
      type: Number,
      default: 2
    },
    defaultCollapsed: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { slots }) {
    const gridOverflow = ref(false);
    const responsiveCols = useResponsiveGridColCount(
      toRef(props, 'cols'),
      toRef(props, 'gridResponsive')
    );

    const { showCollapseToggle, collapsed, toggleCollapsed } = useGridFormCollapse({
      fields: toRef(props, 'config'),
      cols: toRef(props, 'cols'),
      collapsedRows: toRef(props, 'collapsedRows'),
      collapsible: toRef(props, 'collapsible'),
      defaultCollapsed: toRef(props, 'defaultCollapsed'),
      responsiveCols,
      gridOverflow
    });

    const showSuffix = computed(
      () => props.showActionButtons || props.collapsible || Boolean(slots.actionsExtra)
    );

    const gridCollapsed = computed(() => (props.collapsible ? collapsed.value : undefined));

    const gridBind = computed(() => ({
      cols: props.cols,
      xGap: props.gridXGap,
      yGap: props.gridYGap,
      responsive: props.gridResponsive
    }));

    return () => (
      <DeclarativeForm
        class="w-full"
        layout="grid"
        suffixPlacement="grid-cell"
        fields={props.config}
        model={props.model as Record<string, unknown>}
        onUpdateModel={props.onUpdateModel}
        labelPlacement={props.labelPlacement}
        labelWidth={props.labelWidth}
        showLabel={props.showLabel}
        gridCols={gridBind.value.cols}
        gridXGap={gridBind.value.xGap}
        gridYGap={gridBind.value.yGap}
        gridResponsive={gridBind.value.responsive}
        gridCollapsed={gridCollapsed.value}
        gridCollapsedRows={props.collapsedRows}
        onInputEnterPress={props.onSearch}
      >
        {{
          toolbarBefore: slots.toolbarBefore,
          toolbarAfter: slots.toolbarAfter,
          ...(showSuffix.value
            ? {
                suffix: (slotProps?: DeclarativeFormSuffixSlotProps) => {
                  if (props.collapsible && collapsed.value) {
                    gridOverflow.value = Boolean(slotProps?.overflow);
                  }
                  return (
                    <SearchFormSuffix
                      showSearch={props.showActionButtons}
                      showReset={props.showActionButtons}
                      showCollapse={showCollapseToggle.value}
                      collapsed={collapsed.value}
                      onSearch={props.onSearch}
                      onReset={props.onReset}
                      onToggleCollapse={toggleCollapsed}
                    >
                      {slots.actionsExtra?.()}
                    </SearchFormSuffix>
                  );
                }
              }
            : {})
        }}
      </DeclarativeForm>
    );
  }
});
