/**
 * 上传 Hook
 * 提供简洁的 API 接口
 */
import type { UploadFileInfo } from 'naive-ui';
import { computed, onUnmounted } from 'vue';
import { UploadOrchestrator } from './core/UploadOrchestrator';
import type { UploadConfig } from './types';
import { createMethodWrappers, createPropertyAccessors } from './utils/api-wrapper';
import { getFileColor, getFileIcon } from './utils/file-type';
import { formatFileSize, formatSpeed, formatTime } from './utils/format';
import { i18n, type StatusTextMap } from './utils/i18n';
import { performanceMonitor } from './utils/performance-monitor';
import { convertToNaiveStatus, getStatusText, getStatusType } from './utils/status-mapper';

export function useChunkUpload(config: Partial<UploadConfig> = {}) {
  const uploader = new UploadOrchestrator(config);

  // 自动清理：组件卸载时销毁上传器
  onUnmounted(() => {
    uploader?.destroy?.();
  });

  // 批量创建属性访问器
  const state = createPropertyAccessors(uploader, [
    'uploadQueue',
    'activeUploads',
    'completedUploads',
    'totalProgress',
    'uploadSpeed',
    'isUploading',
    'isPaused',
    'uploadStats',
    'networkQuality'
  ] as const);

  // 批量创建方法包装器
  const methods = createMethodWrappers(uploader, [
    'addFiles',
    'start',
    'pauseAll',
    'pause',
    'resumeAll',
    'resume',
    'cancel',
    'cancelAll',
    'retryFailed',
    'retrySingleFile',
    'removeFile',
    'clear',
    'getTask',
    'updateConfig',
    'destroy'
  ] as const);

  /**
   * 创建 Naive UI 文件列表
   */
  const createNaiveFileList = (): UploadFileInfo[] => {
    const allTasks = [
      ...state.uploadQueue.value,
      ...Array.from(state.activeUploads.value.values()),
      ...state.completedUploads.value
    ];

    return allTasks.map(
      (task): UploadFileInfo => ({
        id: task.id,
        name: task.file.name,
        status: convertToNaiveStatus(task.status),
        percentage: task.progress,
        file: task.file,
        thumbnailUrl: task.options.metadata?.preview,
        url: task.result?.fileUrl,
        type: task.file.type,
        fullPath: task.file.webkitRelativePath || task.file.name
      })
    );
  };

  /**
   * 统计信息 API
   */
  const statsManager = uploader.getStatsManager();
  const getTodayStats = () => statsManager.getTodayStats();
  const getHistoryStats = (days = 7) => statsManager.getHistoryStats(days);
  const getTrendAnalysis = (days = 7) => statsManager.getTrendAnalysis(days);

  // 响应式统计信息
  const todayStats = computed(() => getTodayStats());
  const trendAnalysis = computed(() => getTrendAnalysis(7));

  /**
   * 获取进度条状态
   */
  const getProgressStatus = (): 'default' | 'success' | 'error' => {
    const stats = state.uploadStats.value;
    if (stats.failed > 0) return 'error';
    if (stats.completed === stats.total) return 'success';
    return 'default';
  };

  /**
   * 国际化 API
   */
  const setLanguage = (language: 'zh-CN' | 'en-US') => i18n.setLanguage(language);
  const setCustomTexts = (texts: Partial<{ status: Partial<StatusTextMap> }>) => {
    i18n.setCustomTexts(texts as any);
  };

  /**
   * 性能监控 API
   */
  const getPerformanceReport = () => performanceMonitor.generateReport();
  const getPerformanceMetrics = () => performanceMonitor.getMetrics();

  return {
    // 状态（响应式）
    ...state,
    // 方法
    ...methods,
    // 工具函数
    createNaiveFileList,
    convertToNaiveStatus,
    getStatusText,
    getStatusType,
    getFileIcon,
    getFileColor,
    getProgressStatus,
    // 格式化工具
    formatFileSize,
    formatSpeed,
    formatTime,
    // 统计信息
    getTodayStats,
    getHistoryStats,
    getTrendAnalysis,
    todayStats,
    trendAnalysis,
    // 国际化
    setLanguage,
    setCustomTexts,
    // 性能监控
    getPerformanceReport,
    getPerformanceMetrics,
    // 原始上传器实例（用于高级用法）
    uploader
  };
}

