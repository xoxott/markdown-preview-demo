import { computed, ref } from 'vue';
import { useTable } from '@/hooks/common/table';
import { tableListPlaceholderColumns } from '@/views/_shared/tableListPlaceholderColumns';
import type { SearchFieldConfig, TablePageSearchBindings } from '../types';

/**
 * TablePage 配套的数据 Hook：内部复用项目统一的 `useTable`（@/hooks/common/table）， 避免与 naive + suga
 * 表格请求、分页、ListData 解析重复实现。
 *
 * 搜索表单与请求参数共用 **`searchParams`**（与 `useTable` 返回的为同一 reactive）， `searchBindings` 可直接展开到 `<TablePage
 * />`，SearchBar 的字段名需与接口入参一致。
 */
export interface UseTablePageOptions<A extends NaiveUI.TableApiFn> {
  /** 列表请求：需符合 `NaiveUI.TableApiFn`（FlatResponse + ListData） */
  apiFn: A;
  /** 除 page / limit 外的默认查询参数； page、limit 由 `initialPagination` 写入初始请求，之后与分页组件联动。 */
  apiParams?: Omit<Parameters<A>[0], 'page' | 'limit'>;
  /** 仅用于 SearchBar 声明；不参与请求时也可不传 */
  searchConfig?: SearchFieldConfig[];
  /** 合并进首次 `searchParams` 的筛选项（键名应对齐接口） */
  initialSearchParams?: Partial<Omit<Parameters<A>[0], 'page' | 'limit'>>;
  initialPagination?: {
    page?: number;
    pageSize?: number;
  };
  /** 是否挂载后立即请求，默认 true */
  immediate?: boolean;
  /** 是否展示分页前缀总条数，同 `useTable` */
  showTotal?: boolean;
}

export function useTablePage<A extends NaiveUI.TableApiFn>(options: UseTablePageOptions<A>) {
  const {
    apiFn,
    apiParams: extraApiParams,
    searchConfig = [],
    initialSearchParams = {},
    initialPagination = { page: 1, pageSize: 10 },
    immediate = true,
    showTotal
  } = options;

  const page = initialPagination.page ?? 1;
  const limit = initialPagination.pageSize ?? 10;

  const mergedApiParams = {
    page,
    limit,
    ...(initialSearchParams as object),
    ...(extraApiParams as object)
  } as Parameters<A>[0];

  const tableState = useTable<A>({
    apiFn,
    apiParams: mergedApiParams,
    columns: () => tableListPlaceholderColumns<A>(),
    immediate,
    showTotal
  });

  const selectedKeys = ref<(string | number)[]>([]);

  /** 与 TablePage / SearchBar 绑定：model 即 `searchParams`， 修改字段会立刻反映到下次请求；提交搜索时仅重置页码并拉数。 */
  const searchBindings: TablePageSearchBindings = {
    searchModel: tableState.searchParams,
    onUpdateSearchField: (field: string, value: unknown) => {
      Reflect.set(tableState.searchParams, field, value);
    },
    onSearch: () => {
      tableState.updateSearchParams({ page: 1 } as Partial<Parameters<A>[0]>);
      tableState.getData();
    },
    onReset: () => {
      tableState.resetSearchParams();
      tableState.getData();
    }
  };

  const refresh = () => {
    tableState.getData();
  };

  const reload = () => {
    selectedKeys.value = [];
    tableState.resetSearchParams();
    tableState.getData();
  };

  const updateSelectedKeys = (keys: (string | number)[]) => {
    selectedKeys.value = keys;
  };

  const clearSelection = () => {
    selectedKeys.value = [];
  };

  const { columns: _unusedHookColumns, ...tableRest } = tableState;

  return {
    ...tableRest,
    selectedKeys,
    searchBindings,
    searchConfig,
    refresh,
    reload,
    updateSelectedKeys,
    clearSelection,
    hasSelection: computed(() => selectedKeys.value.length > 0),
    total: computed(() => tableState.pagination.itemCount || 0)
  };
}
