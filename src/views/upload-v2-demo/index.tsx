import type { ChunkInfo, FileTask } from '@/hooks/upload-v2';
import { NMessageProvider, useMessage, useThemeVars } from 'naive-ui';
import { computed, defineComponent, onMounted, ref } from 'vue';
import FileList from './components/FileList';
import PageHeader from './components/PageHeader';
import StatsCards from './components/StatsCards';
import UploadArea from './components/UploadArea';
import UploadStats from './components/UploadStats';
import { useDrawers } from './components/drawers';
import { useEstimatedTime } from './hooks/useEstimatedTime';
import { useEventLogs } from './hooks/useEventLogs';
import { useUploadHook } from './hooks/useUploadHook';
import { useUploadSettings } from './hooks/useUploadSettings';
import {
  useAllFiles,
  useFailedCount,
  useNetworkQualityColor,
  useNetworkQualityText,
  useTodayStatsData
} from './utils/computed';
import {
  createFileHandlers,
  createFileOperationHandlers,
  createUploadHandlers
} from './utils/handlers';

export default defineComponent({
  name: 'UploadV2Demo',
  setup() {
    const themeVars = useThemeVars();
    const message = useMessage();
    const drawers = useDrawers();

    // ==================== 状态管理 ====================
    const language = ref<'zh-CN' | 'en-US'>('zh-CN');

    // ==================== Hooks ====================
    const { settings, chunkSizeOptions } = useUploadSettings();
    const uploadHook = useUploadHook(settings);
    const { eventLogs, addEventLog, clearEventLogs } = useEventLogs();

    // 计算属性
    const failedCount = useFailedCount(uploadHook.completedUploads);
    const networkQualityText = useNetworkQualityText(uploadHook.networkQuality);
    const networkQualityColor = useNetworkQualityColor(uploadHook.networkQuality);
    const todayStatsData = useTodayStatsData(
      uploadHook.getTodayStats,
      uploadHook.uploadQueue,
      uploadHook.activeUploads,
      uploadHook.completedUploads
    );
    const allFiles = useAllFiles(
      uploadHook.uploadQueue,
      uploadHook.activeUploads,
      uploadHook.completedUploads
    );

    // 预计剩余时间
    const estimatedTime = computed(() => uploadHook.uploadStats.value.estimatedTime || 0);
    const { displayEstimatedTime } = useEstimatedTime(
      estimatedTime,
      uploadHook.isUploading,
      uploadHook.isPaused
    );

    // ==================== 事件处理 ====================
    const fileHandlers = createFileHandlers(uploadHook, addEventLog, message);
    const uploadHandlers = createUploadHandlers(uploadHook, addEventLog, message, failedCount);
    const fileOperationHandlers = createFileOperationHandlers(uploadHook, addEventLog, message);

    // ==================== 事件监听 ====================
    onMounted(() => {
      // 注册所有事件监听器
      uploadHook.uploader.onFileProgress((task: FileTask) => {
        addEventLog('progress', `文件进度更新: ${task.file.name}`, {
          progress: task.progress,
          speed: task.speed,
          uploadedChunks: task.uploadedChunks,
          totalChunks: task.totalChunks
        });
      });

      uploadHook.uploader.onFileSuccess((task: FileTask) => {
        addEventLog('success', `文件上传成功: ${task.file.name}`, { task });
        message.success(`上传成功: ${task.file.name}`);
      });

      uploadHook.uploader.onFileError((task: FileTask, error: Error) => {
        addEventLog('error', `文件上传失败: ${task.file.name}`, { error: error.message || String(error) });
        message.error(`上传失败: ${task.file.name} - ${error.message || String(error)}`);
      });

      uploadHook.uploader.onFilePause((task: FileTask) => {
        addEventLog('pause', `文件已暂停: ${task.file.name}`);
      });

      uploadHook.uploader.onFileResume((task: FileTask) => {
        addEventLog('resume', `文件已恢复: ${task.file.name}`);
      });

      uploadHook.uploader.onFileCancel((task: FileTask) => {
        addEventLog('cancel', `文件已取消: ${task.file.name}`);
      });

      uploadHook.uploader.onChunkSuccess((task: FileTask, chunk: ChunkInfo) => {
        addEventLog('chunk-success', `分片上传成功: ${task.file.name} - 分片 ${chunk.index + 1}`);
      });

      uploadHook.uploader.onChunkError((task: FileTask, chunk: ChunkInfo, error: Error) => {
        addEventLog('chunk-error', `分片上传失败: ${task.file.name} - 分片 ${chunk.index + 1}`, { error });
      });

      uploadHook.uploader.onAllComplete((tasks: FileTask[]) => {
        addEventLog('all-complete', `所有文件上传完成，共 ${tasks.length} 个文件`);
        message.success('所有文件上传完成！');
      });

      uploadHook.uploader.onAllError((error: Error) => {
        addEventLog('all-error', '所有文件上传失败', { error });
        message.error('所有文件上传失败');
      });
    });

    // ==================== 抽屉控制 ====================
    const handleSettingChange = (): void => {
      uploadHook.updateConfig(settings);
      addEventLog('config-update', '配置已更新', { settings: { ...settings } });
      message.success('设置已更新');
    };

    const handleLanguageChange = (lang: 'zh-CN' | 'en-US'): void => {
      language.value = lang;
      uploadHook.setLanguage(lang);
      addEventLog('i18n', `语言切换为: ${lang}`);
      message.success(`语言已切换为 ${lang === 'zh-CN' ? '中文' : 'English'}`);
    };

    const handleViewTask = (task: FileTask): void => {
      drawers.openTaskDetail(task, {
        formatFileSize: uploadHook.formatFileSize,
        formatSpeed: uploadHook.formatSpeed,
        formatTime: uploadHook.formatTime,
        getStatusText: uploadHook.getStatusText
      });
    };

    const handleToggleDrawer = (type: 'settings' | 'stats' | 'performance' | 'events' | 'i18n'): void => {
      switch (type) {
        case 'settings':
          drawers.openSettings(
            settings,
            chunkSizeOptions,
            { formatFileSize: uploadHook.formatFileSize },
            (key, value) => {
              (settings as Record<string, unknown>)[key] = value;
              handleSettingChange();
            }
          );
          break;
        case 'stats':
          drawers.openStats(
            todayStatsData.value,
            uploadHook.getHistoryStats(7),
            uploadHook.trendAnalysis.value as any,
            {
              formatFileSize: uploadHook.formatFileSize,
              formatSpeed: uploadHook.formatSpeed
            }
          );
          break;
        case 'performance':
          drawers.openPerformance(
            uploadHook.getPerformanceMetrics(),
            uploadHook.getPerformanceReport(),
            { formatFileSize: uploadHook.formatFileSize }
          );
          break;
        case 'events':
          drawers.openEvents(eventLogs.value, clearEventLogs);
          break;
        case 'i18n':
          drawers.openI18n(
            language.value,
            { getStatusText: uploadHook.getStatusText },
            handleLanguageChange
          );
          break;
      }
    };

    // ==================== 文件列表列处理函数 ====================
    const fileListHandlers = {
      onPause: fileOperationHandlers.handlePause,
      onResume: fileOperationHandlers.handleResume,
      onCancel: fileOperationHandlers.handleCancel,
      onRetrySingle: fileOperationHandlers.handleRetrySingle,
      onViewTask: handleViewTask,
      onRemove: fileOperationHandlers.handleRemove
    };

    const fileListUtils = {
      formatFileSize: uploadHook.formatFileSize,
      formatSpeed: uploadHook.formatSpeed,
      getStatusText: uploadHook.getStatusText
    };

    return () => (
      <NMessageProvider>
        <div class="h-full w-full flex flex-col gap-4 p-4">
          {/* 头部标题 */}
          <PageHeader
            themeVars={themeVars.value}
            drawerState={{}}
            uploadStatsTotal={uploadHook.uploadStats.value.total}
            onToggleDrawer={handleToggleDrawer}
            onClear={() => fileOperationHandlers.handleClear(clearEventLogs)}
          />

          {/* 统计卡片 */}
          <StatsCards uploadStats={uploadHook.uploadStats.value} />

          {/* 上传区域和控制面板 */}
          <div class="w-full flex flex-col gap-4 xl:flex-row">
            {/* 上传区域 */}
            <UploadArea
              settings={settings}
              isUploading={uploadHook.isUploading.value}
              isPaused={uploadHook.isPaused.value}
              uploadQueueLength={uploadHook.uploadQueue.value.length}
              failedCount={failedCount.value}
              themeVars={themeVars.value}
              onFilesChange={fileHandlers.handleFilesChange}
              onUploadError={fileHandlers.handleUploadError}
              onExceed={fileHandlers.handleExceed}
              onStartUpload={uploadHandlers.handleStartUpload}
              onPauseAll={uploadHandlers.handlePauseAll}
              onResumeAll={uploadHandlers.handleResumeAll}
              onCancelAll={uploadHandlers.handleCancelAll}
              onRetryFailed={uploadHandlers.handleRetryFailed}
            />

            {/* 上传统计 */}
            <UploadStats
              totalProgress={uploadHook.totalProgress.value}
              uploadSpeed={uploadHook.uploadSpeed.value}
              displayEstimatedTime={displayEstimatedTime.value}
              networkQualityText={networkQualityText.value}
              networkQualityColor={networkQualityColor.value}
              uploadedSize={uploadHook.uploadStats.value.uploadedSize || 0}
              totalSize={uploadHook.uploadStats.value.totalSize || 0}
              getProgressStatus={uploadHook.getProgressStatus}
              formatSpeed={uploadHook.formatSpeed}
              formatTime={uploadHook.formatTime}
              formatFileSize={uploadHook.formatFileSize}
            />
          </div>

          {/* 文件列表 */}
          <FileList
            allFiles={allFiles.value}
            uploadQueueLength={uploadHook.uploadQueue.value.length}
            activeUploadsSize={uploadHook.activeUploads.value.size}
            completedUploadsLength={uploadHook.completedUploads.value.length}
            handlers={fileListHandlers}
            utils={fileListUtils}
          />
        </div>
      </NMessageProvider>
    );
  }
});

