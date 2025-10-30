<template>
  <n-list-item class="transition-colors duration-200 !rounded-none">
    <template #prefix>
      <n-avatar 
        :style="{ background: getFileColor(task.file.type) }" 
        :size="36"
        class="flex items-center justify-center flex-shrink-0"
      >
        <n-icon :component="getFileIcon(task.file.type)" :size="18" />
      </n-avatar>
    </template>

    <div class="flex flex-col w-full gap-2">
      <!-- 文件信息 -->
      <div class="flex justify-between items-start w-full">
        <div class="flex flex-col min-w-0 flex-1 mr-3">
          <n-ellipsis 
            class="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight" 
            :line-clamp="1"
          >
            {{ task.file.name }}
          </n-ellipsis>
          <n-text depth="3" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ formatFileSize(task.file.size) }} · {{ task.file.type || '未知类型' }}
          </n-text>
        </div>

        <!-- 状态和操作 -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <n-tag 
            :type="getStatusType(task.status)" 
            :bordered="false" 
            size="small"
          >
            {{ getStatusText(task.status) }}
          </n-tag>

          <!-- 操作按钮 -->
          <template v-if="showActions">
            <!-- 待上传：删除按钮 -->
            <n-button 
              v-if="task.status === UploadStatus.PENDING"
              size="tiny" 
              quaternary 
              circle 
              @click="handleRemove"
            >
              <template #icon>
                <n-icon :component="CloseOutline" />
              </template>
            </n-button>

            <!-- 已完成：查看按钮 -->
            <n-button 
              v-if="task.status === UploadStatus.SUCCESS && task.options?.metadata?.preview"
              size="tiny" 
              quaternary 
              circle 
              type="info"
              @click="handleView"
            >
              <template #icon>
                <n-icon :component="EyeOutline" />
              </template>
            </n-button>

            <!-- 失败：重试按钮 -->
            <n-button 
              v-if="task.status === UploadStatus.ERROR"
              size="tiny" 
              quaternary 
              circle 
              type="warning"
              @click="handleRetry"
            >
              <template #icon>
                <n-icon :component="RefreshOutline" />
              </template>
            </n-button>
          </template>
        </div>
      </div>

      <!-- 进度条（仅上传中显示） -->
      <div v-if="showProgress && task.status === UploadStatus.UPLOADING" class="flex flex-col gap-2">
        <n-progress 
          type="line" 
          :percentage="task.progress" 
          :show-indicator="false" 
          :height="6"
          :border-radius="3"
        />
        <n-text depth="3" class="text-xs text-gray-500 dark:text-gray-400">
          {{ task.progress }}% · {{ formatSpeed(task.speed) }}
        </n-text>
      </div>
    </div>
  </n-list-item>
</template>

<script setup lang="ts">
import { 
  NListItem, 
  NAvatar, 
  NIcon, 
  NEllipsis, 
  NText, 
  NTag, 
  NButton, 
  NProgress 
} from 'naive-ui';
import { 
  CloseOutline, 
  EyeOutline, 
  RefreshOutline 
} from '@vicons/ionicons5';
import { 
  DocumentTextOutline,
  ImageOutline,
  VideocamOutline,
  MusicalNotesOutline,
  ArchiveOutline,
  DocumentOutline
} from '@vicons/ionicons5';
import { FileTask, UploadStatus } from '@/hooks/upload/type';

interface Props {
  task: FileTask;
  showProgress?: boolean;
  showActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showProgress: false,
  showActions: false
});

const emit = defineEmits<{
  remove: [];
  view: [];
  retry: [];
}>();

// 文件图标映射
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageOutline;
  if (type.startsWith('video/')) return VideocamOutline;
  if (type.startsWith('audio/')) return MusicalNotesOutline;
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return ArchiveOutline;
  if (type.includes('pdf') || type.includes('document') || type.includes('word')) return DocumentTextOutline;
  return DocumentOutline;
};

// 文件颜色映射
const getFileColor = (type: string) => {
  if (type.startsWith('image/')) return '#10b981';
  if (type.startsWith('video/')) return '#8b5cf6';
  if (type.startsWith('audio/')) return '#f59e0b';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '#64748b';
  if (type.includes('pdf')) return '#ef4444';
  if (type.includes('document') || type.includes('word')) return '#3b82f6';
  return '#6b7280';
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 格式化速度
const formatSpeed = (bytesPerSecond: number): string => {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 KB/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return `${(bytesPerSecond / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 获取状态文本
const getStatusText = (status: UploadStatus): string => {
  const statusMap = {
    [UploadStatus.PENDING]: '待上传',
    [UploadStatus.UPLOADING]: '上传中',
    [UploadStatus.PAUSED]: '已暂停',
    [UploadStatus.SUCCESS]: '已完成',
    [UploadStatus.ERROR]: '失败',
    [UploadStatus.CANCELLED]: '已取消',
  };
  return statusMap[status] || '未知';
};

// 获取状态类型
const getStatusType = (status: UploadStatus) => {
  const typeMap = {
    [UploadStatus.PENDING]: 'warning',
    [UploadStatus.UPLOADING]: 'info',
    [UploadStatus.PAUSED]: 'default',
    [UploadStatus.SUCCESS]: 'success',
    [UploadStatus.ERROR]: 'error',
    [UploadStatus.CANCELLED]: 'default',
  };
  return typeMap[status] as 'warning' | 'info' | 'default' | 'success' | 'error';
};

const handleRemove = () => emit('remove');
const handleView = () => emit('view');
const handleRetry = () => emit('retry');
</script>