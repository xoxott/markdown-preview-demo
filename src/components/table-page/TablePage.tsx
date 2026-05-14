import { type PropType, computed, defineComponent, ref, watch } from 'vue';
import { NCard } from 'naive-ui';
import type { DataTableProps as NaiveDataTableProps, PaginationProps } from 'naive-ui';
import type { ActionBarConfig, SearchFieldConfig, TableColumnConfig } from './types';
import SearchBar from './SearchBar';
import ActionBar from './ActionBar';
import DataTable from './DataTable';
import { useSearchForm } from './hooks/useSearchForm';
import {
  applyTablePageColumnChecks,
  getTablePageColumnChecks,
  mergeTablePageColumnChecks
} from './utils/columnChecks';

/**
 * 典型后台「筛选 + 工具条 + 表格」三栏布局的页面级容器。
 *
 * 搜索数据流（重要）：
 *
 * - **受控（推荐）**：传入 `searchModel` + `onUpdateSearchField` + `onSearch` + `onReset`， 与 `useTablePage`
 *   返回的 `searchBindings`（底层为 `useTable` 的 `searchParams`）对齐，保证请求参数与 UI 同步。
 * - **非受控**：仅传 `searchConfig`（及可选 `initialSearchModel`）时，由本组件内部 `useSearchForm`
 *   托管表单；适合静态演示或与外部请求逻辑解耦的场景。
 *
 * 扩展点：
 *
 * - `search` 插槽：完全自定义筛选区（仍建议外层用 NCard 保持视觉一致）。
 * - `searchCollapsible` / `searchCollapsedRows` / `searchCollapsedRowHeightPx`：搜索区多行时展开收起。
 * - `enableColumnSetting`：在操作栏集成列显隐 / 拖拽排序（复用 `advanced/TableColumnSetting`）； 可与 `columnChecks` +
 *   `onUpdateColumnChecks` 受控配合。
 * - `tableProps`：向 naive `NDataTable` 透传 `remote`、`flexHeight`、`rowProps` 等原生能力。
 */
