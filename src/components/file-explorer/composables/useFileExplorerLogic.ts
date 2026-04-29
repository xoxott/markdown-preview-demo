import type { Ref } from 'vue';
import { computed, provide, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import type { FileItem } from '../types/file-explorer';
import { useFileDragDropEnhanced } from '../hooks/useFileDragDropEnhanced';
import { useFileSort } from '../hooks/useFileSort';
import { useFileSelection } from '../hooks/useFileSelection';
import { useFileOperations } from '../hooks/useFileOperations';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFilePagination } from '../hooks/useFilePagination';
import { getPageSizeByViewMode } from '../config/pagination.config';
import { createOperationsConfig } from '../config/operations.config';
import { createShortcutsConfig } from '../config/shortcuts.config';
import { createContextMenuHandler } from '../config/contextmenu.config';
import { useFileDialog } from '../hooks/useFileDialog';
import type { DataSourceType, ServerFileDataSourceConfig } from '../datasources/types';
import { LocalFileDataSource, ServerFileDataSource } from '../datasources';
import { useViewState } from './useViewState';
import { useNavigation } from './useNavigation';

export interface UseFileExplorerLogicOptions {
  /** 初始文件列表 */
  initialItems: FileItem[];
  /** 容器元素引用 */
  containerRef: Ref<HTMLElement | null>;
  /** 验证拖放的回调 */
  validateDrop?: (items: FileItem[], targetPath: string) => boolean;
  /** 初始数据源类型 */
  initialDataSourceType?: DataSourceType;
  /** 服务器数据源配置 */
  serverDataSourceConfig?: ServerFileDataSourceConfig;
}

