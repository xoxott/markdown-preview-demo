import { type PropType, computed, defineComponent, toRef } from 'vue';
import {
  DeclarativeForm,
  SEARCH_GRID_COLS,
  useSearchGridLayout
} from '@/components/declarative-form';
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
    gridYGap: {
      type: Number,
      default: 16
    },
    gridResponsive: {
      type: String as PropType<'self' | 'screen'>,
      default: 'self'
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
    const grid = useSearchGridLayout({
      cols: toRef(props, 'cols'),
      gridResponsive: toRef(props, 'gridResponsive'),
      gridXGap: props.gridXGap,
      gridYGap: props.gridYGap,
      fields: toRef(props, 'config'),
      collapsible: toRef(props, 'collapsible'),
      collapsedRows: toRef(props, 'collapsedRows'),
      defaultCollapsed: toRef(props, 'defaultCollapsed')
    });

    const showSuffix = computed(
      () => props.showActionButtons || props.collapsible || Boolean(slots.actionsExtra)
    );

    return () => (
      <div ref={grid.rootRef} class="w-full">
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
          gridCols={grid.gridBind.value.cols}
          gridXGap={grid.gridBind.value.xGap}
          gridYGap={grid.gridBind.value.yGap}
          gridResponsive={grid.gridResponsiveProp.value}
          gridCollapsed={grid.gridCollapsed.value}
          gridCollapsedRows={props.collapsedRows}
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
                      showCollapse={grid.showCollapseToggle.value}
                      collapsed={grid.collapsed.value}
                      onSearch={props.onSearch}
                      onReset={props.onReset}
                      onToggleCollapse={grid.toggleCollapsed}
                    >
                      {slots.actionsExtra?.()}
                    </SearchFormSuffix>
                  )
                }
              : {})
          }}
        </DeclarativeForm>
      </div>
    );
  }
});