export default defineComponent({
  name: 'TablePage',
  props: {
    searchConfig: {
      type: Array as PropType<SearchFieldConfig[]>,
      default: undefined
    },
    /** 受控：外部持有的表单对象，一般即 useSearchForm().formModel */
    searchModel: {
      type: Object as PropType<object>,
      default: undefined
    },
    /** 受控：单字段更新；缺省时若存在 searchModel 则直接写入该对象字段 */
    onUpdateSearchField: {
      type: Function as PropType<(field: string, value: unknown) => void>,
      default: undefined
    },
    /** 非受控：内部表单的初始值 */
    initialSearchModel: {
      type: Object as PropType<Record<string, unknown>>,
      default: undefined
    },
    actionConfig: {
      type: Object as PropType<ActionBarConfig>,
      default: undefined
    },
    columns: {
      type: Array as PropType<TableColumnConfig[]>,
      required: true
    },
    data: {
      type: Array as PropType<any[]>,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    pagination: {
      type: Object as PropType<PaginationProps>,
      default: undefined
    },
    selectedKeys: {
      type: Array as PropType<(string | number)[]>,
      default: () => []
    },
    rowKey: {
      type: [String, Function] as PropType<string | ((row: any) => string | number)>,
      default: 'id'
    },
    onSearch: {
      type: Function as PropType<(payload?: Record<string, unknown>) => void>,
      default: undefined
    },
    onReset: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onUpdateSelectedKeys: {
      type: Function as PropType<(keys: (string | number)[]) => void>,
      default: undefined
    },
    scrollX: {
      type: Number,
      default: undefined
    },
    showIndex: {
      type: Boolean,
      default: true
    },
    showSelection: {
      type: Boolean,
      default: true
    },
    striped: {
      type: Boolean,
      default: true
    },
    size: {
      type: String as PropType<'small' | 'medium' | 'large'>,
      default: 'small'
    },
    bordered: {
      type: Boolean,
      default: false
    },
    maxHeight: {
      type: [String, Number] as PropType<string | number>,
      default: '100%'
    },
    class: {
      type: String,
      default: ''
    },
    /** 为 false 时搜索区不包 NCard（插槽自定义时常关） */
    showSearchCard: {
      type: Boolean,
      default: true
    },
    searchCardBordered: {
      type: Boolean,
      default: false
    },
    searchCollapsible: {
      type: Boolean,
      default: false
    },
    searchCollapsedRows: {
      type: Number,
      default: 1
    },
    searchCollapsedRowHeightPx: {
      type: Number,
      default: 52
    },
    searchDefaultExpanded: {
      type: Boolean,
      default: false
    },
    showActionCard: {
      type: Boolean,
      default: true
    },
    actionCardBordered: {
      type: Boolean,
      default: false
    },
    gapClass: {
      type: String,
      default: 'gap-16px'
    },
    padded: {
      type: Boolean,
      default: true
    },
    /** 透传给 NDataTable，见 README「表格透传」 */
    tableProps: {
      type: Object as PropType<Partial<NaiveDataTableProps>>,
      default: undefined
    },
    enableColumnSetting: {
      type: Boolean,
      default: false
    },
    columnChecks: {
      type: Array as PropType<NaiveUI.TableColumnCheck[]>,
      default: undefined
    },
    onUpdateColumnChecks: {
      type: Function as PropType<(next: NaiveUI.TableColumnCheck[]) => void>,
      default: undefined
    }
  },
  emits: ['search', 'reset', 'update:columnChecks'],
  setup(props, { emit, slots }) {
    const internalControlledAtInit =
      props.enableColumnSetting &&
      props.columnChecks !== undefined &&
      props.onUpdateColumnChecks !== undefined;

    const internalColumnChecks = ref<NaiveUI.TableColumnCheck[]>(
      props.enableColumnSetting && !internalControlledAtInit
        ? getTablePageColumnChecks(props.columns)
        : []
    );

    const isChecksControlled = computed(
      () =>
        props.enableColumnSetting &&
        props.columnChecks !== undefined &&
        props.onUpdateColumnChecks !== undefined
    );

    const activeColumnChecks = computed((): NaiveUI.TableColumnCheck[] => {
      if (!props.enableColumnSetting) return [];
      if (isChecksControlled.value) return props.columnChecks as NaiveUI.TableColumnCheck[];
      return internalColumnChecks.value;
    });

    const patchColumnChecks = (next: NaiveUI.TableColumnCheck[]) => {
      if (!props.enableColumnSetting) return;
      if (isChecksControlled.value) {
        props.onUpdateColumnChecks!(next);
      } else {
        internalColumnChecks.value = next;
      }
      emit('update:columnChecks', next);
    };

    watch(
      () => props.columns,
      cols => {
        if (!props.enableColumnSetting || isChecksControlled.value) return;
        internalColumnChecks.value = mergeTablePageColumnChecks(cols, internalColumnChecks.value);
      },
      { deep: true, immediate: true }
    );

    const displayColumns = computed(() => {
      if (!props.enableColumnSetting) return props.columns;
      const checks = activeColumnChecks.value;
      if (checks.length === 0) return props.columns;
      return applyTablePageColumnChecks(props.columns, checks);
    });

    /** 内部搜索：仅当未传入 searchModel 且存在 searchConfig 时启用。 若已受控，则 config 传空数组，避免维护两套互不同步的 model。 */
    const internalSearch = useSearchForm({
      config: props.searchModel !== undefined ? [] : (props.searchConfig ?? []),
      initialValues: (props.initialSearchModel as Record<string, unknown>) ?? {},
      onSearch: values => {
        emit('search', values as Record<string, unknown>);
        props.onSearch?.(values as Record<string, unknown>);
      },
      onReset: () => {
        emit('reset');
        props.onReset?.();
      }
    });

    /** 实际绑定到 SearchBar 的 model：受控优先 */
    const activeSearchModel = computed(() => props.searchModel ?? internalSearch.formModel);

    const hasSearchFields = computed(() => (props.searchConfig?.length ?? 0) > 0);

    const showSearchBlock = computed(() => Boolean(slots.search) || hasSearchFields.value);

    /** 单字段写入：显式回调 > 直接写 searchModel > 写内部表单 */
    const patchSearchField = (field: string, value: unknown) => {
      if (props.onUpdateSearchField) {
        props.onUpdateSearchField(field, value);
      } else if (props.searchModel) {
        (props.searchModel as Record<string, unknown>)[field] = value as never;
      } else {
        internalSearch.updateModel(field, value);
      }
    };

    /** 受控：由父级 reset；非受控：走内部 handleSearch 链（已含 emit） */
    const triggerSearch = () => {
      if (props.searchModel !== undefined) {
        const snapshot = { ...(props.searchModel as Record<string, unknown>) };
        emit('search', snapshot);
        props.onSearch?.(snapshot);
      } else if (hasSearchFields.value) {
        internalSearch.handleSearch();
      }
    };

    const triggerReset = () => {
      if (props.searchModel !== undefined) {
        props.onReset?.();
        emit('reset');
      } else if (hasSearchFields.value) {
        internalSearch.handleReset();
      }
    };

    const rootClass = computed(() =>
      `h-full flex flex-col overflow-hidden ${props.gapClass} ${props.padded ? 'p-16px' : ''} ${props.class}`.trim()
    );

    const renderSearchArea = () => {
      if (!showSearchBlock.value) return null;

      const inner =
        slots.search?.() ??
        (hasSearchFields.value ? (
          <SearchBar
            config={props.searchConfig!}
            model={activeSearchModel.value}
            onSearch={triggerSearch}
            onReset={triggerReset}
            onUpdateModel={patchSearchField}
            collapsible={props.searchCollapsible}
            collapsedRows={props.searchCollapsedRows}
            collapsedRowHeightPx={props.searchCollapsedRowHeightPx}
            defaultExpanded={props.searchDefaultExpanded}
          />
        ) : null);

      if (!inner) return null;

      if (props.showSearchCard === false) {
        return <div class="flex-shrink-0">{inner}</div>;
      }

      return (
        <NCard class="flex-shrink-0" bordered={props.searchCardBordered}>
          {inner}
        </NCard>
      );
    };

    const renderActionArea = () => {
      if (!props.actionConfig && !slots.action && !props.enableColumnSetting) return null;
      const inner =
        slots.action?.() ??
        (props.actionConfig || props.enableColumnSetting ? (
          <ActionBar
            config={props.actionConfig ?? { showStats: true }}
            selectedKeys={props.selectedKeys}
            total={props.pagination?.itemCount ?? props.data.length}
            columnSetting={
              props.enableColumnSetting
                ? {
                    checks: activeColumnChecks.value,
                    onUpdateChecks: patchColumnChecks
                  }
                : undefined
            }
          />
        ) : null);

      if (!inner) return null;

      if (props.showActionCard === false) {
        return <div class="flex-shrink-0">{inner}</div>;
      }

      return (
        <NCard class="flex-shrink-0" bordered={props.actionCardBordered}>
          {inner}
        </NCard>
      );
    };

    return () => (
      <div class={rootClass.value}>
        {renderSearchArea()}
        {renderActionArea()}
        <NCard
          class="flex-1 overflow-hidden"
          bordered={false}
          contentStyle={{ height: '100%', padding: 0 }}
        >
          {slots.tablePrepend?.()}
          <DataTable
            columns={displayColumns.value}
            data={props.data}
            loading={props.loading}
            pagination={props.pagination}
            selectedKeys={props.selectedKeys}
            rowKey={props.rowKey}
            onUpdateSelectedKeys={props.onUpdateSelectedKeys}
            scrollX={props.scrollX}
            showIndex={props.showIndex}
            showSelection={props.showSelection}
            striped={props.striped}
            size={props.size}
            bordered={props.bordered}
            maxHeight={props.maxHeight}
            tableProps={props.tableProps}
          />
          {slots.tableAppend?.()}
        </NCard>
      </div>
    );
  }
});