/** 文件管理器核心编排 — 组合子 composable，管理数据管线和交互配置 */
export function useFileExplorerLogic(options: UseFileExplorerLogicOptions) {
  const {
    initialItems,
    containerRef,
    validateDrop,
    initialDataSourceType = 'local',
    serverDataSourceConfig
  } = options;
  const message = useMessage();

  // ==================== 子 composable ====================
  const viewState = useViewState();
  const {
    collapsed,
    gridSize,
    viewMode,
    loading,
    loadingTip,
    setLoading,
    layoutConfig,
    showInfoPanel,
    toggleInfoPanel,
    operationProgress,
    operationText,
    setOperationProgress,
    clearOperationProgress,
    storageUsed,
    storageTotal,
    showStorage,
    handleViewModeChange,
    handleGridSizeChange
  } = viewState;

  // 同步信息面板到布局配置
  watch(showInfoPanel, value => {
    layoutConfig.value.showRight = value;
  });

  const navigation = useNavigation({ initialDataSourceType, serverDataSourceConfig });
  const { dataSourceType, dataSource, currentPath, breadcrumbItems } = navigation;

  // ==================== 数据核心 ====================
  const mockItems = ref<FileItem[]>(initialItems);

  // ==================== 拖拽系统 ====================
  const dragDrop = useFileDragDropEnhanced({
    validateDrop:
      validateDrop ||
      ((_items, targetPath) => {
        return mockItems.value.find(it => it.path === targetPath)?.type === 'folder';
      })
  });
  provide('FILE_DRAG_DROP', dragDrop);

  // ==================== 分页系统 ====================
  const pagination = useFilePagination({ dataSource, currentPath, viewMode, gridSize });

  // 刷新文件列表
  const refreshFileList = async () => {
    if (!dataSource.value) {
      mockItems.value = initialItems;
      pagination.paginatedItems.value = initialItems;
      pagination.total.value = initialItems.length;
      return;
    }

    if (dataSource.value.type === 'local') {
      const localDataSource = dataSource.value as LocalFileDataSource;
      if (!localDataSource.hasRootHandle()) {
        mockItems.value = initialItems;
        pagination.paginatedItems.value = initialItems;
        pagination.total.value = initialItems.length;
        return;
      }
    }

    try {
      setLoading(true, '加载文件列表...');
      await pagination.loadPage();
      if (dataSource.value.type === 'local') {
        const allFiles = await dataSource.value.listFiles(currentPath.value);
        mockItems.value = allFiles.length > 0 ? allFiles : initialItems;
      } else {
        mockItems.value =
          pagination.paginatedItems.value.length > 0
            ? pagination.paginatedItems.value
            : initialItems;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      message.error(`加载文件列表失败: ${msg}`);
      mockItems.value = initialItems;
      pagination.paginatedItems.value = initialItems;
      pagination.total.value = initialItems.length;
    } finally {
      setLoading(false);
    }
  };

  // 监听视图模式和网格大小变化
  watch([viewMode, gridSize], () => {
    const expectedPageSize = getPageSizeByViewMode(viewMode.value, gridSize.value);
    if (pagination.pageSize.value !== expectedPageSize) {
      pagination.pageSize.value = expectedPageSize;
      refreshFileList();
    }
  });

  // 监听路径变化
  watch(currentPath, () => {
    pagination.reset();
    refreshFileList();
  });

  // 打开本地文件夹
  const openLocalFolder = async () => {
    if (dataSource.value?.type !== 'local') {
      message.warning('当前不是本地模式');
      return;
    }
    const localDataSource = dataSource.value as LocalFileDataSource;
    try {
      setLoading(true, '正在打开文件夹...');
      const handle = await localDataSource.openFolder();
      if (handle) {
        currentPath.value = '/';
        await refreshFileList();
        message.success('文件夹打开成功');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      message.error(`打开文件夹失败: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // 切换数据源
  const switchDataSource = async (type: DataSourceType) => {
    dataSourceType.value = type;
    if (type === 'server' && serverDataSourceConfig) {
      dataSource.value = new ServerFileDataSource(serverDataSourceConfig);
    } else {
      dataSource.value = new LocalFileDataSource();
    }
    pagination.reset();
    await refreshFileList();
  };

  // ==================== 排序和选择管线 ====================
  const { setSorting, sortedFiles, sortOrder, sortField } = useFileSort(mockItems);

  const paginatedSortedFiles = computed(() => {
    const start = (pagination.currentPage.value - 1) * pagination.pageSize.value;
    const end = start + pagination.pageSize.value;
    return sortedFiles.value.slice(start, end);
  });

  const { selectedIds, selectFile, selectAll, clearSelection, selectedFiles } =
    useFileSelection(paginatedSortedFiles);

  // 同步分页总数
  watch(
    mockItems,
    items => {
      pagination.total.value = items.length;
    },
    { immediate: true }
  );

  // ==================== 统计 ====================
  const totalSize = computed(() =>
    mockItems.value.reduce((sum, item) => sum + (item.type === 'file' ? item.size || 0 : 0), 0)
  );
  const selectedSize = computed(() =>
    selectedFiles.value.reduce((sum, item) => sum + (item.type === 'file' ? item.size || 0 : 0), 0)
  );

  // ==================== 弹窗 ====================
  const fileDialog = useFileDialog();
  provide('FILE_DIALOG', fileDialog);

  // ==================== 文件操作 ====================
  const operationsConfig = createOperationsConfig(message, setLoading, dataSource, refreshFileList);
  const fileOperations = useFileOperations(selectedFiles, { ...operationsConfig, fileDialog });

  // ==================== 交互配置 ====================
  const handleOpen = (_file: FileItem) => {};
  const handleBreadcrumbNavigate = async (path: string) => {
    const normalizedPath = path === '/' ? '/' : path.replace(/\/+$/, '');
    currentPath.value = normalizedPath;
    await refreshFileList();
  };

  const shortcutsConfig = createShortcutsConfig({
    selectAll,
    clearSelection,
    selectedFiles,
    fileOperations,
    viewMode,
    handleOpen,
    message
  });
  useKeyboardShortcuts(shortcutsConfig, containerRef);

  const handleContextMenuSelect = createContextMenuHandler({
    fileOperations,
    message,
    selectedFiles,
    onOpen: handleOpen,
    onSort: setSorting,
    onToggleInfoPanel: toggleInfoPanel
  });

  // ==================== 返回 ====================
  return {
    // 视图状态（来自 useViewState）
    collapsed,
    gridSize,
    viewMode,
    loading,
    loadingTip,
    layoutConfig,
    showInfoPanel,
    operationProgress,
    operationText,
    storageUsed,
    storageTotal,
    showStorage,

    // 导航状态（来自 useNavigation）
    dataSourceType,
    dataSource,
    currentPath,
    breadcrumbItems,

    // 数据管线
    mockItems,
    sortedFiles,
    paginatedSortedFiles,
    sortOrder,
    sortField,
    selectedIds,
    selectedFiles,
    pagination,
    totalSize,
    selectedSize,

    // 拖拽 + 弹窗
    dragDrop,
    fileDialog,

    // 方法
    setSorting,
    selectFile,
    selectAll,
    clearSelection,
    setLoading,
    setOperationProgress,
    clearOperationProgress,
    handleViewModeChange,
    handleGridSizeChange,
    handleOpen,
    handleBreadcrumbNavigate,
    toggleInfoPanel,
    switchDataSource,
    openLocalFolder,
    refreshFileList,
    handleContextMenuSelect,
    fileOperations
  };
}
