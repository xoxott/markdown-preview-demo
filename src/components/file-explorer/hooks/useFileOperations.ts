import { ref, Ref, ComputedRef } from 'vue'
import { FileItem } from '../types/file-explorer'

export type ClipboardOperation = 'copy' | 'cut' | null

/**
 * 文件操作返回类型
 */
export interface FileOperations {
  clipboard: Ref<FileItem[]>
  clipboardOperation: Ref<ClipboardOperation>
  copyFiles: () => Promise<void>
  cutFiles: () => Promise<void>
  pasteFiles: (targetPath?: string) => Promise<void>
  deleteFiles: () => Promise<void>
  renameFile: (item: FileItem, newName: string) => Promise<void>
  startRename: () => void
  createFolder: () => Promise<void>
  refresh: () => Promise<void>
  showProperties: () => void
  hasClipboardContent: ComputedRef<boolean>
  clearClipboard: () => void
}

export interface FileOperationsOptions {
  onCopy?: (items: FileItem[]) => void | Promise<void>
  onCut?: (items: FileItem[]) => void | Promise<void>
  onPaste?: (items: FileItem[], operation: ClipboardOperation, targetPath?: string) => void | Promise<void>
  onDelete?: (items: FileItem[]) => void | Promise<void>
  onRename?: (item: FileItem, newName: string) => void | Promise<void>
  onCreateFolder?: (name: string, parentPath?: string) => void | Promise<void>
  onRefresh?: () => void | Promise<void>
  onShowProperties?: (item: FileItem) => void
}

export function useFileOperations(
  selectedFiles: Ref<FileItem[]>,
  options: FileOperationsOptions = {}
) {
  const {
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onRename,
    onCreateFolder,
    onRefresh,
    onShowProperties
  } = options

  // 剪贴板状态
  const clipboard = ref<FileItem[]>([])
  const clipboardOperation = ref<ClipboardOperation>(null)

  /**
   * 复制选中的文件
   */
  const copyFiles = async () => {
    if (selectedFiles.value.length === 0) {
      console.warn('没有选中的文件可以复制')
      return
    }

    clipboard.value = [...selectedFiles.value]
    clipboardOperation.value = 'copy'

    console.log(`📋 已复制 ${clipboard.value.length} 个项目`)

    await onCopy?.(clipboard.value)
  }

  /**
   * 剪切选中的文件
   */
  const cutFiles = async () => {
    if (selectedFiles.value.length === 0) {
      console.warn('没有选中的文件可以剪切')
      return
    }

    clipboard.value = [...selectedFiles.value]
    clipboardOperation.value = 'cut'

    console.log(`✂️ 已剪切 ${clipboard.value.length} 个项目`)

    await onCut?.(clipboard.value)
  }

  /**
   * 粘贴剪贴板中的文件
   */
  const pasteFiles = async (targetPath?: string) => {
    if (clipboard.value.length === 0 || !clipboardOperation.value) {
      console.warn('剪贴板为空')
      return
    }

    const operation = clipboardOperation.value
    const items = [...clipboard.value]

    console.log(`📌 粘贴 ${items.length} 个项目 (${operation})`)

    await onPaste?.(items, operation, targetPath)

    // 如果是剪切操作，粘贴后清空剪贴板
    if (operation === 'cut') {
      clipboard.value = []
      clipboardOperation.value = null
    }
  }

  /**
   * 删除选中的文件
   */
  const deleteFiles = async () => {
    if (selectedFiles.value.length === 0) {
      console.warn('没有选中的文件可以删除')
      return
    }

    const items = [...selectedFiles.value]

    console.log(`🗑️ 删除 ${items.length} 个项目`)

    await onDelete?.(items)
  }

  /**
   * 重命名文件（仅当选中单个文件时）
   */
  const renameFile = async (newName: string) => {
    if (selectedFiles.value.length !== 1) {
      console.warn('只能重命名单个文件')
      return
    }

    const item = selectedFiles.value[0]

    console.log(`✏️ 重命名: ${item.name} -> ${newName}`)

    await onRename?.(item, newName)
  }

  /**
   * 触发重命名对话框
   */
  const startRename = () => {
    if (selectedFiles.value.length !== 1) {
      console.warn('只能重命名单个文件')
      return
    }

    // 这里可以触发重命名对话框
    // 实际的重命名逻辑由对话框完成后调用 renameFile
    console.log('🔧 开始重命名:', selectedFiles.value[0].name)

    // 触发重命名回调（如果需要显示对话框）
    onRename?.(selectedFiles.value[0], selectedFiles.value[0].name)
  }

  /**
   * 新建文件夹
   */
  const createFolder = async (name?: string, parentPath?: string) => {
    const folderName = name || '新建文件夹'

    console.log(`📁 新建文件夹: ${folderName}`)

    await onCreateFolder?.(folderName, parentPath)
  }

  /**
   * 刷新当前视图
   */
  const refresh = async () => {
    console.log('🔄 刷新视图')

    await onRefresh?.()
  }

  /**
   * 显示文件属性
   */
  const showProperties = () => {
    if (selectedFiles.value.length !== 1) {
      console.warn('只能查看单个文件的属性')
      return
    }

    const item = selectedFiles.value[0]

    console.log('ℹ️ 显示属性:', item.name)

    onShowProperties?.(item)
  }

  /**
   * 检查剪贴板是否有内容
   */
  const hasClipboardContent = () => {
    return clipboard.value.length > 0 && clipboardOperation.value !== null
  }

  /**
   * 清空剪贴板
   */
  const clearClipboard = () => {
    clipboard.value = []
    clipboardOperation.value = null
  }

  return {
    // 状态
    clipboard,
    clipboardOperation,

    // 方法
    copyFiles,
    cutFiles,
    pasteFiles,
    deleteFiles,
    renameFile,
    startRename,
    createFolder,
    refresh,
    showProperties,
    hasClipboardContent,
    clearClipboard
  }
}

