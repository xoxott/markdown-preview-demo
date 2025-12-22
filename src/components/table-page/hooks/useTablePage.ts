import { ref, reactive, computed } from 'vue';
import type { PaginationProps } from 'naive-ui';
import type { SearchFieldConfig } from '../types';
import { useSearchForm } from './useSearchForm';

export interface UseTablePageOptions<T = any> {
  /** API 函数 */
  apiFn: (params: any) => Promise<any>;
  /** 搜索字段配置 */
  searchConfig?: SearchFieldConfig[];
  /** 初始搜索参数 */
  initialSearchParams?: Record<string, any>;
  /** 初始分页参数 */
  initialPagination?: {
    page?: number;
    pageSize?: number;
  };
  /** 是否立即加载 */
  immediate?: boolean;
  /** 数据转换器 */
  transformer?: (response: any) => {
    data: T[];
    total: number;
  };
}

export function useTablePage<T = any>(options: UseTablePageOptions<T>) {
  const {
    apiFn,
    searchConfig = [],
    initialSearchParams = {},
    initialPagination = { page: 1, pageSize: 10 },
    immediate = true,
    transformer
  } = options;

  // Table data
  const data = ref<T[]>([]);
  const loading = ref(false);
  const selectedKeys = ref<(string | number)[]>([]);

  // Pagination
  const pagination = reactive<PaginationProps>({
    page: initialPagination.page || 1,
    pageSize: initialPagination.pageSize || 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 15, 20, 25, 30, 50],
    onUpdatePage: (page: number) => {
      pagination.page = page;
      getData();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      getData();
    },
    prefix: (paginationInfo) => `共 ${paginationInfo.itemCount} 条`
  });

  // Search form
  const searchForm = useSearchForm({
    config: searchConfig,
    initialValues: initialSearchParams,
    onSearch: () => {
      pagination.page = 1;
      getData();
    },
    onReset: () => {
      pagination.page = 1;
      getData();
    }
  });

  /**
   * Get table data
   */
  const getData = async () => {
    loading.value = true;
    try {
      const params = {
        page: pagination.page,
        limit: pagination.pageSize,
        ...searchForm.getValues()
      };

      const response = await apiFn(params);

      if (transformer) {
        const transformed = transformer(response);
        data.value = transformed.data as T[];
        pagination.itemCount = transformed.total;
      } else {
        // Default transformer for ListData format
        const responseData = response.data || response;
        data.value = (responseData.lists || []) as T[];
        pagination.itemCount = responseData.meta?.total || 0;
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      data.value = [];
      pagination.itemCount = 0;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Refresh data (keep current page)
   */
  const refresh = () => {
    getData();
  };

  /**
   * Reset and reload data
   */
  const reload = () => {
    pagination.page = 1;
    selectedKeys.value = [];
    searchForm.resetForm();
    getData();
  };

  /**
   * Update selected keys
   */
  const updateSelectedKeys = (keys: (string | number)[]) => {
    selectedKeys.value = keys;
  };

  /**
   * Clear selected keys
   */
  const clearSelection = () => {
    selectedKeys.value = [];
  };

  // Auto load data
  if (immediate) {
    getData();
  }

  return {
    // Data
    data,
    loading,
    selectedKeys,

    // Pagination
    pagination,

    // Search form
    searchForm,

    // Methods
    getData,
    refresh,
    reload,
    updateSelectedKeys,
    clearSelection,

    // Computed
    hasSelection: computed(() => selectedKeys.value.length > 0),
    total: computed(() => pagination.itemCount || 0)
  };
}

