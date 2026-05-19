import { type PropType, computed, defineComponent, ref, watch } from 'vue';
import { NCard } from 'naive-ui';
import type { DataTableProps as NaiveDataTableProps, PaginationProps } from 'naive-ui';
import { SEARCH_GRID_COLS } from '@/components/declarative-form';
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
 * 典型后台「检索 + 工具条 + 表格」页面容器。
 *
 * 检索数据流：
 *
 * - **受控（推荐）**：展开 `useTablePage` 的 `searchBindings`（`searchModel` 即 `searchParams`）。
 * - **非受控**：仅传 `searchConfig`，内部 `useSearchForm` 托管。
 *
 * 详见同目录 README.md。
 */
export default defineComponent({
  name: 'TablePage',
  props: {
    // —— 检索区 ——
    /** 检索字段配置；有 `search` 插槽时插槽优先 */
    searchConfig: {
      type: Array as PropType<SearchFieldConfig[]>,
      default: undefined
    },
    /** 受控表单对象，与 searchBindings.searchModel 同一引用 */
    searchModel: {
      type: Object as PropType<object>,
      default: undefined
    },
    /** 受控单字段更新；未传且存在 searchModel 时直接写字段 */
    onUpdateSearchField: {
      type: Function as PropType<(field: string, value: unknown) => void>,
      default: undefined
    },
    /** 非受控模式下的表单初始值 */
    initialSearchModel: {
      type: Object as PropType<Record<string, unknown>>,
      default: undefined
    },
    /** 是否可展开/收起多余筛选项（超出 `searchCollapsedRows` 行时显示按钮） */
    searchCollapsible: {
      type: Boolean,
      default: true
    },
    /** 检索栅格列数，默认 `1 s:2 m:3 l:6 xl:7`（尾列留给操作按钮） */
    searchCols: {
      type: [Number, String] as PropType<number | string>,
      default: SEARCH_GRID_COLS
    },
    /** 检索栅格水平间距（px） */
    searchGridXGap: {
      type: Number,
      default: 24
    },
    /** 检索栅格垂直间距（px）；换行时行与行之间的间距 */
    searchGridYGap: {
      type: Number,
      default: 16
    },
    /** 检索栅格响应式：`screen` | `self` */
    searchGridResponsive: {
      type: String as PropType<'self' | 'screen'>,
      default: 'self'
    },
    /** 收起时保留的筛选项行数 */
    searchCollapsedRows: {
      type: Number,
      default: 2
    },
    /** 检索区初始是否收起 */
    searchDefaultCollapsed: {
      type: Boolean,
      default: false
    },
    /** 为 false 时检索区不包 NCard */
    showSearchCard: {
      type: Boolean,
      default: true
    },
    /** 检索区 NCard 是否 bordered */
    searchCardBordered: {
      type: Boolean,
      default: false
    },
    /** 是否展示检索项标签（需在各字段配置 `label`） */
    searchShowLabel: {
      type: Boolean,
      default: true
    },
    /** 检索项标签位置：`left` | `top` */
    searchLabelPlacement: {
      type: String as PropType<'left' | 'top'>,
      default: 'left'
    },
    /** 检索项左标签宽度 */
    searchLabelWidth: {
      type: [Number, String] as PropType<number | string>,
      default: 80
    },

    // —— 操作栏 ——
    /** 表格上方工具条（新增 / 批量删除 / 刷新等） */
    actionConfig: {
      type: Object as PropType<ActionBarConfig>,
      default: undefined
    },
    /** 为 false 时操作区不包 NCard */
    showActionCard: {
      type: Boolean,
      default: true
    },
    actionCardBordered: {
      type: Boolean,
      default: false
    },

    // —— 表格 ——
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
    /** 透传 NDataTable（remote、flexHeight、rowProps 等） */
    tableProps: {
      type: Object as PropType<Partial<NaiveDataTableProps>>,
      default: undefined
    },
    /** 操作栏展示列显隐 / 排序设置 */
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
    },

    // —— 事件（受控时常由 searchBindings 提供，勿与 emit 重复绑定） ——
    onSearch: {
      type: Function as PropType<(payload?: Record<string, unknown>) => void>,
      default: undefined
    },
    onReset: {
      type: Function as PropType<() => void>,
      default: undefined
    },

    // —— 布局 ——
    class: {
      type: String,
      default: ''
    },
    gapClass: {
      type: String,
      default: 'gap-16px'
    },
    padded: {
      type: Boolean,
      default: true
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
      },
      onReset: () => {
        emit('reset');
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

    /** 受控：仅 emit，由 Vue 派发至父级 `onSearch` / `@search`；勿再调 `props.onSearch`，否则与 emit 指向同一监听器时会触发两次请求。 */
    const triggerSearch = () => {
      if (props.searchModel !== undefined) {
        const snapshot = { ...(props.searchModel as Record<string, unknown>) };
        emit('search', snapshot);
      } else if (hasSearchFields.value) {
        internalSearch.handleSearch();
      }
    };

    const triggerReset = () => {
      if (props.searchModel !== undefined) {
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
            showLabel={props.searchShowLabel}
            labelPlacement={props.searchLabelPlacement}
            labelWidth={props.searchLabelWidth}
            cols={props.searchCols}
            gridXGap={props.searchGridXGap}
            gridYGap={props.searchGridYGap}
            gridResponsive={props.searchGridResponsive}
            collapsible={props.searchCollapsible}
            collapsedRows={props.searchCollapsedRows}
            defaultCollapsed={props.searchDefaultCollapsed}
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
            config={props.actionConfig ?? { showStats: false }}
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
