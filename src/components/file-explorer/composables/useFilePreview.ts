import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import type { FileItem } from '../types/file-explorer';
import type { IFileDataSource } from '../datasources/types';

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

  /** 文本内容走内置编辑器（Markdown 含编辑/预览/分屏），二进制走预览器 */
  const useTextEditor = () => typeof fileContent.value === 'string';

  /** 打开文件 */
  const openFile = async (file: FileItem) => {
    if (file.type === 'folder') return false;

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
    showFileDrawer.value = false;
  };

  return {
    openedFile,
    fileContent,
    fileLoading,
    showFileDrawer,
    useTextEditor,
    openFile,
    saveFile,
    closeFile
  };
}

export type FilePreviewState = ReturnType<typeof useFilePreview>;
