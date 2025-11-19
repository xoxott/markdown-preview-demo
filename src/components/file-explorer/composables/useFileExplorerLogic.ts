import type { Ref } from 'vue';
import { computed, provide, ref, watch } from 'vue';
import { useToggle } from '@vueuse/core';
import { useMessage } from 'naive-ui';
import type { FileItem, GridSize, ViewMode } from '../types/file-explorer';
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
import type { LayoutConfig } from '../layout/ResizableLayout';
import { useFileDialog } from '../hooks/useFileDialog';
import type { IFileDataSource, DataSourceType, ServerFileDataSourceConfig } from '../datasources/types';
import { LocalFileDataSource, ServerFileDataSource } from '../datasources';
import type { BreadcrumbItem } from '../layout/FileBreadcrumb';

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

/** 文件管理器核心业务逻辑 封装所有 hooks 的组合和配置 */
export function useFileExplorerLogic(options: UseFileExplorerLogicOptions) {
  const { initialItems, containerRef, validateDrop, initialDataSourceType = 'local', serverDataSourceConfig } = options;
  const message = useMessage();

  // ==================== 数据源管理 ====================
  const dataSourceType = ref<DataSourceType>(initialDataSourceType);
  const dataSource = ref<IFileDataSource | null>(null);
  const currentPath = ref<string>('/');

  // ==================== 面包屑路径生成 ====================
  // 根据当前路径生成面包屑项
  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const path = currentPath.value;
    const parts = path.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];

    // 根目录
    const rootName = dataSource.value?.type === 'local'
      ? (dataSource.value as LocalFileDataSource).rootPath || '根目录'
      : '根目录';

    items.push({
      id: 'root',
      name: rootName,
      path: '/'
    });

    // 构建路径项
    let currentPathStr = '';
    parts.forEach((part, index) => {
      currentPathStr += `/${part}`;
      items.push({
        id: `path-${index}`,
        name: part,
        path: currentPathStr
      });
    });

    return items;
  });

  // 初始化数据源
  if (initialDataSourceType === 'server' && serverDataSourceConfig) {
    dataSource.value = new ServerFileDataSource(serverDataSourceConfig);
  } else {
    dataSource.value = new LocalFileDataSource();
  }

  // 切换数据源
  const switchDataSource = async (type: DataSourceType) => {
    dataSourceType.value = type;
    if (type === 'server' && serverDataSourceConfig) {
      dataSource.value = new ServerFileDataSource(serverDataSourceConfig);
    } else {
      dataSource.value = new LocalFileDataSource();
    }
    // 切换数据源后重置分页并刷新文件列表
    pagination.reset();
    await refreshFileList();
  };

  // ==================== 状态管理 ====================
  const collapsed = ref(false);
  const gridSize = ref<GridSize>('small');
  const viewMode = ref<ViewMode>('grid');
  const mockItems = ref<FileItem[]>(initialItems);
  const loading = ref(false);
  const loadingTip = ref('加载中...');
  const layoutConfig = ref<LayoutConfig>({
    leftWidth: 180,
    rightWidth: 300,
    minRightWidth: 200,
    maxRightWidth: 1000,
    showLeft: true,
    showRight: false // 默认隐藏右侧面板
  });

  // ==================== 信息面板状态 ====================
  const [showInfoPanel, toggleInfoPanel] = useToggle(false);

  // 同步更新布局配置
  watch(showInfoPanel, (value) => {
    layoutConfig.value.showRight = value;
  });

  // ==================== 拖拽系统 ====================
  const dragDrop = useFileDragDropEnhanced({
    validateDrop:
      validateDrop ||
      ((items, targetPath) => {
        return mockItems.value.find(it => it.path === targetPath)?.type === 'folder';
      })
  });
  provide('FILE_DRAG_DROP', dragDrop);

  // ==================== 分页系统 ====================
  const pagination = useFilePagination({
    dataSource,
    currentPath,
    viewMode,
    gridSize
  });

  // 刷新文件列表
  const refreshFileList = async () => {
    if (!dataSource.value) {
      mockItems.value = initialItems;
      pagination.paginatedItems.value = initialItems;
      pagination.total.value = initialItems.length;
      return;
    }

    // 本地模式且未选择文件夹时，使用初始数据
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
      // 使用分页加载
      await pagination.loadPage();
      // 对于本地模式，需要获取所有文件用于统计（保持兼容性）
      // 对于云端模式，如果后端不支持获取总数，则使用分页结果
      if (dataSource.value.type === 'local') {
        const allFiles = await dataSource.value.listFiles(currentPath.value);
        mockItems.value = allFiles.length > 0 ? allFiles : initialItems;
      } else {
        // 云端模式：使用分页结果更新 mockItems（用于统计）
        // 注意：这里只更新当前页的数据，总数来自分页结果
        mockItems.value = pagination.paginatedItems.value.length > 0
          ? pagination.paginatedItems.value
          : initialItems;
      }
    } catch (error: any) {
      message.error(`加载文件列表失败: ${error.message}`);
      console.error('加载文件列表失败:', error);
      mockItems.value = initialItems; // 降级到初始数据
      pagination.paginatedItems.value = initialItems;
      pagination.total.value = initialItems.length;
    } finally {
      setLoading(false);
    }
  };

  // 监听视图模式和网格大小变化，更新分页
  watch([viewMode, gridSize], () => {
    const newPageSize = pagination.pageSize.value;
    const expectedPageSize = getPageSizeByViewMode(viewMode.value, gridSize.value);
    if (newPageSize !== expectedPageSize) {
      pagination.setPageSize(expectedPageSize);
    }
  });

  // 监听路径变化，重置分页
  watch(currentPath, () => {
    pagination.reset();
    pagination.loadPage();
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
    } catch (error: any) {
      message.error(`打开文件夹失败: ${error.message}`);
      console.error('打开文件夹失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== 排序和选择 ====================
  // 对分页后的文件进行排序
  const { setSorting, sortedFiles, sortOrder, sortField } = useFileSort(pagination.paginatedItems);
  const { selectedIds, selectFile, selectAll, clearSelection, selectedFiles } = useFileSelection(sortedFiles);

  // ==================== Loading 控制 ====================
  const setLoading = (value: boolean, tip?: string) => {
    loading.value = value;
    if (tip !== undefined) {
      loadingTip.value = tip;
    }
  };

  // ==================== 操作进度状态 ====================
  const operationProgress = ref(0);
  const operationText = ref('');

  // 设置操作进度
  const setOperationProgress = (progress: number, text?: string) => {
    operationProgress.value = Math.max(0, Math.min(100, progress));
    if (text !== undefined) {
      operationText.value = text;
    }
  };

  // 清除操作进度
  const clearOperationProgress = () => {
    operationProgress.value = 0;
    operationText.value = '';
  };

  // ==================== 存储信息状态 ====================
  const storageUsed = ref(0);
  const storageTotal = ref(0);
  const showStorage = ref(false);

  // ==================== 文件大小计算 ====================
  // 计算所有文件的总大小
  const totalSize = computed(() => {
    return mockItems.value.reduce((sum, item) => {
      return sum + (item.type === 'file' ? item.size || 0 : 0);
    }, 0);
  });

  // 计算选中文件的总大小
  const selectedSize = computed(() => {
    return selectedFiles.value.reduce((sum, item) => {
      return sum + (item.type === 'file' ? item.size || 0 : 0);
    }, 0);
  });

  // ==================== 弹窗系统 ====================
  const fileDialog = useFileDialog();
  provide('FILE_DIALOG', fileDialog);

  // ==================== 文件操作 ====================
  const operationsConfig = createOperationsConfig(message, setLoading, dataSource, refreshFileList);
  const fileOperations = useFileOperations(selectedFiles, {
    ...operationsConfig,
    fileDialog
  });

  // ==================== 事件处理 ====================
  const handleViewModeChange = (value: ViewMode) => {
    viewMode.value = value;
  };

  const handleOpen = (file: FileItem) => {
    console.log('打开文件:', file);
  };

  const handleBreadcrumbNavigate = async (path: string) => {
    // 规范化路径
    const normalizedPath = path === '/' ? '/' : path.replace(/\/+$/, '');
    currentPath.value = normalizedPath;
    await refreshFileList();
  };

  const handleGridSizeChange = (size: GridSize) => {
    gridSize.value = size;
  };

  // ==================== 快捷键配置 ====================
  const shortcutsConfig = createShortcutsConfig({
    selectAll,
    clearSelection,
    selectedFiles,
    fileOperations,
    viewMode,
    handleOpen,
    message
  });

  // 绑定快捷键到容器
  useKeyboardShortcuts(shortcutsConfig, containerRef);

  // ==================== 右键菜单处理 ====================
  const handleContextMenuSelect = createContextMenuHandler({
    fileOperations,
    message,
    selectedFiles,
    onOpen: handleOpen,
    onSort: setSorting,
    onToggleInfoPanel: toggleInfoPanel
  });

  // ==================== 返回所有状态和方法 ====================
  return {
    // 状态
    collapsed,
    gridSize,
    viewMode,
    mockItems,
    sortedFiles,
    sortOrder,
    sortField,
    selectedIds,
    selectedFiles,
    loading,
    loadingTip,
    layoutConfig,
    showInfoPanel,

    // 分页
    pagination,

    // 数据源
    dataSourceType,
    dataSource,
    currentPath,
    breadcrumbItems,

    // 文件大小统计
    totalSize,
    selectedSize,

    // 操作进度
    operationProgress,
    operationText,

    // 存储信息
    storageUsed,
    storageTotal,
    showStorage,

    // 拖拽
    dragDrop,

    // 弹窗
    // dialog,

    // 方法
    setSorting,
    selectFile,
    selectAll,
    clearSelection,
    handleViewModeChange,
    handleOpen,
    handleBreadcrumbNavigate,
    handleGridSizeChange,
    setLoading,
    setOperationProgress,
    clearOperationProgress,
    handleContextMenuSelect,
    toggleInfoPanel,
    switchDataSource,
    openLocalFolder,
    refreshFileList,

    // 文件操作
    fileOperations
  };
}

