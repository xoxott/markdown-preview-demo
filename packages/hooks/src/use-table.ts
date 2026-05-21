import { computed, reactive, ref } from 'vue';
import type { Ref, VNodeChild } from 'vue';
import { jsonClone } from '@suga/utils';
import useBoolean from './use-boolean';
import useLoading from './use-loading';

export type MaybePromise<T> = T | Promise<T>;

export type ApiFn = (args: any) => Promise<unknown>;

export type TableColumnCheckTitle = string | ((...args: any) => VNodeChild);

/** 列设置里「固定」状态；`unFixed` 表示不固定（与 SoybeanAdmin 一致） */
export type TableColumnCheckFixed = 'left' | 'right' | 'unFixed';

export type TableColumnCheck = {
  key: string;
  title: TableColumnCheckTitle;
  checked: boolean;
  /** 是否在列设置面板中展示该行；为 false 时整行隐藏 */
  visible?: boolean;
  /** 列固定；未传时由业务侧按 `unFixed` 处理 */
  fixed?: TableColumnCheckFixed;
};

export type TableDataWithIndex<T> = T & { index: number };

export type TransformedData<T> = {
  data: TableDataWithIndex<T>[];
  pageNum: number;
  pageSize: number;
  total: number;
};

export type Transformer<T, Response> = (response: Response) => TransformedData<T>;

export type TableConfig<A extends ApiFn, T, C> = {
  /** api function to get table data */
  apiFn: A;
  /** api params */
  apiParams?: Parameters<A>[0];
  /** transform api response to table data */
  transformer: Transformer<T, Awaited<ReturnType<A>>>;
  /** columns factory */
  columns: () => C[];
  /**
   * get column checks
   *
   * @param columns
   */
  getColumnChecks: (columns: C[]) => TableColumnCheck[];
  /**
   * get columns
   *
   * @param columns
   */
  getColumns: (columns: C[], checks: TableColumnCheck[]) => C[];
  /**
   * callback when response fetched
   *
   * @param transformed transformed data
   */
  onFetched?: (transformed: TransformedData<T>) => MaybePromise<void>;
  /**
   * whether to get data immediately
   *
   * @default true
   */
  immediate?: boolean;
};

export default function useTable<A extends ApiFn, T, C>(config: TableConfig<A, T, C>) {
  const { loading, startLoading, endLoading } = useLoading();
  const { bool: empty, setBool: setEmpty } = useBoolean();

  const { apiFn, apiParams, transformer, immediate = true, getColumnChecks, getColumns } = config;

  const searchParams: NonNullable<Parameters<A>[0]> = reactive(jsonClone({ ...apiParams }));

  const allColumns = ref(config.columns()) as Ref<C[]>;

  const data: Ref<TableDataWithIndex<T>[]> = ref([]);

  const columnChecks: Ref<TableColumnCheck[]> = ref(getColumnChecks(config.columns()));

  const columns = computed(() => getColumns(allColumns.value, columnChecks.value));

  function reloadColumns() {
    allColumns.value = config.columns();

    const prevMap = new Map(columnChecks.value.map(col => [col.key, col]));

    const defaultChecks = getColumnChecks(allColumns.value);

    columnChecks.value = defaultChecks.map(col => {
      const prev = prevMap.get(col.key);
      return {
        ...col,
        checked: prev?.checked ?? col.checked,
        fixed: prev?.fixed ?? col.fixed,
        visible: prev?.visible ?? col.visible
      };
    });
  }

  /** 列表拉数代数：仅最新一次请求可写回 data / 结束 loading，避免翻页或改筛选时的后发先至 */
  let fetchGeneration = 0;

  async function getData() {
    const generation = ++fetchGeneration;
    startLoading();

    try {
      const formattedParams = formatSearchParams(searchParams);
      const response = await apiFn(formattedParams);

      if (generation !== fetchGeneration) {
        return;
      }

      const transformed = transformer(response as Awaited<ReturnType<A>>);

      data.value = transformed.data;
      setEmpty(transformed.data.length === 0);
      await config.onFetched?.(transformed);
    } finally {
      if (generation === fetchGeneration) {
        endLoading();
      }
    }
  }

  function formatSearchParams(params: Record<string, unknown>) {
    const formattedParams: Record<string, unknown> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formattedParams[key] = value;
      }
    });

    return formattedParams;
  }

  /**
   * update search params
   *
   * @param params
   */
  function updateSearchParams(params: Partial<Parameters<A>[0]>) {
    Object.assign(searchParams, params);
  }

  /** reset search params */
  function resetSearchParams() {
    Object.assign(searchParams, jsonClone(apiParams));
  }

  if (immediate) {
    getData();
  }

  return {
    loading,
    empty,
    data,
    columns,
    columnChecks,
    reloadColumns,
    getData,
    searchParams,
    updateSearchParams,
    resetSearchParams
  };
}
