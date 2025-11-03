/* eslint-disable no-plusplus */
// composables/useUpload.ts
import { computed, reactive, ref } from 'vue';
import type { UploadFileInfo } from 'naive-ui';

export interface UploadState {
  files: UploadFileInfo[];
  uploading: number;
  completed: number;
  failed: number;
  total: number;
  progress: number;
}

export interface UploadConfig {
  maxSize?: number;
  maxFiles?: number;
  allowedTypes?: string[];
  autoStart?: boolean;
}

export interface UploadStats {
  totalSize: number;
  uploadedSize: number;
  speed: number;
  remainingTime: number;
}

export function useUpload(config: UploadConfig = {}) {
  // 响应式状态
  const files = ref<UploadFileInfo[]>([]);
  const uploadStats = reactive<UploadStats>({
    totalSize: 0,
    uploadedSize: 0,
    speed: 0,
    remainingTime: 0
  });

  // 上传状态统计
  const uploadState = computed<UploadState>(() => {
    const total = files.value.length;
    const uploading = files.value.filter(f => f.status === 'uploading').length;
    const completed = files.value.filter(f => f.status === 'finished').length;
    const failed = files.value.filter(f => f.status === 'error').length;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      files: files.value,
      uploading,
      completed,
      failed,
      total,
      progress
    };
  });

  // 文件验证
  const validateFile = (file: File): { valid: boolean; message?: string } => {
    // 检查文件大小
    if (config.maxSize && file.size > config.maxSize) {
      return {
        valid: false,
        message: `文件大小不能超过 ${formatFileSize(config.maxSize)}`
      };
    }

    // 检查文件类型
    if (config.allowedTypes && config.allowedTypes.length > 0) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isAllowed = config.allowedTypes.some(type => {
        if (type.startsWith('.')) {
          return type.slice(1) === fileExt;
        }
        return type === fileExt;
      });

      if (!isAllowed) {
        return {
          valid: false,
          message: `不支持的文件类型，仅支持: ${config.allowedTypes.join(', ')}`
        };
      }
    }

    // 检查文件数量限制
    if (config.maxFiles && files.value.length >= config.maxFiles) {
      return {
        valid: false,
        message: `最多只能上传 ${config.maxFiles} 个文件`
      };
    }

    return { valid: true };
  };

  // 添加文件
  const addFile = (fileInfo: UploadFileInfo): boolean => {
    const validation = validateFile(fileInfo.file!);

    if (!validation.valid) {
      console.warn(validation.message);
      return false;
    }

    // 检查是否已存在相同文件
    const exists = files.value.some(f => f.name === fileInfo.name && f.file?.size === fileInfo.file?.size);

    if (!exists) {
      files.value.push(fileInfo);
      updateStats();
      return true;
    }

    return false;
  };

  // 移除文件
  const removeFile = (id: string) => {
    const index = files.value.findIndex(f => f.id === id);
    if (index > -1) {
      files.value.splice(index, 1);
      updateStats();
    }
  };

  // 清空文件列表
  const clearFiles = () => {
    files.value = [];
    resetStats();
  };

  // 重试失败的文件
  const retryFailedFiles = () => {
    files.value.forEach(file => {
      if (file.status === 'error') {
        file.status = 'pending' as any;
        file.percentage = 0;
      }
    });
  };

  // 更新文件状态
  const updateFileStatus = (id: string, status: string, percentage?: number, error?: Error) => {
    const file = files.value.find(f => f.id === id);
    if (file) {
      file.status = status as any;
      if (percentage !== undefined) {
        file.percentage = percentage;
      }
      updateStats();
    }
  };

  // 批量操作
  const batchUpdate = (updates: Array<{ id: string; status: string; percentage?: number }>) => {
    updates.forEach(update => {
      updateFileStatus(update.id, update.status, update.percentage);
    });
  };

  // 更新统计信息
  const updateStats = () => {
    uploadStats.totalSize = files.value.reduce((sum, file) => sum + (file.file?.size || 0), 0);

    uploadStats.uploadedSize = files.value.reduce((sum, file) => {
      const fileSize = file.file?.size || 0;
      const progress = file.percentage || 0;
      return sum + (fileSize * progress) / 100;
    }, 0);

    // 计算上传速度和剩余时间（这里需要配合实际的上传进度回调）
    const completedFiles = files.value.filter(f => f.status === 'finished').length;
    const totalFiles = files.value.length;

    if (totalFiles > 0) {
      uploadStats.speed = uploadStats.uploadedSize; // 简化计算
      const remainingSize = uploadStats.totalSize - uploadStats.uploadedSize;
      uploadStats.remainingTime = uploadStats.speed > 0 ? remainingSize / uploadStats.speed : 0;
    }
  };

  // 重置统计信息
  const resetStats = () => {
    uploadStats.totalSize = 0;
    uploadStats.uploadedSize = 0;
    uploadStats.speed = 0;
    uploadStats.remainingTime = 0;
  };

  // 获取指定状态的文件
  const getFilesByStatus = (status: string) => {
    return files.value.filter(file => file.status === status);
  };

  // 工具函数
  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    return `${Math.round(seconds / 3600)}小时`;
  };

  // 导出的方法和状态
  return {
    // 状态
    files,
    uploadState,
    uploadStats,

    // 方法
    addFile,
    removeFile,
    clearFiles,
    retryFailedFiles,
    updateFileStatus,
    batchUpdate,
    getFilesByStatus,
    validateFile,

    // 工具函数
    formatFileSize,
    formatTime,

    // 计算属性
    hasFiles: computed(() => files.value.length > 0),
    hasFailedFiles: computed(() => files.value.some(f => f.status === 'error')),
    isCompleted: computed(() => {
      const total = files.value.length;
      const completed = files.value.filter(f => f.status === 'finished').length;
      return total > 0 && total === completed;
    }),
    canRetry: computed(() => files.value.some(f => f.status === 'error'))
  };
}
