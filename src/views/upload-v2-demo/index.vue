<script setup lang="ts">
import useDrawer from '@/components/base-drawer/useDrawer';
import type { CustomUploadFileInfo } from '@/components/custom-upload';
import CustomUpload from '@/components/custom-upload';
import type { FileTask, UploadConfig } from '@/hooks/upload-v2';
import { CONSTANTS, UploadStatus, ChunkStatus, useChunkUpload } from '@/hooks/upload-v2';
import {
  ArrowUpOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  CloudUploadOutline,
  CodeOutline,
  DocumentsOutline,
  FlashOutline,
  FolderOpenOutline,
  LanguageOutline,
  PauseOutline,
  PlayOutline,
  RefreshOutline,
  SettingsOutline,
  SpeedometerOutline,
  StatsChartOutline,
  TimeOutline,
  TrashOutline,
  WifiOutline
} from '@vicons/ionicons5';
import {
  NButton,
  NCard,
  NCode,
  NDataTable,
  NDivider,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NIcon,
  NInput,
  NInputNumber,
  NMessageProvider,
  NProgress,
  NScrollbar,
  NSelect,
  NSpace,
  NStatistic,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NText,
  NTimeline,
  NTimelineItem,
  useMessage,
  useThemeVars
} from 'naive-ui';
import { computed, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

const drawer = useDrawer();
const themeVars = useThemeVars();
const message = useMessage();

// ==================== 状态管理 ====================
const showSettings = ref(false);
const showStats = ref(false);
const showPerformance = ref(false);
const showEvents = ref(false);
const showI18n = ref(false);
const showAdvanced = ref(false);
const language = ref<'zh-CN' | 'en-US'>('zh-CN');

// 事件日志
const eventLogs = ref<Array<{ time: string; type: string; message: string; data?: any }>>([]);
const maxLogs = 100;

// 添加事件日志
const addEventLog = (type: string, message: string, data?: any) => {
  const time = new Date().toLocaleTimeString();
  eventLogs.value.unshift({ time, type, message, data });
  if (eventLogs.value.length > maxLogs) {
    eventLogs.value = eventLogs.value.slice(0, maxLogs);
  }
};

// ==================== 配置管理 ====================
const settings = reactive<Partial<UploadConfig>>({
  maxConcurrentFiles: CONSTANTS.CONCURRENT.DEFAULT_FILES,
  maxConcurrentChunks: CONSTANTS.CONCURRENT.DEFAULT_CHUNKS,
  chunkSize: CONSTANTS.UPLOAD.CHUNK_SIZE,
  minChunkSize: CONSTANTS.UPLOAD.MIN_CHUNK_SIZE,
  maxChunkSize: CONSTANTS.UPLOAD.MAX_CHUNK_SIZE,
  maxRetries: CONSTANTS.RETRY.MAX_RETRIES,
  retryDelay: CONSTANTS.RETRY.BASE_DELAY,
  retryBackoff: CONSTANTS.RETRY.BACKOFF_MULTIPLIER,
  timeout: CONSTANTS.UPLOAD.TIMEOUT,
  enableResume: true,
  enableDeduplication: false,
  enablePreview: CONSTANTS.PREVIEW.ENABLE_PREVIEW,
  enableCompression: CONSTANTS.COMPRESSION.ENABLE_COMPRESSION,
  useWorker: false,
  enableCache: true,
  enableNetworkAdaptation: true,
  enableSmartRetry: true,
  compressionQuality: CONSTANTS.COMPRESSION.COMPRESSION_QUALITY,
  previewMaxWidth: CONSTANTS.PREVIEW.PREVIEW_MAX_WIDTH,
  previewMaxHeight: CONSTANTS.PREVIEW.PREVIEW_MAX_HEIGHT,
  maxFileSize: CONSTANTS.UPLOAD.MAX_FILESIZE,
  maxFiles: CONSTANTS.UPLOAD.MAX_FILES,
  headers: {},
  customParams: {},
  // API 配置（需要根据实际情况修改）
  uploadChunkUrl: 'https://testaest-v1.umi6.com/proxy-minio/upload/chunk',
  mergeChunksUrl: 'https://testaest-v1.umi6.com/proxy-minio/upload/complete',
  checkFileUrl: undefined,
  cancelUploadUrl: undefined
});

// 分片大小选项
const chunkSizeOptions = [
  { label: '512 KB', value: 512 * 1024 },
  { label: '1 MB', value: 1024 * 1024 },
  { label: '2 MB', value: 2 * 1024 * 1024 },
  { label: '5 MB', value: 5 * 1024 * 1024 },
  { label: '10 MB', value: 10 * 1024 * 1024 },
  { label: '20 MB', value: 20 * 1024 * 1024 }
];

// ==================== 上传 Hook ====================
const token = `WGz4LlZ0W8P3+HOaQlLRkcdCuTsJGVrvvTZfdJYY3otxprBxscciMf+yoDBGJ+9f1bA5c+xXMNCkSzTr1aflzW0TcOXtrKagFj0ZvBk//rdHwQUzXVmVkiWN+5LR2wi/oqAnl5o5KmFP5tuTifyd1CUTZdG6aUPvnnHKbYZfevBbpvmuhKqC9Ks2v/NrfBGZ`;

const uploadHook = useChunkUpload({
  ...settings,
  chunkUploadTransformer: ({ task, chunk }) => {
    const formData = new FormData();
    if (chunk.blob) {
      formData.append('file', chunk.blob);
    }
    formData.append('chunk_number', chunk.index.toString());
    formData.append('upload_id', task.id);
    formData.append('Authorization', token);
    return formData;
  },
  mergeChunksTransformer: ({ task }) => {
    return {
      upload_id: task.id,
      filename: task.file.name,
      folder: task.file.webkitRelativePath,
      total_chunks: task.totalChunks,
      Authorization: token
    };
  }
});

// 解构 hook 返回值
const {
  addFiles,
  start,
  pauseAll,
  pause,
  resumeAll,
  resume,
  cancel,
  cancelAll,
  retryFailed,
  retrySingleFile,
  removeFile,
  clear,
  updateConfig,
  uploadQueue,
  activeUploads,
  completedUploads,
  totalProgress,
  uploadSpeed,
  uploadStats,
  isUploading,
  isPaused,
  networkQuality,
  getTodayStats,
  getHistoryStats,
  getTrendAnalysis,
  todayStats,
  trendAnalysis,
  getPerformanceReport,
  getPerformanceMetrics,
  setLanguage,
  formatFileSize,
  formatSpeed,
  formatTime,
  getProgressStatus,
  getStatusText,
  getFileIcon,
  getFileColor,
  uploader
} = uploadHook as any;

// ==================== 事件监听 ====================
onMounted(() => {
  // 注册所有事件监听器
  uploader.onFileProgress((task: FileTask) => {
    addEventLog('progress', `文件进度更新: ${task.file.name}`, {
      progress: task.progress,
      speed: task.speed,
      uploadedChunks: task.uploadedChunks,
      totalChunks: task.totalChunks
    });
  });

  uploader.onFileSuccess((task: FileTask) => {
    addEventLog('success', `文件上传成功: ${task.file.name}`, { task });
    message.success(`上传成功: ${task.file.name}`);
  });

  uploader.onFileError((task: FileTask, error: any) => {
    addEventLog('error', `文件上传失败: ${task.file.name}`, { error: error.message || error });
    message.error(`上传失败: ${task.file.name} - ${error.message || error}`);
  });

  uploader.onFilePause((task: FileTask) => {
    addEventLog('pause', `文件已暂停: ${task.file.name}`);
  });

  uploader.onFileResume((task: FileTask) => {
    addEventLog('resume', `文件已恢复: ${task.file.name}`);
  });

  uploader.onFileCancel((task: FileTask) => {
    addEventLog('cancel', `文件已取消: ${task.file.name}`);
  });

  uploader.onChunkSuccess((task: FileTask, chunk: any) => {
    addEventLog('chunk-success', `分片上传成功: ${task.file.name} - 分片 ${chunk.index + 1}`);
  });

  uploader.onChunkError((task: FileTask, chunk: any, error: any) => {
    addEventLog('chunk-error', `分片上传失败: ${task.file.name} - 分片 ${chunk.index + 1}`, { error });
  });

  uploader.onAllComplete((tasks: FileTask[]) => {
    addEventLog('all-complete', `所有文件上传完成，共 ${tasks.length} 个文件`);
    message.success(`所有文件上传完成！`);
  });

  uploader.onAllError((error: any) => {
    addEventLog('all-error', '所有文件上传失败', { error });
    message.error('所有文件上传失败');
  });
});

// ==================== 计算属性 ====================
const fileInputRef = ref<HTMLInputElement>();

// 平滑时间显示
const displayEstimatedTime = ref(0);
let localTime = 0;
let lastUpdateTime = 0;
let timeCountdownTimer: number | null = null;

const startTimeCountdown = (initialTime: number) => {
  if (timeCountdownTimer) {
    clearInterval(timeCountdownTimer);
  }

  localTime = initialTime;
  displayEstimatedTime.value = localTime;
  lastUpdateTime = Date.now();

  timeCountdownTimer = window.setInterval(() => {
    // 如果上传已暂停或未在上传，停止倒计时
    if (!isUploading.value || isPaused.value) {
      // 保持当前值不变，不继续递减
      return;
    }

    const now = Date.now();
    const elapsed = (now - lastUpdateTime) / 1000;

    localTime = Math.max(0, localTime - elapsed);
    displayEstimatedTime.value = Math.round(localTime);
    lastUpdateTime = now;

    if (localTime <= 0 && timeCountdownTimer) {
      clearInterval(timeCountdownTimer);
      timeCountdownTimer = null;
    }
  }, 1000);
};

watch(
  () => uploadStats.value.estimatedTime,
  newTime => {
    const diff = Math.abs(newTime - localTime);
    if (diff > 5 || timeCountdownTimer === null) {
      startTimeCountdown(newTime);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (timeCountdownTimer) {
    clearInterval(timeCountdownTimer);
  }
});

const failedCount = computed(() => {
  return completedUploads.value.filter((t: FileTask) => t.status === UploadStatus.ERROR).length;
});

const networkQualityText = computed(() => {
  const map: Record<string, string> = { good: '良好', fair: '一般', poor: '较差' };
  return map[networkQuality.value] || '未知';
});

const networkQualityColor = computed((): 'success' | 'warning' | 'error' | 'default' => {
  const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    good: 'success',
    fair: 'warning',
    poor: 'error'
  };
  return map[networkQuality.value] || 'default';
});

// 统计信息
const todayStatsData = computed(() => {
  const stats = getTodayStats() || {
    date: new Date().toISOString().split('T')[0],
    totalFiles: 0,
    totalSize: 0,
    successFiles: 0,
    failedFiles: 0,
    averageSpeed: 0,
    totalTime: 0
  };

  // 计算当前所有任务的已上传大小总和
  const allTasks = [
    ...(uploadQueue.value as FileTask[]),
    ...Array.from(activeUploads.value.values() as Iterable<FileTask>),
    ...(completedUploads.value as FileTask[])
  ];

  const uploadedSize = allTasks.reduce((sum, task) => {
    const taskUploadedSize = task.uploadedSize != null && Number.isFinite(task.uploadedSize) && task.uploadedSize >= 0
      ? task.uploadedSize
      : 0;
    return sum + taskUploadedSize;
  }, 0);

  return {
    ...stats,
    uploadedSize: Number.isFinite(uploadedSize) && uploadedSize >= 0 ? uploadedSize : 0
  };
});
const historyStatsData = computed(() => getHistoryStats(7));
const trendData = computed(() => getTrendAnalysis(7));

// 性能指标
const performanceMetrics = computed(() => getPerformanceMetrics());
const performanceReport = computed(() => getPerformanceReport());

// 文件列表数据
const allFiles = computed(() => {
  const queueFiles = (uploadQueue.value as FileTask[]).map((task: FileTask, index: number) => ({ ...task, section: 'queue', index }));
  const activeFiles = Array.from(activeUploads.value.values() as Iterable<FileTask>).map((task: FileTask, index: number) => ({ ...task, section: 'active', index }));
  const completedFiles = (completedUploads.value as FileTask[]).map((task: FileTask, index: number) => ({ ...task, section: 'completed', index }));
  return [...queueFiles, ...activeFiles, ...completedFiles];
});

// ==================== 事件处理 ====================
const handleFilesChange = async (files: CustomUploadFileInfo[]) => {
  if (!files || files.length === 0) return;
  try {
    const fileList = files.map(f => f.file);
    await addFiles(fileList);
    addEventLog('add-files', `添加了 ${files.length} 个文件到队列`);
    message.success(`已添加 ${files.length} 个文件`);
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  } catch (error: any) {
    addEventLog('error', `添加文件失败`, { error });
    message.error(`添加文件失败: ${error.message || error}`);
  }
};

const handleUploadError = (error: { file: File; message: string }) => {
  addEventLog('error', error.message, { file: error.file.name });
  message.error(error.message);
};

const handleExceed = (data: { files: File[]; max: number }) => {
  addEventLog('exceed', `文件数量超出限制`, { max: data.max });
  message.warning(`文件数量超出限制，最多允许 ${data.max} 个文件`);
};

const handleStartUpload = async () => {
  try {
    await start();
    addEventLog('start', '开始上传');
    message.info('开始上传');
  } catch (error: any) {
    addEventLog('error', '启动上传失败', { error });
    message.error(`启动上传失败: ${error.message || error}`);
  }
};

const handlePauseAll = async () => {
  try {
    await pauseAll();
    addEventLog('pause-all', '暂停所有上传');
    message.info('已暂停所有上传');
  } catch (error: any) {
    message.error(`暂停失败: ${error.message || error}`);
  }
};

const handleResumeAll = () => {
  try {
    resumeAll();
    addEventLog('resume-all', '恢复所有上传');
    message.info('已恢复所有上传');
  } catch (error: any) {
    message.error(`恢复失败: ${error.message || error}`);
  }
};

const handleRetryFailed = () => {
  try {
    retryFailed();
    addEventLog('retry-failed', `重试 ${failedCount.value} 个失败的文件`);
    message.info(`已重试 ${failedCount.value} 个失败的文件`);
    start();
  } catch (error: any) {
    message.error(`重试失败: ${error.message || error}`);
  }
};

const handleRetrySingle = (taskId: string) => {
  try {
    retrySingleFile(taskId);
    addEventLog('retry-single', `重试单个文件: ${taskId}`);
    message.info('已加入重试队列');
    start();
  } catch (error: any) {
    message.error(`重试失败: ${error.message || error}`);
  }
};

const handlePause = (taskId: string) => {
  try {
    pause(taskId);
    addEventLog('pause', `暂停文件: ${taskId}`);
  } catch (error: any) {
    message.error(`暂停失败: ${error.message || error}`);
  }
};

const handleResume = (taskId: string) => {
  try {
    resume(taskId);
    addEventLog('resume', `恢复文件: ${taskId}`);
  } catch (error: any) {
    message.error(`恢复失败: ${error.message || error}`);
  }
};

const handleCancel = (taskId: string) => {
  try {
    cancel(taskId);
    addEventLog('cancel', `取消文件: ${taskId}`);
    message.info('已取消上传');
  } catch (error: any) {
    message.error(`取消失败: ${error.message || error}`);
  }
};

const handleCancelAll = async () => {
  try {
    await cancelAll();
    addEventLog('cancel-all', '取消所有上传');
    message.info('已取消所有上传');
  } catch (error: any) {
    message.error(`取消失败: ${error.message || error}`);
  }
};

const handleRemove = (taskId: string) => {
  try {
    removeFile(taskId);
    addEventLog('remove', `移除文件: ${taskId}`);
    message.info('已移除文件');
  } catch (error: any) {
    message.error(`移除失败: ${error.message || error}`);
  }
};

const handleClear = () => {
  try {
    clear();
    eventLogs.value = [];
    addEventLog('clear', '清空所有文件和状态');
    message.success('已清空所有文件');
  } catch (error: any) {
    message.error(`清空失败: ${error.message || error}`);
  }
};

const handleViewTask = (task: FileTask) => {
  drawer.open({
    title: `任务详情 - ${task.file.name}`,
    content: () => h('div', { class: 'task-detail-container p-4 space-y-4' }, [
      // 基本信息卡片
      h(NCard, { title: '基本信息', class: 'mb-4' }, {
        default: () => h('div', { class: 'space-y-3' }, [
          h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '文件名：'),
            h('span', { class: 'font-semibold' }, task.file.name)
          ]),
          h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '文件大小：'),
            h('span', { class: 'font-semibold' }, formatFileSize(task.file.size))
          ]),
          h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '文件类型：'),
            h('span', { class: 'font-semibold' }, task.file.type || '未知')
          ]),
          h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '任务ID：'),
            h('span', { class: 'font-mono text-xs' }, task.id)
          ]),
          h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '状态：'),
            h(NTag, {
              type: task.status === UploadStatus.SUCCESS ? 'success' : task.status === UploadStatus.ERROR ? 'error' : 'info',
              size: 'small'
            }, { default: () => getStatusText(task.status) })
          ])
        ])
      }),

      // 上传进度卡片
      h(NCard, { title: '上传进度', class: 'mb-4' }, {
        default: () => h('div', { class: 'space-y-3' }, [
          h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '总进度：'),
            h('span', { class: 'font-semibold' }, `${Math.round(task.progress)}%`)
          ]),
          h(NProgress, {
            type: 'line',
            percentage: task.progress,
            status: task.status === UploadStatus.ERROR ? 'error' : task.status === UploadStatus.SUCCESS ? 'success' : 'default',
            height: 12
          }),
          h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '分片进度：'),
            h('span', { class: 'font-semibold' }, `${task.uploadedChunks} / ${task.totalChunks}`)
          ]),
          h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '已上传大小：'),
            h('span', { class: 'font-semibold' }, formatFileSize(task.uploadedSize || 0))
          ]),
          h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '上传速度：'),
            h('span', { class: 'font-semibold' }, formatSpeed(task.speed))
          ])
        ])
      }),

      // 时间信息卡片
      h(NCard, { title: '时间信息', class: 'mb-4' }, {
        default: () => h('div', { class: 'space-y-3' }, [
          task.startTime && h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '开始时间：'),
            h('span', { class: 'font-semibold text-sm' }, new Date(task.startTime).toLocaleString())
          ]),
          task.endTime && h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '结束时间：'),
            h('span', { class: 'font-semibold text-sm' }, new Date(task.endTime).toLocaleString())
          ]),
          task.pausedTime > 0 && h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '暂停时间：'),
            h('span', { class: 'font-semibold text-sm' }, new Date(task.pausedTime).toLocaleString())
          ]),
          task.resumeTime > 0 && h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '恢复时间：'),
            h('span', { class: 'font-semibold text-sm' }, new Date(task.resumeTime).toLocaleString())
          ]),
          task.startTime && task.endTime && h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '总耗时：'),
            h('span', { class: 'font-semibold' }, formatTime((task.endTime - task.startTime) / 1000))
          ])
        ])
      }),

      // 分片详情卡片
      task.chunks && task.chunks.length > 0 && h(NCard, { title: '分片详情', class: 'mb-4' }, {
        default: () => h('div', { class: 'space-y-2' }, [
          h('div', { class: 'text-sm text-gray-600 dark:text-gray-400 mb-2' }, `共 ${task.totalChunks} 个分片`),
          h(NScrollbar, { style: 'max-height: 300px' }, {
            default: () => h('div', { class: 'space-y-1' },
              task.chunks.slice(0, 50).map((chunk: any, index: number) => {
                const chunkStatusType = chunk.status === ChunkStatus.SUCCESS ? 'success' :
                                       chunk.status === ChunkStatus.ERROR ? 'error' :
                                       chunk.status === ChunkStatus.UPLOADING ? 'info' : 'default';
                return h('div', {
                  class: 'flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-700',
                  key: index
                }, [
                  h('span', { class: 'text-sm' }, `分片 ${chunk.index + 1}`),
                  h(NSpace, { size: 'small' }, {
                    default: () => [
                      h('span', { class: 'text-xs text-gray-500' }, formatFileSize(chunk.size)),
                      h(NTag, { type: chunkStatusType, size: 'small' }, {
                        default: () => chunk.status === ChunkStatus.SUCCESS ? '成功' :
                                     chunk.status === ChunkStatus.ERROR ? '失败' :
                                     chunk.status === ChunkStatus.UPLOADING ? '上传中' : '等待中'
                      })
                    ]
                  })
                ]);
              })
            )
          }),
          task.chunks.length > 50 && h('div', { class: 'text-xs text-gray-500 text-center mt-2' },
            `仅显示前 50 个分片，共 ${task.chunks.length} 个`
          )
        ])
      }),

      // 错误信息卡片
      task.error && h(NCard, { title: '错误信息', class: 'mb-4' }, {
        default: () => h('div', { class: 'space-y-2' }, [
          h('div', { class: 'text-sm text-red-600 dark:text-red-400' }, task.error?.message || String(task.error || '未知错误')),
          task.chunkErrors && task.chunkErrors.length > 0 && h('div', { class: 'mt-2' }, [
            h('div', { class: 'text-sm font-semibold mb-2' }, '分片错误：'),
            h('div', { class: 'space-y-1' },
              task.chunkErrors.map((err: any, index: number) =>
                h('div', {
                  key: index,
                  class: 'text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded'
                }, `分片 ${err.chunkIndex + 1}: ${err.error}`)
              )
            )
          ])
        ])
      }),

      // 结果信息卡片
      task.result && h(NCard, { title: '上传结果', class: 'mb-4' }, {
        default: () => h('div', { class: 'space-y-3' }, [
          task.result?.fileUrl && h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '文件URL：'),
            h('a', {
              href: task.result.fileUrl,
              target: '_blank',
              class: 'text-primary hover:underline text-sm font-mono break-all max-w-md',
              rel: 'noopener noreferrer'
            }, task.result.fileUrl)
          ]),
          task.result?.fileId && h('div', { class: 'flex items-center justify-between' }, [
            h('span', { class: 'text-gray-600 dark:text-gray-400' }, '文件ID：'),
            h('span', { class: 'font-mono text-sm' }, task.result.fileId)
          ])
        ])
      }),

      // 原始数据（可折叠）
      h(NCard, { title: '原始数据', class: 'mb-4' }, {
        default: () => h(NCode, {
          code: JSON.stringify(task, null, 2),
          language: 'json',
          wordWrap: true,
          showLineNumbers: false
        })
      })
    ]),
    width: 900,
    xScrollable: false
  });
};

