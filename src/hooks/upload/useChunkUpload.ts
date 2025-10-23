import { UploadFileInfo } from "naive-ui";
import { FileUploadOptions, UploadConfig, UploadStatus } from "./type";
import { formatFileSize, formatSpeed, formatTime } from "./utils";
import { ChunkUploadManager } from "./ChunkUploadManager";

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
  const pause = () => uploader.pause();
  const resume = () => uploader.resume();
  const cancel = () => uploader.cancel();
  const retryFailed = () => uploader.retryFailed();
  const retrySingleFile = (taskId: string)=>uploader.retrySingleFile(taskId)
  const removeFile = (taskId: string) => uploader.removeFile(taskId);
  const clear = () => uploader.clear();
  const getTask = (taskId: string) => uploader.getTask(taskId);
  const getDetailedStats = () => uploader.getDetailedStats();
  const updateConfig = (newConfig: Partial<UploadConfig>) => uploader.updateConfig(newConfig);
  const destroy = () => uploader.destroy();
 

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
    pause,
    resume,
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
    retrySingleFile 
  };
}