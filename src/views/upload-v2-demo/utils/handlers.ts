import type { CustomUploadFileInfo } from '@/components/custom-upload';
import type { EventLog, UploadHookReturn } from '../types';

/**
 * 创建文件处理函数
 */
export function createFileHandlers(
  uploadHook: UploadHookReturn,
  addEventLog: (type: EventLog['type'], message: string, data?: unknown) => void,
  message: {
    success: (content: string) => void;
    error: (content: string) => void;
    warning: (content: string) => void;
    info: (content: string) => void;
  },
  fileInputRef?: { value?: { value: string } }
) {
  const handleFilesChange = async (files: CustomUploadFileInfo[]): Promise<void> => {
    if (!files || files.length === 0) return;
    try {
      const fileList = files.map((f) => f.file);
      await uploadHook.addFiles(fileList);
      addEventLog('add-files', `添加了 ${files.length} 个文件到队列`);
      message.success(`已添加 ${files.length} 个文件`);
      if (fileInputRef?.value) {
        fileInputRef.value.value = '';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addEventLog('error', '添加文件失败', { error });
      message.error(`添加文件失败: ${errorMessage}`);
    }
  };

  const handleUploadError = (error: { file: File; message: string }): void => {
    addEventLog('error', error.message, { file: error.file.name });
    message.error(error.message);
  };

  const handleExceed = (data: { files: File[]; max: number }): void => {
    addEventLog('exceed', '文件数量超出限制', { max: data.max });
    message.warning(`文件数量超出限制，最多允许 ${data.max} 个文件`);
  };

  return {
    handleFilesChange,
    handleUploadError,
    handleExceed
  };
}

/**
 * 创建上传控制函数
 */
export function createUploadHandlers(
  uploadHook: UploadHookReturn,
  addEventLog: (type: EventLog['type'], message: string, data?: unknown) => void,
  message: {
    success: (content: string) => void;
    error: (content: string) => void;
    info: (content: string) => void;
  },
  failedCount: { value: number }
) {
  const handleStartUpload = async (): Promise<void> => {
    try {
      await uploadHook.start();
      addEventLog('start', '开始上传');
      message.info('开始上传');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addEventLog('error', '启动上传失败', { error });
      message.error(`启动上传失败: ${errorMessage}`);
    }
  };

  const handlePauseAll = async (): Promise<void> => {
    try {
      await uploadHook.pauseAll();
      addEventLog('pause-all', '暂停所有上传');
      message.info('已暂停所有上传');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`暂停失败: ${errorMessage}`);
    }
  };

  const handleResumeAll = (): void => {
    try {
      uploadHook.resumeAll();
      addEventLog('resume-all', '恢复所有上传');
      message.info('已恢复所有上传');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`恢复失败: ${errorMessage}`);
    }
  };

  const handleRetryFailed = (): void => {
    try {
      uploadHook.retryFailed();
      addEventLog('retry-failed', `重试 ${failedCount.value} 个失败的文件`);
      message.info(`已重试 ${failedCount.value} 个失败的文件`);
      uploadHook.start();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`重试失败: ${errorMessage}`);
    }
  };

  const handleCancelAll = async (): Promise<void> => {
    try {
      await uploadHook.cancelAll();
      addEventLog('cancel', '取消所有上传');
      message.info('已取消所有上传');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`取消失败: ${errorMessage}`);
    }
  };

  return {
    handleStartUpload,
    handlePauseAll,
    handleResumeAll,
    handleRetryFailed,
    handleCancelAll
  };
}

/**
 * 创建文件操作函数
 */
export function createFileOperationHandlers(
  uploadHook: UploadHookReturn,
  addEventLog: (type: EventLog['type'], message: string, data?: unknown) => void,
  message: {
    success: (content: string) => void;
    error: (content: string) => void;
    info: (content: string) => void;
  }
) {
  const handlePause = (taskId: string): void => {
    try {
      uploadHook.pause(taskId);
      addEventLog('pause', `暂停文件: ${taskId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`暂停失败: ${errorMessage}`);
    }
  };

  const handleResume = (taskId: string): void => {
    try {
      uploadHook.resume(taskId);
      addEventLog('resume', `恢复文件: ${taskId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`恢复失败: ${errorMessage}`);
    }
  };

  const handleCancel = (taskId: string): void => {
    try {
      uploadHook.cancel(taskId);
      addEventLog('cancel', `取消文件: ${taskId}`);
      message.info('已取消上传');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`取消失败: ${errorMessage}`);
    }
  };

  const handleRetrySingle = (taskId: string): void => {
    try {
      uploadHook.retrySingleFile(taskId);
      addEventLog('retry-single', `重试单个文件: ${taskId}`);
      message.info('已加入重试队列');
      uploadHook.start();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`重试失败: ${errorMessage}`);
    }
  };

  const handleRemove = (taskId: string): void => {
    try {
      uploadHook.removeFile(taskId);
      addEventLog('remove', `移除文件: ${taskId}`);
      message.info('已移除文件');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`移除失败: ${errorMessage}`);
    }
  };

  const handleClear = (clearEventLogs: () => void): void => {
    try {
      uploadHook.clear();
      clearEventLogs();
      addEventLog('clear', '清空所有文件和状态');
      message.success('已清空所有文件');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`清空失败: ${errorMessage}`);
    }
  };

  return {
    handlePause,
    handleResume,
    handleCancel,
    handleRetrySingle,
    handleRemove,
    handleClear
  };
}

