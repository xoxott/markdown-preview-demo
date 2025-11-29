import useDrawer from '@/components/base-drawer/useDrawer';
import type { FileTask } from '@/hooks/upload-v2';
import type { UploadConfig } from '@/hooks/upload-v2';
import type { ChunkSizeOption, TodayStatsData, HistoryStatsData, TrendAnalysisData, EventLog, PerformanceMetricsData } from '../../types';
import TaskDetailDrawer from './TaskDetailDrawer';
import SettingsDrawer from './SettingsDrawer';
import StatsDrawer from './StatsDrawer';
import PerformanceDrawer from './PerformanceDrawer';
import EventsDrawer from './EventsDrawer';
import I18nDrawer from './I18nDrawer';

/**
 * 统一的抽屉管理工具
 * 封装所有抽屉的打开逻辑，简化外部使用
 */
export function useDrawers() {
  const drawer = useDrawer();

  /**
   * 打开任务详情抽屉
   */
  const openTaskDetail = (
    task: FileTask,
    utils: {
      formatFileSize: (bytes: number) => string;
      formatSpeed: (bytesPerSecond: number) => string;
      formatTime: (seconds: number) => string;
      getStatusText: (status: any) => string;
    }
  ) => {
    return drawer.open({
      title: `任务详情 - ${task.file.name}`,
      content: () => (
        <TaskDetailDrawer
          task={task}
          formatFileSize={utils.formatFileSize}
          formatSpeed={utils.formatSpeed}
          formatTime={utils.formatTime}
          getStatusText={utils.getStatusText}
        />
      ),
      width: 900,
      xScrollable: false
    });
  };

  /**
   * 打开设置抽屉
   */
  const openSettings = (
    settings: Partial<UploadConfig>,
    chunkSizeOptions: ChunkSizeOption[],
    utils: {
      formatFileSize: (bytes: number) => string;
    },
    onUpdate: (key: keyof UploadConfig, value: unknown) => void
  ) => {
    return drawer.open({
      title: '上传设置',
      content: () => (
        <SettingsDrawer
          settings={settings}
          chunkSizeOptions={chunkSizeOptions}
          formatFileSize={utils.formatFileSize}
          onUpdate={onUpdate}
        />
      ),
      width: 500,
      placement: 'right'
    });
  };

  /**
   * 打开统计信息抽屉
   */
  const openStats = (
    todayStatsData: TodayStatsData,
    historyStatsData: HistoryStatsData[],
    trendData: TrendAnalysisData,
    utils: {
      formatFileSize: (bytes: number) => string;
      formatSpeed: (bytesPerSecond: number) => string;
    }
  ) => {
    return drawer.open({
      title: '统计信息',
      content: () => (
        <StatsDrawer
          todayStatsData={todayStatsData}
          historyStatsData={historyStatsData}
          trendData={trendData}
          formatFileSize={utils.formatFileSize}
          formatSpeed={utils.formatSpeed}
        />
      ),
      width: 600,
      placement: 'right'
    });
  };

  /**
   * 打开性能监控抽屉
   */
  const openPerformance = (
    performanceMetrics: PerformanceMetricsData,
    performanceReport: unknown,
    utils: {
      formatFileSize: (bytes: number) => string;
    }
  ) => {
    return drawer.open({
      title: '性能监控',
      content: () => (
        <PerformanceDrawer
          performanceMetrics={performanceMetrics}
          performanceReport={performanceReport}
          formatFileSize={utils.formatFileSize}
        />
      ),
      width: 600,
      placement: 'right'
    });
  };

  /**
   * 打开事件日志抽屉
   */
  const openEvents = (
    eventLogs: EventLog[],
    onClear: () => void
  ) => {
    return drawer.open({
      title: '事件日志',
      content: () => (
        <EventsDrawer
          eventLogs={eventLogs}
          onClear={onClear}
        />
      ),
      width: 700,
      placement: 'right'
    });
  };

  /**
   * 打开国际化抽屉
   */
  const openI18n = (
    language: 'zh-CN' | 'en-US',
    utils: {
      getStatusText: (status: any) => string;
    },
    onLanguageChange: (lang: 'zh-CN' | 'en-US') => void
  ) => {
    return drawer.open({
      title: '国际化设置',
      content: () => (
        <I18nDrawer
          language={language}
          getStatusText={utils.getStatusText}
          onLanguageChange={onLanguageChange}
        />
      ),
      width: 400,
      placement: 'right'
    });
  };

  return {
    openTaskDetail,
    openSettings,
    openStats,
    openPerformance,
    openEvents,
    openI18n
  };
}

