/** 文件管理器上传集成 composable — 与 /upload 页面共用 useUploadHook + 默认配置 */
import { computed, ref } from 'vue';
import type { UploadConfig } from '@/hooks/upload';
import { useUploadHook } from '@/views/upload/hooks/useUploadHook';
import { useUploadSettings } from '@/views/upload/hooks/useUploadSettings';

/** 上传进度信息（供 StatusBar 使用） */
export interface UploadProgressInfo {
  total: number;
  completed: number;
  uploading: number;
  failed: number;
  progress: number;
  speed: number;
}

/** useFileExplorerUpload 选项 */
export interface UseFileExplorerUploadOptions {
  /** 合并到默认上传配置（与上传页同一套 settings） */
  uploadConfig?: Partial<UploadConfig>;
  /** 上传完成后回调（刷新文件列表） */
  onUploadComplete?: () => void;
}

/** 文件管理器上传集成 composable */
export function useFileExplorerUpload(options?: UseFileExplorerUploadOptions) {
  const { settings, chunkSizeOptions } = useUploadSettings();
  if (options?.uploadConfig) {
    Object.assign(settings, options.uploadConfig);
  }

  const upload = useUploadHook(settings);

  const showUploadDrawer = ref(false);

  const openUploadDrawer = () => {
    showUploadDrawer.value = true;
  };

  const closeUploadDrawer = () => {
    showUploadDrawer.value = false;
  };

  /** 从拖拽添加文件并打开抽屉（与上传页一致：需点击「开始上传」） */
  const addFilesAndOpenDrawer = async (files: File[]) => {
    if (files.length === 0) return;
    await upload.addFiles(files);
    openUploadDrawer();
  };

  upload.uploader.onFileSuccess(() => {
    options?.onUploadComplete?.();
  });
  upload.uploader.onAllComplete(() => {
    options?.onUploadComplete?.();
  });

  const uploadProgressInfo = computed<UploadProgressInfo | null>(() => {
    const stats = upload.uploadStats.value;
    if (stats.total === 0 && !upload.isUploading.value) return null;

    return {
      total: stats.total,
      completed: stats.completed,
      uploading: stats.active,
      failed: stats.failed,
      progress: upload.totalProgress.value,
      speed: upload.uploadSpeed.value
    };
  });

  return {
    upload,
    settings,
    chunkSizeOptions,
    showUploadDrawer,
    openUploadDrawer,
    closeUploadDrawer,
    addFilesAndOpenDrawer,
    uploadProgressInfo
  };
}