const handleSettingChange = () => {
  updateConfig(settings);
  addEventLog('config-update', '配置已更新', { settings: { ...settings } });
  message.success('设置已更新');
};

const handleLanguageChange = (lang: 'zh-CN' | 'en-US') => {
  language.value = lang;
  setLanguage(lang);
  addEventLog('i18n', `语言切换为: ${lang}`);
  message.success(`语言已切换为 ${lang === 'zh-CN' ? '中文' : 'English'}`);
};

const clearEventLogs = () => {
  eventLogs.value = [];
  message.info('已清空事件日志');
};

// 表格列定义
const fileColumns = [
  {
    title: '序号',
    key: 'index',
    width: 60,
    render: (row: any) => row.index + 1
  },
  {
    title: '文件名',
    key: 'name',
    ellipsis: { tooltip: true },
    render: (row: FileTask) => row.file.name
  },
  {
    title: '大小',
    key: 'size',
    width: 100,
    render: (row: FileTask) => formatFileSize(row.file.size)
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row: FileTask) => {
      const statusText = getStatusText(row.status);
      const statusType = row.status === UploadStatus.SUCCESS ? 'success' : row.status === UploadStatus.ERROR ? 'error' : 'info';
      return h(NTag, { type: statusType, size: 'small' }, { default: () => statusText });
    }
  },
  {
    title: '进度',
    key: 'progress',
    width: 150,
    render: (row: FileTask) => {
      return h(NProgress, {
        type: 'line',
        percentage: row.progress,
        status: row.status === UploadStatus.ERROR ? 'error' : row.status === UploadStatus.SUCCESS ? 'success' : 'default',
        height: 8,
        showIndicator: false
      });
    }
  },
  {
    title: '速度',
    key: 'speed',
    width: 100,
    render: (row: FileTask) => formatSpeed(row.speed)
  },
  {
    title: '分片',
    key: 'chunks',
    width: 100,
    render: (row: FileTask) => `${row.uploadedChunks}/${row.totalChunks}`
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right' as const,
    render: (row: FileTask) => {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          row.status === UploadStatus.PENDING && h(NTag, {
            type: 'info',
            size: 'small',
            bordered: false
          }, { default: () => '等待中' }),
          row.status === UploadStatus.UPLOADING && h(NButton, {
            size: 'tiny',
            onClick: () => handlePause(row.id)
          }, { default: () => '暂停' }),
          row.status === UploadStatus.PAUSED && h(NButton, {
            size: 'tiny',
            type: 'primary',
            onClick: () => handleResume(row.id)
          }, { default: () => '恢复' }),
          (row.status === UploadStatus.UPLOADING || row.status === UploadStatus.PAUSED || row.status === UploadStatus.PENDING) && h(NButton, {
            size: 'tiny',
            type: 'error',
            onClick: () => handleCancel(row.id)
          }, { default: () => '取消' }),
          row.status === UploadStatus.ERROR && h(NButton, {
            size: 'tiny',
            type: 'warning',
            onClick: () => handleRetrySingle(row.id)
          }, { default: () => '重试' }),
          h(NButton, {
            size: 'tiny',
            quaternary: true,
            onClick: () => handleViewTask(row)
          }, { default: () => '详情' }),
          h(NButton, {
            size: 'tiny',
            quaternary: true,
            type: 'error',
            onClick: () => handleRemove(row.id)
          }, { default: () => '移除' })
        ]
      });
    }
  }
];
</script>

