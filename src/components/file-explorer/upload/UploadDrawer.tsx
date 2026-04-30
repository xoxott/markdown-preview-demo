/** 上传管理抽屉 — 完整的上传管理面板 */

import { computed, defineComponent, onUnmounted, ref } from 'vue';
import type { PropType } from 'vue';
import { NButton, NIcon, NProgress, NScrollbar } from 'naive-ui';
import {
  CloseCircleOutline,
  CloudUploadOutline,
  PauseOutline,
  PlayOutline,
  RefreshOutline
} from '@vicons/ionicons5';
import { UploadStatus } from '@/hooks/upload/types';
import type { FileTask } from '@/hooks/upload/types';
import { formatSpeed } from '@/hooks/upload/utils/format';
import CustomUpload from '@/components/custom-upload/index';
import UploadFileItem from './UploadFileItem';

/** useChunkUpload 返回值类型（核心子集） */
interface UploadHookSlice {
  uploadQueue: { value: FileTask[] };
  activeUploads: { value: Map<string, FileTask> };
  completedUploads: { value: FileTask[] };
  uploadStats: { value: { total: number; completed: number; uploading: number; failed: number; pending: number; paused: number; cancelled: number; totalSize: number; uploadedSize: number; averageSpeed: number; estimatedTime: number; instantSpeed: number; networkQuality: string } };
  isUploading: { value: boolean };
  isPaused: { value: boolean };
  totalProgress: { value: number };
  uploadSpeed: { value: number };
  addFiles: (files: File[] | FileList | File) => Promise<any>;
  start: () => any;
  pauseAll: () => Promise<any>;
  resumeAll: () => any;
  cancelAll: () => Promise<any>;
  retryFailed: () => any;
  pause: (taskId: string) => any;
  resume: (taskId: string) => any;
  cancel: (taskId: string) => any;
  retrySingleFile: (taskId: string) => any;
  removeFile: (taskId: string) => any;
  uploader: any;
}

