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
  const editorMode = ref<'preview' | 'edit'>('preview');
  const showFileDrawer = ref(false);

  /** 打开文件预览 */
  const openFile = async (file: FileItem) => {
    if (file.type === 'folder') return false;

    try {
      openedFile.value = file;
      fileLoading.value = true;
      showFileDrawer.value = true;
      editorMode.value = 'preview';

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

  /** 切换到编辑模式 */
  const editFile = () => {
    if (openedFile.value && typeof fileContent.value === 'string') {
      editorMode.value = 'edit';
    }
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
    editorMode.value = 'preview';
  };

  return {
    openedFile,
    fileContent,
    fileLoading,
    editorMode,
    showFileDrawer,
    openFile,
    editFile,
    saveFile,
    closeFile
  };
}
