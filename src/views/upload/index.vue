<template>
  <div class="flex flex-col w-full h-full gap-4">
    <!-- 头部标题 -->
    <div class="flex justify-between items-center">
      <h2 class="flex items-center gap-3 m-0 text-xl font-semibold text-gray-800">
        <n-icon :component="CloudUploadOutline" :size="22" />
        文件上传管理
      </h2>
      <n-space>
        <n-button size="small" @click="showSettings = true" quaternary circle>
          <template #icon>
            <n-icon :component="SettingsOutline" />
          </template>
        </n-button>
        <n-button  size="small" @click="clear" quaternary circle type="error" v-if="uploadStats.total > 0">
          <template #icon>
            <n-icon :component="TrashOutline" />
          </template>
        </n-button>
      </n-space>
    </div>
 
    <div class="flex flex-col xl:flex-row gap-4 w-full">
      <!-- 上传区域 -->
      <div
        class="flex flex-col md:flex-row gap-4 p-6 bg-white rounded-lg shadow transition-all duration-300  flex-1"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <div
          class="flex-1 relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer transition-all duration-300 hover:border-green-400 hover:bg-green-50"
        >
          <n-icon :component="CloudUploadOutline" :size="56" color="#18a058" />
          <p class="mt-3 text-gray-500 text-sm">拖拽文件到此处或点击选择</p>
          <input
            type="file"
            multiple
            @change="handleFileSelect"
            ref="fileInputRef"
            class="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>

        <div class="flex flex-col justify-between gap-4 md:w-[260px]">
          <div class="flex flex-wrap gap-2">
             <n-button size="small" @click="retryFailed" :disabled="failedCount === 0" type="warning" class="flex-1">
              <template #icon>
                <n-icon :component="RefreshOutline" />
              </template>
              重试失败 ({{ failedCount }})
            </n-button>
        
            <n-button size="small" @click="pause" :disabled="!isUploading || isPaused" class="flex-1">
              <template #icon>
                <n-icon :component="PauseOutline" />
              </template>
              暂停
            </n-button>

            <n-button size="small" @click="resume" :disabled="!isPaused" class="flex-1">
              <template #icon>
                <n-icon :component="PlayOutline" />
              </template>
              恢复
            </n-button>

              <n-button type="primary" @click="handleStartUpload" :disabled="uploadQueue.length === 0" :loading="isUploading" size="small" class="flex-1">
              <template #icon>
                <n-icon :component="PlayOutline" />
              </template>
              开始上传
            </n-button>
          </div>

          <div class="text-gray-400 text-xs text-center">
            支持格式: {{ acceptText }} | 最大: {{ maxSizeText }}
          </div>
        </div>
      </div>

      <!-- 上传统计 -->
     <div class="bg-white rounded-lg shadow p-6 flex-1 min-w-[300px] transition-all duration-300 ">
        <div class="flex items-start justify-between mb-4 gap-4">
          <h3 class="text-lg font-medium text-gray-700">上传统计</h3>

          <div class="flex flex-wrap gap-2">
            <n-tag :bordered="false" type="info" class="flex items-center">
              <template #icon><n-icon :component="DocumentsOutline" /></template>
              总计: {{ uploadStats.total }}
            </n-tag>

            <n-tag :bordered="false" type="warning" class="flex items-center">
              <template #icon><n-icon :component="TimeOutline" /></template>
              待上传: {{ uploadStats.pending }}
            </n-tag>

            <n-tag :bordered="false" type="primary" class="flex items-center">
              <template #icon><n-icon :component="ArrowUpOutline" /></template>
              上传中: {{ uploadStats.active }}
            </n-tag>

            <n-tag :bordered="false" type="success" class="flex items-center">
              <template #icon><n-icon :component="CheckmarkCircleOutline" /></template>
              已完成: {{ uploadStats.completed }}
            </n-tag>

            <n-tag v-if="uploadStats.failed > 0" :bordered="false" type="error" class="flex items-center">
              <template #icon><n-icon :component="CloseCircleOutline" /></template>
              失败: {{ uploadStats.failed }}
            </n-tag>
          </div>
        </div>

        <!-- 全局进度 -->
        <div class="mb-4">
          <n-progress
            type="line"
            :percentage="totalProgress"
            :status="getProgressStatus()"
            :height="12"
            :border-radius="6"
            :fill-border-radius="6"
          />
        </div>

        <!-- 详细 info（三列自适应） -->
        <div class="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600 items-center">
          <div class="flex items-center gap-2">
            <n-icon :component="SpeedometerOutline" />
            <span>{{ formatSpeed(uploadSpeed) }}</span>
          </div>

          <div class="flex items-center gap-2">
            <n-icon :component="TimeOutline" />
            <span>{{ formatTime(uploadStats.estimatedTime) }}</span>
          </div>

          <div class="flex items-center gap-2">
            <n-icon :component="WifiOutline" />
            <n-tag
              :type="networkQuality === 'good' ? 'success' : networkQuality === 'fair' ? 'warning' : 'error'"
              size="small"
              :bordered="false"
            >
              {{ networkQualityText }}
            </n-tag>
          </div>
        </div>
      </div>
    </div>

      <!-- 待上传队列 -->
      <n-collapse-transition :show="uploadQueue.length > 0">
        <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-800 m-0">
            <n-icon :component="FolderOpenOutline" size="20" />
            待上传队列
          </h3>
          <n-tag :bordered="false" round size="small" type="info">
            {{ uploadQueue.length }}
          </n-tag>
        </div>

        <!-- List: 使用 Naive UI 的滚动条 -->
        <n-scrollbar class="max-h-72 transition-all duration-300">
          <n-list hoverable clickable>
            <n-list-item
              v-for="task in uploadQueue"
              :key="task.id"
              class="transition-colors duration-200 !rounded-none"
            >
              <template #prefix>
                <n-avatar
                  :style="{ background: getFileColor(task.file.type) }"
                  :size="32"
                  class="flex items-center justify-center flex-shrink-0"
                >
                  <n-icon :component="getFileIcon(task.file.type)" :size="16" />
                </n-avatar>
              </template>

              <div class="flex justify-between items-center w-full">
                <div class="flex flex-col min-w-0 mr-3">
                  <n-ellipsis class="text-sm font-medium text-gray-800 leading-tight truncate" :line-clamp="1">
                    {{ task.file.name }}
                  </n-ellipsis>
                  <n-text depth="3" class="text-xs text-gray-500 mt-0.5">
                    {{ formatFileSize(task.file.size) }} · {{ task.file.type || '未知类型' }}
                  </n-text>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <n-tag :type="getStatusType(task.status)" :bordered="false" size="small">
                    {{ getStatusText(task.status) }}
                  </n-tag>
                  <n-button
                    size="tiny"
                    quaternary
                    circle
                    @click="removeFile(task.id)"
                  >
                    <template #icon>
                      <n-icon :component="CloseOutline" />
                    </template>
                  </n-button>
                </div>
              </div>
            </n-list-item>
          </n-list>
        </n-scrollbar>
        </div>
      </n-collapse-transition>

      <!-- 上传中 -->
      <n-collapse-transition :show="activeUploads.size > 0">
        <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
           <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-800 m-0">
              <n-icon :component="CloudUploadOutline" class="text-primary-500" />
              上传中
            </h3>
            <n-tag type="primary" :bordered="false" round>
              {{ activeUploads.size }}
            </n-tag>
          </div>

          <n-list hoverable>
            <n-list-item
              v-for="task in Array.from(activeUploads.values())"
              :key="task.id"
               class="transition-colors duration-200 !rounded-none"
            >
              <template #prefix>
                <n-avatar
                  :style="{ background: getFileColor(task.file.type) }"
                  :size="32"
                  class="flex items-center justify-center flex-shrink-0"
                >
                  <n-icon :component="getFileIcon(task.file.type)" :size="16" />
                </n-avatar>
              </template>

              <div class="flex justify-between items-center w-full">
                <div class="flex flex-col min-w-0 mr-3">
                  <n-ellipsis class="text-sm font-medium text-gray-800 leading-tight truncate" :line-clamp="1">
                    {{ task.file.name }}
                  </n-ellipsis>

                  <div class="flex flex-col gap-6 mt-2">
                    <n-progress
                      type="line"
                      :percentage="task.progress"
                      :show-indicator="false"
                      :height="6"
                    />
                    <n-text depth="3" class="text-xs text-gray-500 mt-0.5">
                      {{ task.progress }}% · {{ formatSpeed(task.speed) }}
                    </n-text>
                  </div>
                </div>
              </div>
            </n-list-item>
          </n-list>
        </div>
      </n-collapse-transition>

      <!-- 已完成 -->
      <n-collapse-transition :show="completedUploads.length > 0">
        <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-800 m-0">
              <n-icon :component="CheckmarkDoneOutline" class="text-green-500" />
              已完成
            </h3>
            <n-tag :bordered="false" round size="small" type="info">{{ completedUploads.length }}</n-tag>
          </div>
        <div class="max-h-72 overflow-y-auto divide-y divide-gray-100 transition-all duration-300">
          <n-list hoverable clickable>
            <n-list-item
              v-for="task in completedUploads"
              :key="task.id"
               class="transition-colors duration-200 !rounded-none"
            >
              <template #prefix>
                <n-avatar
                  :style="{
                    background: task.status === UploadStatus.SUCCESS
                      ? '#18a05880'
                      : '#d0305080'
                  }"
                 :size="32"
                 class="flex items-center flex-shrink-0"
                >
                  <n-icon
                    :component="
                      task.status === UploadStatus.SUCCESS
                        ? CheckmarkCircleOutline
                        : CloseCircleOutline
                    "
                    :size="16"
                    :color="task.status === UploadStatus.SUCCESS ? '#18a058' : '#d03050'"
                  />
                </n-avatar>
              </template>

              <div class="flex justify-between items-center w-full">
                <div class="flex gap-2 items-center min-w-0 mr-3">
                  <n-ellipsis class="text-sm font-medium text-gray-800 leading-tight truncate" :line-clamp="1">
                    {{ task.file.name }}
                  </n-ellipsis>

                  <div class="flex items-center justify-between gap-2">
                    <n-text depth="3" class="text-xs text-gray-500 mt-0.5">
                      {{ formatFileSize(task.file.size) }}
                    </n-text>
                    <n-tag
                      :type="getStatusType(task.status)"
                      :bordered="false"
                      size="small"
                    >
                      {{ getStatusText(task.status) }}
                    </n-tag>
                  </div>

                  <n-ellipsis class="text-sm font-medium text-gray-800 leading-tight truncate" :line-clamp="1">
                      <n-text
                        v-if="task.error"
                        type="error"
                        depth="3"
                      >
                        {{ task.error.message }}
                      </n-text>
                  </n-ellipsis>
                </div>
              </div>

              <template #suffix>
                <div div class="flex items-center gap-2 ml-2">
                  <n-button
                    v-if="task.status === UploadStatus.ERROR"
                    @click="handleRetrySingle(task.id)"
                    type="warning"
                    size="tiny"
                    quaternary
                    circle
                  >
                    <template #icon>
                      <n-icon :component="RefreshOutline" />
                    </template>
                  </n-button>

                  <n-button
                    v-if="task.status === UploadStatus.SUCCESS && task.result?.fileUrl"
                    @click="handleViewFile(task.result.fileUrl)"
                    type="primary"
                    size="tiny"
                    quaternary
                    circle
                  >
                    <template #icon>
                      <n-icon :component="EyeOutline" />
                    </template>
                  </n-button>

                  <n-button
                    @click="removeFile(task.id)"
                    size="tiny"
                    quaternary
                    circle
                  >
                    <template #icon>
                      <n-icon :component="TrashOutline" />
                    </template>
                  </n-button>
                </div>
              </template>
            </n-list-item>
          </n-list>
        </div>
        </div>
      </n-collapse-transition>
      
      <!-- 设置抽屉 -->
      <n-drawer v-model:show="showSettings" :width="400" placement="right">
        <n-drawer-content title="上传设置" closable>
          <n-form label-placement="left" label-width="120">
            <n-form-item label="最大并发文件">
              <n-input-number 
                v-model:value="settings.maxConcurrentFiles" 
                :min="1" 
                :max="10"
                @update:value="handleSettingChange"
              />
            </n-form-item>
            <n-form-item label="最大并发切片">
              <n-input-number 
                v-model:value="settings.maxConcurrentChunks" 
                :min="1" 
                :max="20"
                @update:value="handleSettingChange"
              />
            </n-form-item>
            <n-form-item label="分片大小">
              <n-select 
                v-model:value="settings.chunkSize" 
                :options="chunkSizeOptions"
                @update:value="handleSettingChange"
              />
            </n-form-item>
            <n-form-item label="最大重试次数">
              <n-input-number 
                v-model:value="settings.maxRetries" 
                :min="0" 
                :max="10"
                @update:value="handleSettingChange"
              />
            </n-form-item>
            <n-form-item label="网络自适应">
              <n-switch 
                v-model:value="settings.enableNetworkAdaptation"
                @update:value="handleSettingChange"
              />
            </n-form-item>
            <n-form-item label="智能重试">
              <n-switch 
                v-model:value="settings.enableSmartRetry"
                @update:value="handleSettingChange"
              />
            </n-form-item>
            <n-form-item label="秒传检测">
              <n-switch 
                v-model:value="settings.enableDeduplication"
                @update:value="handleSettingChange"
              />
            </n-form-item>
            <n-form-item label="使用 Worker">
              <n-switch 
                v-model:value="settings.useWorker"
                @update:value="handleSettingChange"
              />
            </n-form-item>
          </n-form>
        </n-drawer-content>
      </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import {
  NButton,
  NSpace,
  NTag,
  NProgress,
  NList,
  NListItem,
  NIcon,
  NAvatar,
  NEllipsis,
  NText,
  NDivider,
  NCollapseTransition,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInputNumber,
  NSelect,
  NSwitch,
  useMessage,
} from 'naive-ui';
import {
  DocumentTextOutline,
  ImageOutline,
  VideocamOutline,
  MusicalNoteOutline,
  ArchiveOutline,
  DocumentOutline,
  CloudUploadOutline,
  PlayOutline,
  PauseOutline,
  RefreshOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  CheckmarkDoneOutline,
  FolderOpenOutline,
  DocumentsOutline,
  TimeOutline,
  ArrowUpOutline,
  CloseOutline,
  TrashOutline,
  EyeOutline,
  SettingsOutline,
  SpeedometerOutline,
  WifiOutline,
} from '@vicons/ionicons5';
import { useChunkUpload } from '@/hooks/upload/useChunkUpload';
import { UploadStatus } from '@/hooks/upload/type';

