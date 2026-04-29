import { type Ref, computed, ref } from 'vue';
import type { FileItem, GridSize, ViewMode } from '../types/file-explorer';
import type { IFileDataSource } from '../datasources/types';
import { getPageSizeByViewMode } from '../config/pagination.config';

export interface UseFilePaginationOptions {
  /** 数据源 */
  dataSource: Ref<IFileDataSource | null>;
  /** 当前路径 */
  currentPath: Ref<string>;
  /** 视图模式 */
  viewMode: Ref<ViewMode>;
  /** 网格大小 */
  gridSize?: Ref<GridSize>;
}

export interface UseFilePaginationReturn {
  /** 当前页码 */
  currentPage: Ref<number>;
  /** 每页数量 */
  pageSize: Ref<number>;
  /** 总数 */
  total: Ref<number>;
  /** 总页数 */
  totalPages: Ref<number>;
  /** 分页后的文件列表 */
  paginatedItems: Ref<FileItem[]>;
  /** 是否显示分页器 */
  showPagination: Ref<boolean>;
  /** 跳转到指定页 */
  goToPage: (page: number) => Promise<void>;
  /** 上一页 */
  prevPage: () => Promise<void>;
  /** 下一页 */
  nextPage: () => Promise<void>;
  /** 设置每页数量 */
  setPageSize: (size: number) => Promise<void>;
  /** 重置到第一页 */
  reset: () => void;
  /** 加载分页数据 */
  loadPage: () => Promise<void>;
  /** 设置 fallback 文件列表 */
  setFallbackItems: (items: FileItem[]) => void;
}

/** 文件分页 Hook 根据数据源类型自动选择前端分页或接口分页 */
export function useFilePagination(options: UseFilePaginationOptions): UseFilePaginationReturn {
  const { dataSource, currentPath, viewMode, gridSize } = options;

  // 分页状态
  const currentPage = ref(1);
  const pageSize = ref(getPageSizeByViewMode(viewMode.value, gridSize?.value));
  const total = ref(0);
  const paginatedItems = ref<FileItem[]>([]);
  const isLoading = ref(false);

  // 计算总页数
  const totalPages = computed(() => {
    return Math.max(1, Math.ceil(total.value / pageSize.value));
  });

  // 是否显示分页器（总数大于每页数量时显示）
  const showPagination = computed(() => {
    return total.value > pageSize.value;
  });
  /** 加载分页数据 */
  const loadPage = async () => {
    if (!dataSource.value) {
      paginatedItems.value = [];
      total.value = 0;
      return;
    }

    if (isLoading.value) return;

    try {
      isLoading.value = true;

      const result = await dataSource.value.listFilesWithPagination({
        page: currentPage.value,
        pageSize: pageSize.value,
        path: currentPath.value
      });

      paginatedItems.value = result.items;
      total.value = result.total;

      // 如果当前页超出范围，重置到第一页
      if (currentPage.value > totalPages.value && totalPages.value > 0) {
        currentPage.value = 1;
        // 重新加载
        if (currentPage.value !== result.page) {
          await loadPage();
        }
      }
    } catch (error) {
      console.error('加载分页数据失败:', error);
      paginatedItems.value = [];
      total.value = 0;
    } finally {
      isLoading.value = false;
    }
  };

  /** 跳转到指定页 */
  const goToPage = async (page: number) => {
    if (page < 1 || page > totalPages.value || page === currentPage.value) {
      return;
    }
    currentPage.value = page;
    await loadPage();
  };

  /** 上一页 */
  const prevPage = async () => {
    if (currentPage.value > 1) {
      await goToPage(currentPage.value - 1);
    }
  };

  /** 下一页 */
  const nextPage = async () => {
    if (currentPage.value < totalPages.value) {
      await goToPage(currentPage.value + 1);
    }
  };

  /** 设置每页数量 */
  const setPageSize = async (size: number) => {
    if (size < 1 || size === pageSize.value) {
      return;
    }
    pageSize.value = size;
    // 重新计算当前页，确保不超出范围
    const maxPage = Math.ceil(total.value / pageSize.value);
    if (currentPage.value > maxPage) {
      currentPage.value = Math.max(1, maxPage);
    }
    await loadPage();
  };

  /** 重置到第一页 */
  const reset = () => {
    currentPage.value = 1;
    total.value = 0;
    paginatedItems.value = [];
  };

  /** 设置 fallback 文件列表（无数据源或数据源未连接时使用） */
  const setFallbackItems = (items: FileItem[]) => {
    paginatedItems.value = items;
    total.value = items.length;
  };

  return {
    currentPage,
    pageSize,
    total,
    totalPages,
    paginatedItems,
    showPagination,
    goToPage,
    prevPage,
    nextPage,
    setPageSize,
    reset,
    loadPage,
    setFallbackItems
  };
}
