import { UploadFileInfo } from "naive-ui";
import { FileUploadOptions, UploadConfig, UploadStatus } from "./type";
import { formatFileSize, formatSpeed, formatTime } from "./utils";
import { ChunkUploadManager } from "./ChunkUploadManager";
import { ArchiveOutline, DocumentOutline, DocumentTextOutline, ImageOutline, MusicalNoteOutline, VideocamOutline } from "@vicons/ionicons5";

export function useChunkUpload(config: Partial<UploadConfig> = {}) {
  const uploader = new ChunkUploadManager(config);

  const uploadQueue = uploader.uploadQueue;
  const activeUploads = uploader.activeUploads;
  const completedUploads = uploader.completedUploads;
  const totalProgress = uploader.totalProgress;
  const uploadSpeed = uploader.uploadSpeed;
  const isUploading = uploader.isUploading;
  const isPaused = uploader.isPaused;
  const uploadStats = uploader.uploadStats;
  const networkQuality = uploader.networkQuality;

  const createNaiveFileList = (): UploadFileInfo[] => {
    const allTasks = [
      ...uploadQueue.value,
      ...Array.from(activeUploads.value.values()),
      ...completedUploads.value
    ];

    return allTasks.map((task): UploadFileInfo => ({
      id: task.id,
      name: task.file.name,
      status: convertToNaiveStatus(task.status),
      percentage: task.progress,
      file: task.file,
      thumbnailUrl: task.options.metadata?.preview,
      url: task.result?.fileUrl,
      type: task.file.type,
      fullPath: task.file.webkitRelativePath || task.file.name
    }));
  };

  const convertToNaiveStatus = (status: UploadStatus): UploadFileInfo['status'] => {
    const statusMap: Record<UploadStatus, UploadFileInfo['status']> = {
      [UploadStatus.PENDING]: 'pending',
      [UploadStatus.UPLOADING]: 'uploading',
      [UploadStatus.SUCCESS]: 'finished',
      [UploadStatus.ERROR]: 'error',
      [UploadStatus.PAUSED]: 'pending',
      [UploadStatus.CANCELLED]: 'removed',
    };
    return statusMap[status];
  };

  const addFiles = (files: File[] | FileList | File, options?: FileUploadOptions) => 
    uploader.addFiles(files, options);

  const start = () => uploader.start();
  const pauseAll = () => uploader.pauseAll();
  const resumeAll = () => uploader.resumeAll();
  const cancel = () => uploader.cancel();
  const retryFailed = () => uploader.retryFailed();
  const retrySingleFile = (taskId: string)=>uploader.retrySingleFile(taskId)
  const removeFile = (taskId: string) => uploader.removeFile(taskId);
  const clear = () => uploader.clear();
  const getTask = (taskId: string) => uploader.getTask(taskId);
  const getDetailedStats = () => uploader.getDetailedStats();
  const updateConfig = (newConfig: Partial<UploadConfig>) => uploader.updateConfig(newConfig);
  const destroy = () => uploader.destroy();
 
  // 获取进度条状态
  const getProgressStatus = (): 'default' | 'success' | 'error' => {
    if (uploadStats.value.failed > 0) return 'error';
    if (uploadStats.value.completed === uploadStats.value.total) return 'success';
    return 'default';
  };

  // 获取状态文本
  const getStatusText = (status: UploadStatus): string => {
    const textMap: Record<UploadStatus, string> = {
      [UploadStatus.PENDING]: '等待中',
      [UploadStatus.UPLOADING]: '上传中',
      [UploadStatus.SUCCESS]: '成功',
      [UploadStatus.ERROR]: '失败',
      [UploadStatus.PAUSED]: '已暂停',
      [UploadStatus.CANCELLED]: '已取消',
    };
    return textMap[status];
  };

  // 获取状态类型
  const getStatusType = (status: UploadStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    const typeMap: Record<UploadStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
      [UploadStatus.PENDING]: 'default',
      [UploadStatus.UPLOADING]: 'info',
      [UploadStatus.SUCCESS]: 'success',
      [UploadStatus.ERROR]: 'error',
      [UploadStatus.PAUSED]: 'warning',
      [UploadStatus.CANCELLED]: 'default',
    };
    return typeMap[status];
  };

  // 获取文件图标
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageOutline;
    if (mimeType.startsWith('video/')) return VideocamOutline;
    if (mimeType.startsWith('audio/')) return MusicalNoteOutline;
    if (mimeType.includes('pdf')) return DocumentTextOutline;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return ArchiveOutline;
    return DocumentOutline;
  };

  // 获取文件颜色
  const getFileColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '#18a058';
    if (mimeType.startsWith('video/')) return '#2080f0';
    if (mimeType.startsWith('audio/')) return '#f0a020';
    if (mimeType.includes('pdf')) return '#d03050';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '#7c3aed';
    return '#666';
  };

  return {
    uploadQueue,
    activeUploads,
    completedUploads,
    totalProgress,
    uploadSpeed,
    isUploading,
    isPaused,
    uploadStats,
    networkQuality,
    uploader,
    addFiles,
    start,
    pauseAll,
    resumeAll,
    cancel,
    retryFailed,
    removeFile,
    clear,
    getTask,
    getDetailedStats,
    updateConfig,
    destroy,
    createNaiveFileList,
    convertToNaiveStatus,
    formatFileSize,
    formatSpeed,
    formatTime,
    retrySingleFile,
    getProgressStatus,
    getStatusText,
    getStatusType,
    getFileIcon,
    getFileColor 
  };
}