const message = useMessage();

// 设置状态
const showSettings = ref(false);
const settings = reactive({
  maxConcurrentFiles: 3,
  maxConcurrentChunks: 6,
  chunkSize: 2 * 1024 * 1024,
  maxRetries: 3,
  enableNetworkAdaptation: true,
  enableSmartRetry: true,
  enableDeduplication: true,
  useWorker: false,
});

// 分片大小选项
const chunkSizeOptions = [
  { label: '512 KB', value: 512 * 1024 },
  { label: '1 MB', value: 1024 * 1024 },
  { label: '2 MB', value: 2 * 1024 * 1024 },
  { label: '5 MB', value: 5 * 1024 * 1024 },
  { label: '10 MB', value: 10 * 1024 * 1024 },
];

// 使用上传 Hook
const {
  addFiles,
  start,
  pause,
  resume,
  uploadQueue,
  activeUploads,
  completedUploads,
  totalProgress,
  uploadSpeed,
  uploadStats,
  isUploading,
  isPaused,
  networkQuality,
  retryFailed,
  retrySingleFile,
  removeFile,
  clear,
  updateConfig,
  formatFileSize,
  formatSpeed,
  formatTime,
} = useChunkUpload({
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge',
  checkFileUrl: '/api/upload/check',
  ...settings,
});

