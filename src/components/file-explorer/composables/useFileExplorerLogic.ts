import { Ref, ref, provide } from 'vue'
import { useMessage } from 'naive-ui'
import { FileItem, GridSize, ViewMode } from '../types/file-explorer'
import { useFileDragDropEnhanced } from '../hooks/useFileDragDropEnhanced'
import { useFileSort } from '../hooks/useFileSort'
import { useFileSelection } from '../hooks/useFileSelection'
import { useFileOperations } from '../hooks/useFileOperations'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useDialog } from '../hooks/useDialog'
import { createOperationsConfig } from '../config/operations.config'
import { createShortcutsConfig } from '../config/shortcuts.config'
import { createContextMenuHandler } from '../config/contextmenu.config'

export interface UseFileExplorerLogicOptions {
  /** 初始文件列表 */
  initialItems: FileItem[]
  /** 容器元素引用 */
  containerRef: Ref<HTMLElement | null>
  /** 验证拖放的回调 */
  validateDrop?: (items: FileItem[], targetPath: string) => boolean
}

/**
 * 文件管理器核心业务逻辑
 * 封装所有 hooks 的组合和配置
 */
export function useFileExplorerLogic(options: UseFileExplorerLogicOptions) {
  const { initialItems, containerRef, validateDrop } = options
  const message = useMessage()

  // ==================== 状态管理 ====================
  const collapsed = ref(false)
  const gridSize = ref<GridSize>('small')
  const viewMode = ref<ViewMode>('grid')
  const mockItems = ref<FileItem[]>(initialItems)
  const loading = ref(false)
  const loadingTip = ref('加载中...')

  // ==================== 拖拽系统 ====================
  const dragDrop = useFileDragDropEnhanced({
    validateDrop: validateDrop || ((items, targetPath) => {
      return mockItems.value.find(it => it.path === targetPath)?.type === 'folder'
    })
  })
  provide('FILE_DRAG_DROP', dragDrop)

  // ==================== 排序和选择 ====================
  const { setSorting, sortedFiles, sortOrder, sortField } = useFileSort(mockItems)
  const { selectedIds, selectFile, selectAll, clearSelection, selectedFiles } = useFileSelection(sortedFiles)

  // ==================== Loading 控制 ====================
  const setLoading = (value: boolean, tip?: string) => {
    loading.value = value
    if (tip !== undefined) {
      loadingTip.value = tip
    }
  }

  // ==================== 弹窗系统 ====================
  const dialog = useDialog()
  provide('FILE_DIALOG', dialog)

  // ==================== 文件操作 ====================
  const operationsConfig = createOperationsConfig(message, setLoading)
  const fileOperations = useFileOperations(selectedFiles, {
    ...operationsConfig,
    dialog
  })

  // ==================== 事件处理 ====================
  const handleViewModeChange = (value: ViewMode) => {
    viewMode.value = value
  }

  const handleOpen = (file: FileItem) => {
    console.log('打开文件:', file)
  }

  const handleBreadcrumbNavigate = (path: string) => {
    console.log('导航到路径:', path)
  }

  const handleGridSizeChange = (size: GridSize) => {
    gridSize.value = size
  }

  // ==================== 快捷键配置 ====================
  const shortcutsConfig = createShortcutsConfig({
    selectAll,
    clearSelection,
    selectedFiles,
    fileOperations,
    viewMode,
    handleOpen,
    message
  })

  // 绑定快捷键到容器
  useKeyboardShortcuts(shortcutsConfig, containerRef)

  // ==================== 右键菜单处理 ====================
  const handleContextMenuSelect = createContextMenuHandler({
    fileOperations,
    message,
    selectedFiles,
    onOpen: handleOpen,
    onSort: setSorting
  })

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

    // 拖拽
    dragDrop,

    // 弹窗
    dialog,

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
    handleContextMenuSelect,

    // 文件操作
    fileOperations
  }
}

