import { DEFAULT_TABLE_PAGE_SIZE } from '@/constants/datatable';
import { useTable } from '@/hooks/common/table';
import { tableListPlaceholderColumns } from '@/views/_shared/tableListPlaceholderColumns';

type ListParams<A extends NaiveUI.TableApiFn> = Parameters<A>[0];

/**
 * 后台「TablePage + 占位列 + useTable」列表的统一入口：
 *
 * - 写入默认 `page` / `limit`（与全局 {@link DEFAULT_TABLE_PAGE_SIZE} 一致）
 * - 提供与分页联动的 **`onSearch` / `onReset`**，避免各页重复 `updateSearchParams` 胶水代码
 * - **`getListLimit`** 供远程排序等场景与当前 `pageSize` 对齐
 */
export interface UseAdminListTableOptions<A extends NaiveUI.TableApiFn> {
  apiFn: A;
  /** 除分页外的初始查询字段，需与接口入参键名一致 */
  listFilters?: Omit<ListParams<A>, 'page' | 'limit'>;
  immediate?: boolean;
  showTotal?: boolean;
}

export function useAdminListTable<A extends NaiveUI.TableApiFn>(
  options: UseAdminListTableOptions<A>
) {
  const { apiFn, listFilters, immediate = true, showTotal } = options;

  const apiParams = {
    page: 1,
    limit: DEFAULT_TABLE_PAGE_SIZE,
    ...(listFilters as object)
  } as ListParams<A>;

  const tableState = useTable<A>({
    apiFn,
    apiParams,
    columns: () => tableListPlaceholderColumns<A>(),
    immediate,
    showTotal
  });

  const getListLimit = () =>
    (tableState.pagination.pageSize as number | undefined) ?? DEFAULT_TABLE_PAGE_SIZE;

  function onSearch() {
    tableState.updateSearchParams({
      page: 1,
      limit: getListLimit()
    } as Partial<ListParams<A>>);
    tableState.getData();
  }

  function onReset() {
    tableState.resetSearchParams();
    tableState.getData();
  }

  return {
    ...tableState,
    onSearch,
    onReset,
    getListLimit
  };
}