const fileInputRef = ref<HTMLInputElement>();

// 计算失败的任务数量
const failedCount = computed(() => {
  return completedUploads.value.filter(t => t.status === UploadStatus.ERROR).length;
});

// 网络质量文本
const networkQualityText = computed(() => {
  const map = { good: '良好', fair: '一般', poor: '较差' };
  return map[networkQuality.value];
});

// 支持的格式文本
const acceptText = computed(() => {
  return '所有格式';
});

// 最大文件大小文本
const maxSizeText = computed(() => {
  return formatFileSize(50 * 1024 * 1024 * 1024);
});

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files;

  if (!files || files.length === 0) return;

  try {
    await addFiles(files);
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  } catch (error) {
    message.error(`添加文件失败: ${error}`);
  }
};

// 处理拖拽
const handleDrop = async (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  try {
    await addFiles(files);
    message.success(`已添加 ${files.length} 个文件`);
  } catch (error) {
    message.error(`添加文件失败: ${error}`);
  }
};

// 开始上传
const handleStartUpload = async () => {
    await start();
    message.success('开始上传');
};

// 重试单个文件
const handleRetrySingle = (taskId: string) => {
  try {
    retrySingleFile(taskId);
    message.info('已加入重试队列');
    start();
  } catch (error) {
    message.error(`重试失败: ${error}`);
  }
};