/** UploadDrawer — 上传管理抽屉内容 */
export default defineComponent({
  name: 'UploadDrawer',
  props: {
    /** useChunkUpload 完整返回值 */
    upload: { type: Object as PropType<UploadHookSlice>, required: true },
    /** 关闭抽屉回调 */
    onClose: { type: Function as PropType<() => void>, required: true }
  },
  setup(props) {
    const customUploadRef = ref<any>(null);

    // 文件列表：合并队列 + active + completed
    const allFiles = computed<FileTask[]>(() => {
      const upload = props.upload;
      const queue: FileTask[] = upload.uploadQueue.value || [];
      const active: FileTask[] = Array.from((upload.activeUploads.value || new Map()).values());
      const completed: FileTask[] = upload.completedUploads.value || [];
      return [...active, ...queue, ...completed];
    });

    // 统计
    const stats = computed(() => props.upload.uploadStats.value);
    const isUploading = computed(() => props.upload.isUploading.value);
    const isPaused = computed(() => props.upload.isPaused.value);
    const totalProgress = computed(() => props.upload.totalProgress.value);
    const uploadSpeed = computed(() => props.upload.uploadSpeed.value);

    // CustomUpload 文件变更 → 添加到上传队列
    const handleFilesChange = async (files: any[]) => {
      if (files.length === 0) return;
      const rawFiles = files.map(f => f.file);
      await props.upload.addFiles(rawFiles);
      if (!isUploading.value) {
        props.upload.start();
      }
    };

    // 控制按钮操作
    const handleStartUpload = () => {
      props.upload.start();
    };

    const handlePauseAll = async () => {
      await props.upload.pauseAll();
    };

    const handleResumeAll = () => {
      props.upload.resumeAll();
    };

    const handleCancelAll = async () => {
      await props.upload.cancelAll();
    };

    const handleRetryFailed = () => {
      props.upload.retryFailed();
    };

    const handlePause = (taskId: string) => {
      props.upload.pause(taskId);
    };

    const handleResume = (taskId: string) => {
      props.upload.resume(taskId);
    };

    const handleCancel = (taskId: string) => {
      props.upload.cancel(taskId);
    };

    const handleRetry = (taskId: string) => {
      props.upload.retrySingleFile(taskId);
    };

    const handleRemove = (taskId: string) => {
      props.upload.removeFile(taskId);
    };

    // 清空完成文件
    const handleClearCompleted = () => {
      const completedFiles = allFiles.value.filter(f => f.status === UploadStatus.SUCCESS);
      completedFiles.forEach(f => handleRemove(f.id));
    };

    // 进度条状态
    const progressStatus = computed(() => {
      if (stats.value.failed > 0) return 'error';
      if (stats.value.completed === stats.value.total && stats.value.total > 0) return 'success';
      return 'default';
    });

    onUnmounted(() => {
      // 组件卸载时可选清空队列
    });

    return () => (
      <div class="h-full flex flex-col gap-4">
        {/* 添加文件区域 — CustomUpload abstract 模式 */}
        <CustomUpload
          ref={customUploadRef}
          abstract={true}
          multiple={true}
          directory-dnd={true}
          onChange={handleFilesChange}
        >
          {{
            default: ({ isDragOver }: { isDragOver: boolean }) => (
              <div
                class={[
                  'border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200',
                  isDragOver
                    ? 'border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                ]}
              >
                <NIcon
                  component={CloudUploadOutline}
                  size={32}
                  class={[
                    'transition-colors',
                    isDragOver ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                  ]}
                />
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {isDragOver ? '松开以添加文件' : '拖拽文件到此处或点击选择'}
                </p>
              </div>
            )
          }}
        </CustomUpload>

        {/* 控制按钮组 */}
        {allFiles.value.length > 0 && (
          <div class="flex items-center gap-2">
            {!isUploading.value && !isPaused.value && (
              <NButton type="primary" size="small" onClick={handleStartUpload}>
                开始上传
              </NButton>
            )}
            {isUploading.value && !isPaused.value && (
              <NButton size="small" onClick={handlePauseAll}>
                <NIcon component={PauseOutline} size={16} class="mr-1" />
                暂停全部
              </NButton>
            )}
            {isPaused.value && (
              <NButton type="primary" size="small" onClick={handleResumeAll}>
                <NIcon component={PlayOutline} size={16} class="mr-1" />
                恢复全部
              </NButton>
            )}
            {(isUploading.value || isPaused.value) && (
              <NButton size="small" onClick={handleCancelAll}>
                <NIcon component={CloseCircleOutline} size={16} class="mr-1" />
                取消全部
              </NButton>
            )}
            {stats.value.failed > 0 && (
              <NButton size="small" onClick={handleRetryFailed}>
                <NIcon component={RefreshOutline} size={16} class="mr-1" />
                重试失败 ({stats.value.failed})
              </NButton>
            )}
            {stats.value.completed > 0 && !isUploading.value && !isPaused.value && (
              <NButton size="small" onClick={handleClearCompleted}>
                清空已完成 ({stats.value.completed})
              </NButton>
            )}
          </div>
        )}

        {/* 总进度面板 */}
        {allFiles.value.length > 0 && (
          <div class="space-y-2">
            <NProgress
              type="line"
              percentage={totalProgress.value}
              indicatorPlacement="inside"
              status={progressStatus.value}
            />
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {stats.value.completed}/{stats.value.total} 个文件
              </span>
              <span>
                {isUploading.value ? formatSpeed(uploadSpeed.value * 1024) : ''}
                {stats.value.failed > 0 && ` | ${stats.value.failed} 个失败`}
              </span>
            </div>
          </div>
        )}

        {/* 文件列表 */}
        <div class="min-h-0 flex-1">
          <NScrollbar class="h-full">
            {allFiles.value.length === 0 ? (
              <div class="h-48 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <NIcon component={CloudUploadOutline} size={48} />
                <p class="mt-2 text-sm">暂无上传文件</p>
                <p class="text-xs">拖拽文件到上方区域或点击选择文件</p>
              </div>
            ) : (
              <div class="space-y-1">
                {allFiles.value.map(task => (
                  <UploadFileItem
                    key={task.id}
                    task={task}
                    onPause={handlePause}
                    onResume={handleResume}
                    onCancel={handleCancel}
                    onRetry={handleRetry}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </NScrollbar>
        </div>
      </div>
    );
  }
});
