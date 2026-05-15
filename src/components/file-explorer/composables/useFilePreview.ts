import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import type { FileEditorKind } from '../editor/resolveEditorKind';
import type { FileItem } from '../types/file-explorer';
import type { IFileDataSource } from '../datasources/types';

export interface OpenFileOptions {
  /** 强制使用预览器（如 Markdown 只读预览） */
  preferPreview?: boolean;
  /** 指定编辑器类型（覆盖扩展名推断） */
  editorKind?: FileEditorKind;
}

/** 文件预览 composable 选项 */
export interface UseFilePreviewOptions {
  /** 获取当前数据源 */
  dataSource: () => IFileDataSource | null | undefined;
  /** 刷新文件列表（保存后调用） */
  refreshFileList: () => Promise<void>;
}

/** 文件预览/编辑状态管理 */
export function useFilePreview(options: UseFilePreviewOptions) {
  const { dataSource, refreshFileList } = options;
  const message = useMessage();

  const openedFile = ref<FileItem | null>(null);
  const fileContent = ref<string | Blob | undefined>(undefined);
  const fileLoading = ref(false);
  const showFileDrawer = ref(false);
  const preferPreview = ref(false);
  const editorKindOverride = ref<FileEditorKind | null>(null);

  /** 文本内容且未强制预览时走内置编辑器 */
  const useTextEditor = () => !preferPreview.value && typeof fileContent.value === 'string';

  /** 打开文件 */
  const openFile = async (file: FileItem, openOptions?: OpenFileOptions) => {
    if (file.type === 'folder') return false;

    preferPreview.value = openOptions?.preferPreview ?? false;
    editorKindOverride.value = openOptions?.editorKind ?? null;

    try {
      openedFile.value = file;
      fileLoading.value = true;
      showFileDrawer.value = true;

      const ds = dataSource();
      if (ds) {
        const content = await ds.readFile(file.path);
        fileContent.value = content;
      } else {
        fileContent.value = '';
      }
    } catch (error: unknown) {
      message.error(`打开文件失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      fileLoading.value = false;
    }

    return true;
  };

  /** 保存文件 */
  const saveFile = async (file: FileItem, content: string) => {
    const ds = dataSource();
    if (ds) {
      await ds.writeFile(file.path, content);
      fileContent.value = content;
      await refreshFileList();
    }
  };

  /** 关闭预览 */
  const closeFile = () => {
    openedFile.value = null;
    fileContent.value = undefined;
    preferPreview.value = false;
    editorKindOverride.value = null;
    showFileDrawer.value = false;
  };

  return {
    openedFile,
    fileContent,
    fileLoading,
    showFileDrawer,
    preferPreview,
    editorKindOverride,
    useTextEditor,
    openFile,
    saveFile,
    closeFile
  };
}

export type FilePreviewState = ReturnType<typeof useFilePreview>;
