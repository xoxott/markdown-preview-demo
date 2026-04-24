import type { ComputedRef, Ref } from 'vue';
import { computed, ref } from 'vue';
import type { FileItem } from '../types/file-explorer';
import { useDialog } from '../../base-dialog/useDialog';
import type { UseFileDialogReturn } from './useFileDialog';

export type ClipboardOperation = 'copy' | 'cut' | null;

/** 文件操作返回类型 */
export interface FileOperations {
  clipboard: Ref<FileItem[]>;
  clipboardOperation: Ref<ClipboardOperation>;
  copyFiles: () => Promise<void>;
  cutFiles: () => Promise<void>;
  pasteFiles: (targetPath?: string) => Promise<void>;
  deleteFiles: () => Promise<void>;
  renameFile: (item: FileItem, newName: string) => Promise<void>;
  startRename: () => void;
  createFolder: () => Promise<void>;
  refresh: () => Promise<void>;
  showProperties: () => void;
  hasClipboardContent: ComputedRef<boolean>;
  clearClipboard: () => void;
}

export interface FileOperationsOptions {
  fileDialog?: UseFileDialogReturn;
  onCopy?: (items: FileItem[]) => void | Promise<void>;
  onCut?: (items: FileItem[]) => void | Promise<void>;
  onPaste?: (
    items: FileItem[],
    operation: ClipboardOperation,
    targetPath?: string
  ) => void | Promise<void>;
  onDelete?: (items: FileItem[]) => void | Promise<void>;
  onRename?: (item: FileItem, newName: string) => void | Promise<void>;
  onCreateFolder?: (name: string, parentPath?: string) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  onShowProperties?: (item: FileItem) => void;
}

export function useFileOperations(
  selectedFiles: Ref<FileItem[]>,
  options: FileOperationsOptions = {}
) {
  const {
    fileDialog,
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onRename,
    onCreateFolder,
    onRefresh,
    onShowProperties
  } = options;
  const dialog = useDialog();

  // 剪贴板状态
  const clipboard = ref<FileItem[]>([]);
  const clipboardOperation = ref<ClipboardOperation>(null);

  /** 复制选中的文件 */
  const copyFiles = async () => {
    if (selectedFiles.value.length === 0) {
      console.warn('没有选中的文件可以复制');
      return;
    }

    clipboard.value = [...selectedFiles.value];
    clipboardOperation.value = 'copy';

    console.log(`📋 已复制 ${clipboard.value.length} 个项目`);

    await onCopy?.(clipboard.value);
  };

  /** 剪切选中的文件 */
  const cutFiles = async () => {
    if (selectedFiles.value.length === 0) {
      console.warn('没有选中的文件可以剪切');
      return;
    }

    clipboard.value = [...selectedFiles.value];
    clipboardOperation.value = 'cut';

    console.log(`✂️ 已剪切 ${clipboard.value.length} 个项目`);

    await onCut?.(clipboard.value);
  };

  /** 粘贴剪贴板中的文件 */
  const pasteFiles = async (targetPath?: string) => {
    if (clipboard.value.length === 0 || !clipboardOperation.value) {
      console.warn('剪贴板为空');
      return;
    }

    const operation = clipboardOperation.value;
    const items = [...clipboard.value];

    console.log(`📌 粘贴 ${items.length} 个项目 (${operation})`);

    await onPaste?.(items, operation, targetPath);

    // 如果是剪切操作，粘贴后清空剪贴板
    if (operation === 'cut') {
      clipboard.value = [];
      clipboardOperation.value = null;
    }
  };

  /** 删除选中的文件 */
  const deleteFiles = async () => {
    if (selectedFiles.value.length === 0) {
      console.warn('没有选中的文件可以删除');
      return;
    }

    const items = [...selectedFiles.value];

    // 如果有 dialog,显示确认对话框
    if (dialog) {
      const itemNames = items.length === 1 ? items[0].name : `${items.length} 个项目`;

      dialog.confirm({
        title: '确认删除',
        content: `确定要删除 ${itemNames} 吗?此操作无法撤销。`,
        type: 'warning',
        confirmText: '删除',
        onConfirm: async () => {
          console.log(`🗑️ 删除 ${items.length} 个项目`);
          await onDelete?.(items);
        }
      });
    } else {
      console.log(`🗑️ 删除 ${items.length} 个项目`);
      await onDelete?.(items);
    }
  };

  /** 重命名文件（仅当选中单个文件时） */
  const renameFile = async (item: FileItem, newName: string) => {
    console.log(`✏️ 重命名: ${item.name} -> ${newName}`);
    await onRename?.(item, newName);
  };

  /** 触发重命名对话框 */
  const startRename = () => {
    if (selectedFiles.value.length !== 1) {
      console.warn('只能重命名单个文件');
      return;
    }

    const item = selectedFiles.value[0];

    // 如果有 dialog,显示重命名对话框
    if (fileDialog) {
      fileDialog.rename({
        title: '重命名',
        defaultValue: item.name,
        placeholder: '请输入新名称',
        validator: (value: string) => {
          if (!value.trim()) {
            return '名称不能为空';
          }
          if (value === item.name) {
            return '名称未改变';
          }
          return true;
        },
        onConfirm: async (newName: string) => {
          await renameFile(item, newName);
        }
      });
    } else {
      console.log('🔧 开始重命名:', item.name);
      onRename?.(item, item.name);
    }
  };

  /** 新建文件夹 */
  const createFolder = async (name?: string, parentPath?: string) => {
    // 如果有 dialog 且没有提供名称,显示输入对话框
    if (fileDialog && !name) {
      fileDialog.rename({
        title: '新建文件夹',
        defaultValue: '新建文件夹',
        placeholder: '请输入文件夹名称',
        validator: (value: string) => {
          if (!value.trim()) {
            return '文件夹名称不能为空';
          }
          return true;
        },
        onConfirm: async (folderName: string) => {
          console.log(`📁 新建文件夹: ${folderName}`);
          await onCreateFolder?.(folderName, parentPath);
        }
      });
    } else {
      const folderName = name || '新建文件夹';
      console.log(`📁 新建文件夹: ${folderName}`);
      await onCreateFolder?.(folderName, parentPath);
    }
  };

  /** 刷新当前视图 */
  const refresh = async () => {
    console.log('🔄 刷新视图');

    await onRefresh?.();
  };

  /** 显示文件属性 */
  const showProperties = () => {
    if (selectedFiles.value.length !== 1) {
      console.warn('只能查看单个文件的属性');
      return;
    }

    const item = selectedFiles.value[0];

    console.log('ℹ️ 显示属性:', item.name);

    onShowProperties?.(item);
  };

  /** 检查剪贴板是否有内容 */
  const hasClipboardContent = computed(() => {
    return clipboard.value.length > 0 && clipboardOperation.value !== null;
  });

  /** 清空剪贴板 */
  const clearClipboard = () => {
    clipboard.value = [];
    clipboardOperation.value = null;
  };

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
  };
}