// 查看文件
const handleViewFile = (url: string) => {
  window.open(url, '_blank');
};

// 设置变更
const handleSettingChange = () => {
  updateConfig(settings);
  message.success('设置已更新');
};

// 获取文件图标
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return ImageOutline;
  if (mimeType.startsWith('video/')) return VideocamOutline;
  if (mimeType.startsWith('audio/')) return MusicalNoteOutline;
  if (mimeType.includes('pdf')) return DocumentTextOutline;
  if (mimeType.includes('zip') || mimeType.includes('rar')) return ArchiveOutline;
  return DocumentOutline;
};

// 获取文件颜色
const getFileColor = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return '#18a058';
  if (mimeType.startsWith('video/')) return '#2080f0';
  if (mimeType.startsWith('audio/')) return '#f0a020';
  if (mimeType.includes('pdf')) return '#d03050';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '#7c3aed';
  return '#666';
};

// 获取状态类型
const getStatusType = (status: UploadStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const typeMap: Record<UploadStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    [UploadStatus.PENDING]: 'default',
    [UploadStatus.UPLOADING]: 'info',
    [UploadStatus.SUCCESS]: 'success',
    [UploadStatus.ERROR]: 'error',
    [UploadStatus.PAUSED]: 'warning',
    [UploadStatus.CANCELLED]: 'default',
  };
  return typeMap[status];
};

// 获取状态文本
const getStatusText = (status: UploadStatus): string => {
  const textMap: Record<UploadStatus, string> = {
    [UploadStatus.PENDING]: '等待中',
    [UploadStatus.UPLOADING]: '上传中',
    [UploadStatus.SUCCESS]: '成功',
    [UploadStatus.ERROR]: '失败',
    [UploadStatus.PAUSED]: '已暂停',
    [UploadStatus.CANCELLED]: '已取消',
  };
  return textMap[status];
};

// 获取进度条状态
const getProgressStatus = (): 'default' | 'success' | 'error' => {
  if (uploadStats.value.failed > 0) return 'error';
  if (uploadStats.value.completed === uploadStats.value.total) return 'success';
  return 'default';
};
</script>
