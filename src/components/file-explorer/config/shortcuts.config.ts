import { Ref } from 'vue'
import type { MessageApiInjection } from 'naive-ui/es/message/src/MessageProvider'
import { FileItem, ViewMode } from '../types/file-explorer'
import { ShortcutMap } from '../hooks/useKeyboardShortcuts'

export interface ShortcutsConfigDeps {
  // 选择相关
  selectAll: () => void
  clearSelection: () => void
  selectedFiles: Ref<FileItem[]>
  
  // 文件操作
  fileOperations: {
    copyFiles: () => Promise<void>
    cutFiles: () => Promise<void>
    pasteFiles: (targetPath?: string) => Promise<void>
    deleteFiles: () => Promise<void>
    startRename: () => void
    createFolder: (name?: string, parentPath?: string) => Promise<void>
    refresh: () => Promise<void>
    showProperties: () => void
  }
  
  // 视图控制
  viewMode: Ref<ViewMode>
  
  // 事件处理
  handleOpen: (file: FileItem) => void
  
  // 消息提示
  message: MessageApiInjection
}

/**
 * 创建快捷键配置
 * @param deps 依赖注入
 * @returns 快捷键映射
 */
export function createShortcutsConfig(deps: ShortcutsConfigDeps): ShortcutMap {
  const {
    selectAll,
    clearSelection,
    selectedFiles,
    fileOperations,
    viewMode,
    handleOpen,
    message
  } = deps

  return {
    // ==================== 文件操作 ====================
    
    /**
     * Ctrl+A - 全选文件
     */
    'Ctrl+A': (e: KeyboardEvent) => {
      selectAll()
      message.info('已全选')
    },
    
    /**
     * Ctrl+C - 复制选中文件
     */
    'Ctrl+C': (e: KeyboardEvent) => {
      fileOperations.copyFiles()
    },
    
    /**
     * Ctrl+X - 剪切选中文件
     */
    'Ctrl+X': (e: KeyboardEvent) => {
      fileOperations.cutFiles()
    },
    
    /**
     * Ctrl+V - 粘贴文件
     */
    'Ctrl+V': (e: KeyboardEvent) => {
      fileOperations.pasteFiles()
    },
    
    /**
     * Delete - 删除选中文件
     */
    'Delete': (e: KeyboardEvent) => {
      fileOperations.deleteFiles()
    },
    
    /**
     * F2 - 重命名（单个文件）
     */
    'F2': (e: KeyboardEvent) => {
      fileOperations.startRename()
    },
    
    /**
     * Enter - 打开选中文件
     */
    'Enter': (e: KeyboardEvent) => {
      if (selectedFiles.value.length === 1) {
        handleOpen(selectedFiles.value[0])
      } else if (selectedFiles.value.length > 1) {
        message.warning('只能打开单个文件')
      }
    },
    
    /**
     * Alt+Enter - 显示文件属性
     */
    'Alt+Enter': (e: KeyboardEvent) => {
      fileOperations.showProperties()
    },
    
    // ==================== 视图切换 ====================
    
    /**
     * Ctrl+1 - 切换到网格视图
     */
    'Ctrl+1': (e: KeyboardEvent) => {
      viewMode.value = 'grid'
      message.info('切换到网格视图')
    },
    
    /**
     * Ctrl+2 - 切换到列表视图
     */
    'Ctrl+2': (e: KeyboardEvent) => {
      viewMode.value = 'list'
      message.info('切换到列表视图')
    },
    
    /**
     * Ctrl+3 - 切换到平铺视图
     */
    'Ctrl+3': (e: KeyboardEvent) => {
      viewMode.value = 'tile'
      message.info('切换到平铺视图')
    },
    
    /**
     * Ctrl+4 - 切换到详细视图
     */
    'Ctrl+4': (e: KeyboardEvent) => {
      viewMode.value = 'detail'
      message.info('切换到详细视图')
    },
    
    /**
     * Ctrl+5 - 切换到内容视图
     */
    'Ctrl+5': (e: KeyboardEvent) => {
      viewMode.value = 'content'
      message.info('切换到内容视图')
    },
    
    // ==================== 其他操作 ====================
    
    /**
     * F5 - 刷新视图
     */
    'F5': (e: KeyboardEvent) => {
      fileOperations.refresh()
    },
    
    /**
     * Ctrl+Shift+N - 新建文件夹
     */
    'Ctrl+Shift+N': (e: KeyboardEvent) => {
      fileOperations.createFolder()
    },
    
    /**
     * Escape - 取消选择
     */
    'Escape': (e: KeyboardEvent) => {
      clearSelection()
      message.info('已取消选择')
    }
  }
}

