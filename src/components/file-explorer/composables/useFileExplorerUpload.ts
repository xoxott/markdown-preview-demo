/** 文件管理器上传集成 composable — 桥接 useChunkUpload 与 FileExplorer */
import { computed, ref } from 'vue';
import { useChunkUpload } from '@/hooks/upload';
import type { UploadConfig } from '@/hooks/upload/types';

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
  /** 上传配置（透传给 useChunkUpload） */
  uploadConfig?: Partial<UploadConfig>;
  /** 上传完成后回调（刷新文件列表） */
  onUploadComplete?: () => void;
}

/** 文件管理器上传集成 composable */
export function useFileExplorerUpload(options?: UseFileExplorerUploadOptions) {
  // 1. 初始化 useChunkUpload
  const upload = useChunkUpload(options?.uploadConfig || {});

  // 2. 上传抽屉状态
  const showUploadDrawer = ref(false);

  const openUploadDrawer = () => {
    showUploadDrawer.value = true;
  };

  const closeUploadDrawer = () => {
    showUploadDrawer.value = false;
  };

  // 3. 从拖拽/输入添加文件并开始上传
  const addFilesAndStart = async (files: File[]) => {
    if (files.length === 0) return;
    await upload.addFiles(files);
    upload.start();
    openUploadDrawer();
  };

  // 4. 上传完成后刷新文件列表（通过原始 uploader 实例注册回调）
  upload.uploader
    .onFileSuccess(() => {
      options?.onUploadComplete?.();
    })
    .onAllComplete(() => {
      options?.onUploadComplete?.();
    });

  // 5. StatusBar 进度信息（computed）
  const uploadProgressInfo = computed<UploadProgressInfo | null>(() => {
    const stats = upload.uploadStats.value;
    // 有文件在队列时才显示（包括已完成/失败的）
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
    /** useChunkUpload 完整返回值 */
    upload,
    /** 上传抽屉显示状态 */
    showUploadDrawer,
    /** 打开上传抽屉 */
    openUploadDrawer,
    /** 关闭上传抽屉 */
    closeUploadDrawer,
    /** 添加文件并开始上传 */
    addFilesAndStart,
    /** StatusBar 进度信息（null 表示无上传任务） */
    uploadProgressInfo
  };
}
