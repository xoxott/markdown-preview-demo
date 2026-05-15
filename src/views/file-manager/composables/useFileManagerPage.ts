import { onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { mockFileItems } from '@/components/file-explorer/config/mockData';
import { useFileExplorerLogic } from '@/components/file-explorer/composables/useFileExplorerLogic';
import { useFilePreview } from '@/components/file-explorer/composables/useFilePreview';
import { useFileExplorerUpload } from '@/components/file-explorer/composables/useFileExplorerUpload';
import {
  type FileOpenPreference,
  resolveFileOpenMode
} from '@/components/file-explorer/open/resolveFileOpenMode';
import type { FileItem } from '@/components/file-explorer/types/file-explorer';

/** 文件管理器页面编排 — logic / 预览 / 上传与抽屉互斥 */
export function useFileManagerPage() {
  const message = useMessage();
  const containerRef = ref<HTMLElement | null>(null);

  /* eslint-disable @typescript-eslint/no-use-before-define -- logic 回调在下方 handler 定义后执行 */
  const logic = useFileExplorerLogic({
    initialItems: mockFileItems,
    containerRef,
    onOpen: (file: FileItem) => handleOpenFile(file),
    onUploadFile: () => handleOpenUploadDrawer(),
    onUploadFolder: () => handleOpenUploadDrawer()
  });
  /* eslint-enable @typescript-eslint/no-use-before-define */

  const preview = useFilePreview({
    dataSource: () => logic.dataSource.value,
    refreshFileList: logic.refreshFileList
  });

  const uploadIntegration = useFileExplorerUpload({
    onUploadComplete: () => logic.refreshFileList()
  });

  const handleOpenFile = async (file: FileItem, preference: FileOpenPreference = 'auto') => {
    uploadIntegration.closeUploadDrawer();

    const mode = resolveFileOpenMode(file, preference);

    if (mode === 'folder') {
      const targetPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
      logic.handleBreadcrumbNavigate(targetPath);
      return;
    }

    if (mode.type === 'unsupported') {
      message.warning(mode.message);
      return;
    }

    await preview.openFile(file, {
      preferPreview: mode.type === 'preview',
      editorKind: mode.type === 'editor' ? mode.editorKind : undefined
    });
  };

  const handleOpenUploadDrawer = () => {
    preview.closeFile();
    uploadIntegration.openUploadDrawer();
  };

  onMounted(async () => {
    if (logic.dataSource.value) {
      await logic.refreshFileList();
    } else {
      logic.setLoading(true, '加载文件列表...');
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 800);
      });
      logic.setLoading(false);
    }

    containerRef.value?.focus();
  });

  return {
    containerRef,
    logic,
    preview,
    uploadIntegration,
    handleOpenFile,
    handleOpenUploadDrawer
  };
}
