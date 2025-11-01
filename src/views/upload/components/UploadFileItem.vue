<template>
  <div 
    class="file-item px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
  >
    <div class="flex items-start gap-3">
      <!-- 序号 -->
      <div class="flex items-center justify-center flex-shrink-0 w-8 h-9">
        <span class="text-sm font-medium text-gray-400 dark:text-gray-500">
          {{ index + 1 }}
        </span>
      </div>

      <!-- Avatar -->
      <n-avatar 
        :style="{ background: getFileColor(task.file.type) }" 
        :size="36"
        class="flex items-center justify-center flex-shrink-0"
      >
        <n-icon :component="getFileIcon(task.file.type)" :size="18" />
      </n-avatar>

      <!-- Content -->
      <div class="flex flex-col w-full gap-2 min-w-0">
        <!-- 文件信息 -->
        <div class="flex justify-between items-center w-full gap-2">
          <div class="flex flex-col min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {{ task.file.name }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ formatFileSize(task.file.size) }} · {{ getFileTypeShort(task.file.type) }}
            </div>
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
                @click.stop="handleRemove"
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
                @click.stop="handleView"
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
                @click.stop="handleRetry"
              >
                <template #icon>
                  <n-icon :component="RefreshOutline" />
                </template>
              </n-button>
            </template>
          </div>
        </div>

        <!-- 进度条（仅上传中显示） -->
        <div v-if="showProgress && task.status === UploadStatus.UPLOADING" class="flex flex-col gap-1.5">
          <n-progress 
            type="line" 
            :percentage="task.progress" 
            :show-indicator="false" 
            :height="4"
            :border-radius="2"
          />
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ task.progress }}% · {{ formatSpeed(task.speed) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  NAvatar, 
  NIcon, 
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
  index: number;
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

// 文件图标映射 - 使用对象缓存提升性能
const iconMap = {
  image: ImageOutline,
  video: VideocamOutline,
  audio: MusicalNotesOutline,
  archive: ArchiveOutline,
  document: DocumentTextOutline,
  default: DocumentOutline
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return iconMap.image;
  if (type.startsWith('video/')) return iconMap.video;
  if (type.startsWith('audio/')) return iconMap.audio;
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return iconMap.archive;
  if (type.includes('pdf') || type.includes('document') || type.includes('word')) return iconMap.document;
  return iconMap.default;
};

// 文件颜色映射 - 使用对象缓存
const colorMap = {
  image: '#10b981',
  video: '#8b5cf6',
  audio: '#f59e0b',
  archive: '#64748b',
  pdf: '#ef4444',
  document: '#3b82f6',
  default: '#6b7280'
};

const getFileColor = (type: string) => {
  if (type.startsWith('image/')) return colorMap.image;
  if (type.startsWith('video/')) return colorMap.video;
  if (type.startsWith('audio/')) return colorMap.audio;
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return colorMap.archive;
  if (type.includes('pdf')) return colorMap.pdf;
  if (type.includes('document') || type.includes('word')) return colorMap.document;
  return colorMap.default;
};

// 简化文件类型显示
const getFileTypeShort = (type: string): string => {
  if (!type) return '未知';
  const mainType = type.split('/')[0];
  const subType = type.split('/')[1];
  
  const typeMap: Record<string, string> = {
    'image': '图片',
    'video': '视频',
    'audio': '音频',
    'application': subType?.toUpperCase() || '文件',
    'text': '文本'
  };
  
  return typeMap[mainType] || subType?.toUpperCase() || '文件';
};

// 格式化文件大小 - 优化计算
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

// 格式化速度 - 优化计算
const formatSpeed = (bytesPerSecond: number): string => {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 KB/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s'];
  const i = Math.min(Math.floor(Math.log(bytesPerSecond) / Math.log(k)), sizes.length - 1);
  return `${(bytesPerSecond / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

// 状态映射 - 使用常量对象
const statusTextMap: Record<UploadStatus, string> = {
  [UploadStatus.PENDING]: '待上传',
  [UploadStatus.UPLOADING]: '上传中',
  [UploadStatus.PAUSED]: '已暂停',
  [UploadStatus.SUCCESS]: '已完成',
  [UploadStatus.ERROR]: '失败',
  [UploadStatus.CANCELLED]: '已取消',
};

const statusTypeMap: Record<UploadStatus, 'warning' | 'info' | 'default' | 'success' | 'error'> = {
  [UploadStatus.PENDING]: 'warning',
  [UploadStatus.UPLOADING]: 'info',
  [UploadStatus.PAUSED]: 'default',
  [UploadStatus.SUCCESS]: 'success',
  [UploadStatus.ERROR]: 'error',
  [UploadStatus.CANCELLED]: 'default',
};

const getStatusText = (status: UploadStatus): string => statusTextMap[status] || '未知';
const getStatusType = (status: UploadStatus) => statusTypeMap[status];

const handleRemove = () => emit('remove');
const handleView = () => emit('view');
const handleRetry = () => emit('retry');
</script>

<style scoped>
.file-item {
  /* 固定最小高度，确保虚拟列表正确计算 */
  min-height: 68px;
  box-sizing: border-box;
}

/* 优化渲染性能 */
.file-item {
  contain: layout style paint;
}
</style>