/**
 * 上传页核心面板：UploadArea + UploadStats + FileList
 * 供 /upload 页面与文件管理器上传抽屉共用
 */
import { computed, defineComponent, type PropType } from 'vue';
import { useMessage } from 'naive-ui';
import type { UploadConfig } from '@/hooks/upload';
import type { FileTask } from '@/hooks/upload';
import FileList from './FileList';
import UploadArea from './UploadArea';
import UploadStats from './UploadStats';
import type { EventLog, UploadHookReturn } from '../types';
import { useEstimatedTime } from '../hooks/useEstimatedTime';
import {
  useAllFiles,
  useFailedCount,
  useNetworkQualityColor,
  useNetworkQualityText
} from '../utils/computed';
import {
  createFileHandlers,
  createFileOperationHandlers,
  createUploadHandlers
} from '../utils/handlers';

interface ThemeVars {
  primaryColor: string;
  primaryColorHover: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
}

export default defineComponent({
  name: 'UploadMainPanel',
  props: {
    settings: {
      type: Object as PropType<Partial<UploadConfig>>,
      required: true
    },
    upload: {
      type: Object as PropType<UploadHookReturn>,
      required: true
    },
    themeVars: {
      type: Object as PropType<ThemeVars>,
      required: true
    },
    isMobile: {
      type: Boolean,
      required: true
    },
    addEventLog: {
      type: Function as PropType<(type: EventLog['type'], message: string, data?: unknown) => void>,
      required: true
    },
    onViewTask: {
      type: Function as PropType<(task: FileTask) => void>,
      required: true
    }
  },
  setup(props) {
    const message = useMessage();

    const failedCount = useFailedCount(props.upload.completedUploads);
    const networkQualityText = useNetworkQualityText(props.upload.networkQuality);
    const networkQualityColor = useNetworkQualityColor(props.upload.networkQuality);
    const allFiles = useAllFiles(
      props.upload.uploadQueue,
      props.upload.activeUploads,
      props.upload.completedUploads
    );

    const estimatedTime = computed(() => props.upload.uploadStats.value.estimatedTime || 0);
    const { displayEstimatedTime } = useEstimatedTime(
      estimatedTime,
      props.upload.isUploading,
      props.upload.isPaused
    );

    const fileHandlers = createFileHandlers(props.upload, props.addEventLog, message);
    const uploadHandlers = createUploadHandlers(
      props.upload,
      props.addEventLog,
      message,
      failedCount
    );
    const fileOperationHandlers = createFileOperationHandlers(
      props.upload,
      props.addEventLog,
      message
    );

    const fileListHandlers = {
      onPause: fileOperationHandlers.handlePause,
      onResume: fileOperationHandlers.handleResume,
      onCancel: fileOperationHandlers.handleCancel,
      onRetrySingle: fileOperationHandlers.handleRetrySingle,
      onViewTask: props.onViewTask,
      onRemove: fileOperationHandlers.handleRemove
    };

    const fileListUtils = {
      formatFileSize: props.upload.formatFileSize,
      formatSpeed: props.upload.formatSpeed,
      getStatusText: props.upload.getStatusText
    };

    return () => (
      <div class="flex min-h-0 flex-1 flex-col gap-4">
        <div class="flex flex-col gap-4 lg:flex-row">
          <UploadArea
            settings={props.settings}
            isUploading={props.upload.isUploading.value}
            isPaused={props.upload.isPaused.value}
            uploadQueueLength={props.upload.uploadQueue.value.length}
            totalFiles={props.upload.uploadStats.value.total}
            failedCount={failedCount.value}
            themeVars={props.themeVars}
            isMobile={props.isMobile}
            onFilesChange={fileHandlers.handleFilesChange}
            onUploadError={fileHandlers.handleUploadError}
            onExceed={fileHandlers.handleExceed}
            onStartUpload={uploadHandlers.handleStartUpload}
            onPauseAll={uploadHandlers.handlePauseAll}
            onResumeAll={uploadHandlers.handleResumeAll}
            onCancelAll={uploadHandlers.handleCancelAll}
            onRetryFailed={uploadHandlers.handleRetryFailed}
          />
          <UploadStats
            totalProgress={props.upload.totalProgress.value}
            uploadSpeed={props.upload.uploadSpeed.value}
            displayEstimatedTime={displayEstimatedTime.value}
            networkQualityText={networkQualityText.value}
            networkQualityColor={networkQualityColor.value}
            uploadedSize={props.upload.uploadStats.value.uploadedSize || 0}
            totalSize={props.upload.uploadStats.value.totalSize || 0}
            getProgressStatus={props.upload.getProgressStatus}
            formatSpeed={props.upload.formatSpeed}
            formatTime={props.upload.formatTime}
            formatFileSize={props.upload.formatFileSize}
            themeVars={props.themeVars}
          />
        </div>
        <FileList
          allFiles={allFiles.value}
          uploadQueueLength={props.upload.uploadQueue.value.length}
          activeUploadsSize={props.upload.activeUploads.value.size}
          completedUploadsLength={props.upload.completedUploads.value.length}
          handlers={fileListHandlers}
          utils={fileListUtils}
          isMobile={props.isMobile}
          themeVars={props.themeVars}
        />
      </div>
    );
  }
});
