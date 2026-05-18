import { type PropType, computed, defineComponent, toRef } from 'vue';
import {
  DEFAULT_GRID_COLS,
  DeclarativeForm,
  useGridFormCollapse
} from '@/components/declarative-form';
import type { SearchFieldConfig } from './types';
import SearchFormSuffix from './SearchFormSuffix';

/** 表格页检索条：栅格排布筛选项，重置 / 搜索 / 展开按钮独占下一行。 */
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
      default: false
    },
    showActionButtons: {
      type: Boolean,
      default: true
    },
    cols: {
      type: [Number, String] as PropType<number | string>,
      default: DEFAULT_GRID_COLS
    },
    gridXGap: {
      type: Number,
      default: 24
    },
    gridYGap: {
      type: Number,
      default: 0
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
      default: 1
    },
    defaultCollapsed: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { slots }) {
    const { visibleFields, showCollapseToggle, collapsed, toggleCollapsed } = useGridFormCollapse({
      fields: toRef(props, 'config'),
      cols: toRef(props, 'cols'),
      collapsedRows: toRef(props, 'collapsedRows'),
      collapsible: toRef(props, 'collapsible'),
      defaultCollapsed: toRef(props, 'defaultCollapsed')
    });

    const showSuffix = computed(
      () => props.showActionButtons || props.collapsible || Boolean(slots.actionsExtra)
    );

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
        suffixPlacement="below-grid"
        fields={visibleFields.value}
        model={props.model as Record<string, unknown>}
        onUpdateModel={props.onUpdateModel}
        labelPlacement={props.labelPlacement}
        labelWidth={props.labelWidth}
        showLabel={props.showLabel}
        gridCols={gridBind.value.cols}
        gridXGap={gridBind.value.xGap}
        gridYGap={gridBind.value.yGap}
        gridResponsive={gridBind.value.responsive}
        onInputEnterPress={props.onSearch}
      >
        {{
          toolbarBefore: slots.toolbarBefore,
          toolbarAfter: slots.toolbarAfter,
          ...(showSuffix.value
            ? {
                suffix: () => (
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
                )
              }
            : {})
        }}
      </DeclarativeForm>
    );
  }
});