<template>
  <NMessageProvider>
    <div class="h-full w-full flex flex-col gap-4 p-4">
      <!-- 头部标题 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NIcon :component="CloudUploadOutline" :size="28" :color="themeVars.primaryColor" />
          <h1 class="m-0 text-2xl font-bold">Upload-V2 完整功能测试</h1>
        </div>
        <NSpace>
          <NButton size="small" quaternary circle @click="showI18n = true">
            <template #icon>
              <NIcon :component="LanguageOutline" />
            </template>
          </NButton>
          <NButton size="small" quaternary circle @click="showPerformance = true">
            <template #icon>
              <NIcon :component="FlashOutline" />
            </template>
          </NButton>
          <NButton size="small" quaternary circle @click="showStats = true">
            <template #icon>
              <NIcon :component="StatsChartOutline" />
            </template>
          </NButton>
          <NButton size="small" quaternary circle @click="showEvents = true">
            <template #icon>
              <NIcon :component="CodeOutline" />
            </template>
          </NButton>
          <NButton size="small" quaternary circle @click="showSettings = true">
            <template #icon>
              <NIcon :component="SettingsOutline" />
            </template>
          </NButton>
          <NButton v-if="uploadStats.total > 0" size="small" quaternary circle type="error" @click="handleClear">
            <template #icon>
              <NIcon :component="TrashOutline" />
            </template>
          </NButton>
        </NSpace>
      </div>

      <!-- 统计卡片 -->
      <NGrid :cols="4" :x-gap="12" :y-gap="12">
        <NGridItem>
          <NCard>
            <NStatistic label="总文件数" :value="uploadStats.total">
              <template #prefix>
                <NIcon :component="DocumentsOutline" />
              </template>
            </NStatistic>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard>
            <NStatistic label="上传中" :value="uploadStats.active" type="info">
              <template #prefix>
                <NIcon :component="ArrowUpOutline" />
              </template>
            </NStatistic>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard>
            <NStatistic label="已完成" :value="uploadStats.completed" type="success">
              <template #prefix>
                <NIcon :component="CheckmarkCircleOutline" />
              </template>
            </NStatistic>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard>
            <NStatistic label="失败" :value="uploadStats.failed" type="error">
              <template #prefix>
                <NIcon :component="CloseCircleOutline" />
              </template>
            </NStatistic>
          </NCard>
        </NGridItem>
      </NGrid>

      <!-- 上传区域和控制面板 -->
      <div class="w-full flex flex-col gap-4 xl:flex-row">
        <!-- 上传区域 -->
        <NCard class="flex-[2]" title="文件上传">
          <template #header-extra>
            <NTag type="info" size="small">支持拖拽、多选、文件夹</NTag>
          </template>
          <div class="flex flex-col gap-4">
            <CustomUpload
              ref="fileInputRef"
              :abstract="true"
              :multiple="true"
              :directory-dnd="true"
              :max="settings.maxFiles || CONSTANTS.UPLOAD.MAX_FILES"
              :max-size="settings.maxFileSize || CONSTANTS.UPLOAD.MAX_FILESIZE"
              :disabled="isUploading && !isPaused"
              :batch-size="100"
              :processing-timeout="20"
              @change="handleFilesChange"
              @error="handleUploadError"
              @exceed="handleExceed"
            >
              <template #default="{ isDragOver, isProcessing, fileCount }">
                <div class="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <NIcon
                    :component="CloudUploadOutline"
                    :size="64"
                    :color="isDragOver ? themeVars.primaryColor : themeVars.primaryColorHover"
                    class="transition-all duration-300"
                  />
                  <p class="mt-4 text-base font-medium">
                    {{ isProcessing ? '处理中...' : '拖拽文件到此处或点击选择' }}
                  </p>
                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    已选择 {{ fileCount }} 个文件
                  </p>
                </div>
              </template>
            </CustomUpload>

            <!-- 控制按钮 -->
            <div class="flex flex-wrap gap-2">
              <NButton
                type="primary"
                :disabled="uploadQueue.length === 0 || isUploading || isPaused"
                :loading="isUploading"
                @click="handleStartUpload"
              >
                <template #icon>
                  <NIcon :component="PlayOutline" />
                </template>
                开始上传
              </NButton>
              <NButton :disabled="!isUploading || isPaused" @click="handlePauseAll">
                <template #icon>
                  <NIcon :component="PauseOutline" />
                </template>
                暂停全部
              </NButton>
              <NButton :disabled="!isPaused || isUploading" @click="handleResumeAll">
                <template #icon>
                  <NIcon :component="PlayOutline" />
                </template>
                恢复全部
              </NButton>
              <NButton :disabled="!isUploading && !isPaused" type="error" @click="handleCancelAll">
                <template #icon>
                  <NIcon :component="CloseCircleOutline" />
                </template>
                取消全部
              </NButton>
              <NButton :disabled="failedCount === 0" type="warning" @click="handleRetryFailed">
                <template #icon>
                  <NIcon :component="RefreshOutline" />
                </template>
                重试失败 ({{ failedCount }})
              </NButton>
            </div>
          </div>
        </NCard>

        <!-- 上传统计 -->
        <NCard class="flex-1 max-w-[280px]" title="上传统计">
          <div class="flex flex-col gap-4">
            <!-- 全局进度 -->
            <div>
              <div class="mb-2 flex items-center justify-between text-sm">
                <span>总进度</span>
                <span class="font-semibold">{{ Math.round(totalProgress) }}%</span>
              </div>
              <NProgress
                type="line"
                :percentage="totalProgress"
                :status="getProgressStatus()"
                :height="16"
                :border-radius="8"
                :fill-border-radius="8"
              />
            </div>

            <!-- 详细信息 -->
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <NIcon :component="SpeedometerOutline" :size="16" />
                  上传速度
                </span>
                <span class="font-semibold">{{ formatSpeed(uploadSpeed) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <NIcon :component="TimeOutline" :size="16" />
                  预计剩余时间
                </span>
                <span class="font-semibold">{{ formatTime(displayEstimatedTime) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <NIcon :component="WifiOutline" :size="16" />
                  网络质量
                </span>
                <NTag :type="networkQualityColor" size="small" :bordered="false">
                  {{ networkQualityText }}
                </NTag>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <NIcon :component="DocumentsOutline" :size="16" />
                  已上传大小
                </span>
                <span class="font-semibold">{{ formatFileSize(uploadStats.uploadedSize || 0) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <NIcon :component="FolderOpenOutline" :size="16" />
                  总大小
                </span>
                <span class="font-semibold">{{ formatFileSize(uploadStats.totalSize || 0) }}</span>
              </div>
            </div>
          </div>
        </NCard>
      </div>

      <!-- 文件列表 -->
      <NCard title="文件列表" class="flex-1">
        <template #header-extra>
          <NSpace>
            <NTag type="info" size="small">队列: {{ uploadQueue.length }}</NTag>
            <NTag type="primary" size="small">上传中: {{ activeUploads.size }}</NTag>
            <NTag type="success" size="small">已完成: {{ completedUploads.length }}</NTag>
          </NSpace>
        </template>
        <NDataTable
          :columns="fileColumns"
          :data="allFiles"
          :pagination="false"
          :max-height="400"
          :scroll-x="1200"
          virtual-scroll
        />
      </NCard>

      <!-- 设置抽屉 -->
      <NDrawer v-model:show="showSettings" :width="500" placement="right">
        <NDrawerContent title="上传设置" closable>
          <NTabs type="line" animated>
            <NTabPane name="basic" tab="基础设置">
              <NForm label-placement="left" label-width="140" class="mt-4">
                <NFormItem label="并发文件数">
                  <NInputNumber
                    v-model:value="settings.maxConcurrentFiles"
                    :min="1"
                    :max="20"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
                <NFormItem label="并发分片数">
                  <NInputNumber
                    v-model:value="settings.maxConcurrentChunks"
                    :min="1"
                    :max="20"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
                <NFormItem label="分片大小">
                  <NSelect
                    v-model:value="settings.chunkSize"
                    :options="chunkSizeOptions"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
                <NFormItem label="最大重试次数">
                  <NInputNumber
                    v-model:value="settings.maxRetries"
                    :min="0"
                    :max="10"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
                <NFormItem label="超时时间(ms)">
                  <NInputNumber
                    v-model:value="settings.timeout"
                    :min="1000"
                    :max="300000"
                    :step="1000"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
                <NFormItem label="最大文件大小">
                  <NInputNumber
                    v-model:value="settings.maxFileSize"
                    :min="1024"
                    :step="1024 * 1024"
                    @update:value="handleSettingChange"
                  />
                  <template #feedback>
                    <NText depth="3" style="font-size: 12px">
                      当前: {{ settings.maxFileSize ? formatFileSize(settings.maxFileSize) : '无限制' }}
                    </NText>
                  </template>
                </NFormItem>
                <NFormItem label="最大文件数量">
                  <NInputNumber
                    v-model:value="settings.maxFiles"
                    :min="1"
                    :max="1000"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
              </NForm>
            </NTabPane>
            <NTabPane name="features" tab="功能开关">
              <NForm label-placement="left" label-width="140" class="mt-4">
                <NFormItem label="断点续传">
                  <NSwitch v-model:value="settings.enableResume" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="文件去重">
                  <NSwitch v-model:value="settings.enableDeduplication" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="预览功能">
                  <NSwitch v-model:value="settings.enablePreview" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="自动压缩">
                  <NSwitch v-model:value="settings.enableCompression" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="使用 Worker">
                  <NSwitch v-model:value="settings.useWorker" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="启用缓存">
                  <NSwitch v-model:value="settings.enableCache" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="网络自适应">
                  <NSwitch v-model:value="settings.enableNetworkAdaptation" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="智能重试">
                  <NSwitch v-model:value="settings.enableSmartRetry" @update:value="handleSettingChange" />
                </NFormItem>
              </NForm>
            </NTabPane>
            <NTabPane name="advanced" tab="高级设置">
              <NForm label-placement="left" label-width="140" class="mt-4">
                <NFormItem label="压缩质量">
                  <NInputNumber
                    v-model:value="settings.compressionQuality"
                    :min="0.1"
                    :max="1"
                    :step="0.1"
                    :precision="1"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
                <NFormItem label="预览最大宽度">
                  <NInputNumber
                    v-model:value="settings.previewMaxWidth"
                    :min="50"
                    :max="1000"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
                <NFormItem label="预览最大高度">
                  <NInputNumber
                    v-model:value="settings.previewMaxHeight"
                    :min="50"
                    :max="1000"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
                <NFormItem label="重试延迟(ms)">
                  <NInputNumber
                    v-model:value="settings.retryDelay"
                    :min="100"
                    :max="10000"
                    :step="100"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
                <NFormItem label="重试退避倍数">
                  <NInputNumber
                    v-model:value="settings.retryBackoff"
                    :min="1"
                    :max="5"
                    :step="0.1"
                    :precision="1"
                    @update:value="handleSettingChange"
                  />
                </NFormItem>
              </NForm>
            </NTabPane>
            <NTabPane name="api" tab="API 配置">
              <NForm label-placement="top" class="mt-4">
                <NFormItem label="分片上传 URL">
                  <NInput v-model:value="settings.uploadChunkUrl" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="合并分片 URL">
                  <NInput v-model:value="settings.mergeChunksUrl" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="秒传检查 URL (可选)">
                  <NInput v-model:value="settings.checkFileUrl" @update:value="handleSettingChange" />
                </NFormItem>
                <NFormItem label="取消上传 URL (可选)">
                  <NInput v-model:value="settings.cancelUploadUrl" @update:value="handleSettingChange" />
                </NFormItem>
              </NForm>
            </NTabPane>
          </NTabs>
        </NDrawerContent>
      </NDrawer>

      <!-- 统计信息抽屉 -->
      <NDrawer v-model:show="showStats" :width="600" placement="right">
        <NDrawerContent title="统计信息" closable>
          <NTabs type="line" animated>
            <NTabPane name="today" tab="今日统计">
              <div class="mt-4 space-y-4">
                <NGrid :cols="2" :x-gap="12" :y-gap="12">
                  <NGridItem>
                    <NStatistic label="总文件数" :value="todayStatsData.totalFiles" />
                  </NGridItem>
                  <NGridItem>
                    <NStatistic label="成功文件数" :value="todayStatsData.successFiles" type="success" />
                  </NGridItem>
                  <NGridItem>
                    <NStatistic label="失败文件数" :value="todayStatsData.failedFiles" type="error" />
                  </NGridItem>
                  <NGridItem>
                    <NStatistic label="总大小" :value="formatFileSize(todayStatsData.totalSize)" />
                  </NGridItem>
                  <NGridItem>
                    <NStatistic label="已上传大小" :value="formatFileSize(todayStatsData.uploadedSize)" />
                  </NGridItem>
                  <NGridItem>
                    <NStatistic label="平均速度" :value="formatSpeed(todayStatsData.averageSpeed)" />
                  </NGridItem>
                </NGrid>
              </div>
            </NTabPane>
            <NTabPane name="trend" tab="趋势分析">
              <div class="mt-4 space-y-4">
                <NCard title="速度趋势">
                  <NTag :type="trendData.speedTrend === 'increasing' ? 'success' : trendData.speedTrend === 'decreasing' ? 'error' : 'info'">
                    {{ trendData.speedTrend === 'increasing' ? '上升' : trendData.speedTrend === 'decreasing' ? '下降' : '稳定' }}
                  </NTag>
                </NCard>
                <NCard title="成功率">
                  <NStatistic :value="trendData.successRate.toFixed(2) + '%'" />
                </NCard>
                <NCard title="平均速度">
                  <NStatistic :value="formatSpeed(trendData.averageSpeed)" />
                </NCard>
                <NCard title="峰值速度">
                  <NStatistic :value="formatSpeed(trendData.peakSpeed)" />
                </NCard>
              </div>
            </NTabPane>
            <NTabPane name="history" tab="历史记录">
              <div class="mt-4">
                <NDataTable
                  :columns="[
                    { title: '日期', key: 'date', width: 120 },
                    { title: '总文件', key: 'totalFiles', width: 100 },
                    { title: '成功', key: 'successFiles', width: 100 },
                    { title: '失败', key: 'failedFiles', width: 100 },
                    { title: '总大小', key: 'totalSize', width: 120, render: (row: any) => formatFileSize(row.totalSize) },
                    { title: '平均速度', key: 'averageSpeed', width: 120, render: (row: any) => formatSpeed(row.averageSpeed) }
                  ]"
                  :data="historyStatsData"
                  :pagination="false"
                />
              </div>
            </NTabPane>
          </NTabs>
        </NDrawerContent>
      </NDrawer>

      <!-- 性能监控抽屉 -->
      <NDrawer v-model:show="showPerformance" :width="600" placement="right">
        <NDrawerContent title="性能监控" closable>
          <div class="mt-4 space-y-4">
            <NCard title="性能指标">
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span>网络请求数:</span>
                  <span class="font-semibold">{{ performanceMetrics.networkRequestCount }}</span>
                </div>
                <div class="flex justify-between">
                  <span>总上传时间:</span>
                  <span class="font-semibold">{{ (performanceMetrics.totalUploadTime / 1000).toFixed(2) }}s</span>
                </div>
                <div class="flex justify-between">
                  <span>平均分片时间:</span>
                  <span class="font-semibold">{{ performanceMetrics.averageChunkTime.toFixed(2) }}ms</span>
                </div>
                <div class="flex justify-between">
                  <span>分片上传次数:</span>
                  <span class="font-semibold">{{ performanceMetrics.chunkUploadTimes.length }}</span>
                </div>
                <div v-if="performanceMetrics.memoryUsage" class="flex justify-between">
                  <span>内存使用:</span>
                  <span class="font-semibold">
                    {{ formatFileSize(performanceMetrics.memoryUsage.used) }} /
                    {{ formatFileSize(performanceMetrics.memoryUsage.total) }}
                  </span>
                </div>
              </div>
            </NCard>
            <NCard title="性能报告">
              <NCode :code="JSON.stringify(performanceReport, null, 2)" language="json" />
            </NCard>
          </div>
        </NDrawerContent>
      </NDrawer>

      <!-- 事件日志抽屉 -->
      <NDrawer v-model:show="showEvents" :width="700" placement="right">
        <NDrawerContent title="事件日志" closable>
          <template #header>
            <div class="flex items-center justify-between">
              <span>事件日志</span>
              <NButton size="small" @click="clearEventLogs">清空日志</NButton>
            </div>
          </template>
          <NScrollbar style="max-height: calc(100vh - 200px)" class="mt-4">
            <NTimeline>
              <NTimelineItem
                v-for="(log, index) in eventLogs"
                :key="index"
                :type="log.type === 'error' ? 'error' : log.type === 'success' ? 'success' : 'info'"
              >
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold">{{ log.type }}</span>
                    <span class="text-xs text-gray-500">{{ log.time }}</span>
                  </div>
                  <div class="text-sm">{{ log.message }}</div>
                  <div v-if="log.data" class="mt-2">
                    <NCode :code="JSON.stringify(log.data, null, 2)" language="json" :show-line-numbers="false" />
                  </div>
                </div>
              </NTimelineItem>
            </NTimeline>
            <div v-if="eventLogs.length === 0" class="py-8 text-center text-gray-400">
              暂无事件日志
            </div>
          </NScrollbar>
        </NDrawerContent>
      </NDrawer>

      <!-- 国际化抽屉 -->
      <NDrawer v-model:show="showI18n" :width="400" placement="right">
        <NDrawerContent title="国际化设置" closable>
          <div class="mt-4 space-y-4">
            <NForm label-placement="left" label-width="100">
              <NFormItem label="语言">
                <NSelect
                  :value="language"
                  :options="[
                    { label: '中文 (简体)', value: 'zh-CN' },
                    { label: 'English', value: 'en-US' }
                  ]"
                  @update:value="handleLanguageChange"
                />
              </NFormItem>
            </NForm>
            <NDivider />
            <div class="space-y-2">
              <h4 class="font-semibold">状态文本示例</h4>
              <div class="space-y-1 text-sm">
                <div>pending: {{ getStatusText(UploadStatus.PENDING) }}</div>
                <div>uploading: {{ getStatusText(UploadStatus.UPLOADING) }}</div>
                <div>success: {{ getStatusText(UploadStatus.SUCCESS) }}</div>
                <div>error: {{ getStatusText(UploadStatus.ERROR) }}</div>
                <div>paused: {{ getStatusText(UploadStatus.PAUSED) }}</div>
                <div>cancelled: {{ getStatusText(UploadStatus.CANCELLED) }}</div>
              </div>
            </div>
          </div>
        </NDrawerContent>
      </NDrawer>
    </div>
  </NMessageProvider>
</template>

<style scoped>
.smooth-time {
  transition: opacity 0.3s ease;
  font-variant-numeric: tabular-nums;
}
</style>
