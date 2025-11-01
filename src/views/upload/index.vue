<template>
  <div class="flex flex-col w-full h-full gap-4">
    <!-- 头部标题 -->
    <div class="flex justify-between items-center">
      <h2 class="flex items-center gap-3 m-0 text-xl font-semibold dark:text-gray-100 text-gray-800">
        <n-icon :component="CloudUploadOutline" :size="22" />
        文件上传管理
      </h2>
      <n-space>
        <n-button size="small" @click="showSettings = true" quaternary circle>
          <template #icon>
            <n-icon :component="SettingsOutline" />
          </template>
        </n-button>
        <n-button size="small" @click="clear" quaternary circle type="error" v-if="uploadStats.total > 0">
          <template #icon>
            <n-icon :component="TrashOutline" />
          </template>
        </n-button>
      </n-space>
    </div>

    <div class="flex flex-col xl:flex-row gap-4 w-full">
      <!-- 上传区域 -->
      <div
        class="flex flex-col md:flex-row gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow transition-all duration-300 flex-1">
        <custom-upload ref="customUploadRef" :abstract="true" :multiple="true" :directory-dnd="true" :directory="true"
          :max="Infinity" :max-size="CONSTANTS.UPLOAD.MAX_FILESIZE" :disabled="isUploading || isPaused"
          :batch-size="100" :processing-timeout="20" @change="handleFilesChange" @error="handleUploadError"
          @exceed="handleExceed" class="flex-1">
          <template #default="{ isDragOver, isProcessing, fileCount }">
            <div class="flex flex-col items-center justify-center py-4 px-4 text-center">
              <n-icon :component="CloudUploadOutline" :size="56" :color="isDragOver ? '#18a058' : undefined"
                class="transition-all duration-300" />
              <p class="mt-3 text-gray-500 dark:text-gray-400 text-sm">
                {{ isProcessing ? '处理中...' : '拖拽文件到此处或点击选择' }}
              </p>
              <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
                支持格式: {{ acceptText }} | 最大: {{ maxSizeText }}
              </p>
            </div>
          </template>
        </custom-upload>

        <div class="flex flex-col justify-between gap-4 md:w-[260px]">
          <div class="flex flex-wrap gap-2">
            <n-button size="small" @click="retryFailed" :disabled="failedCount === 0" type="warning" class="flex-1">
              <template #icon>
                <n-icon :component="RefreshOutline" />
              </template>
              重试失败 ({{ failedCount }})
            </n-button>

            <n-button size="small" @click="pauseAll" :disabled="!isUploading || isPaused" class="flex-1">
              <template #icon>
                <n-icon :component="PauseOutline" />
              </template>
              暂停
            </n-button>

            <n-button size="small" @click="resumeAll" :disabled="!isPaused || isUploading" class="flex-1">
              <template #icon>
                <n-icon :component="PlayOutline" />
              </template>
              恢复
            </n-button>

            <n-button type="primary" @click="handleStartUpload"
              :disabled="uploadQueue.length === 0 || isUploading || isPaused" :loading="isUploading" size="small"
              class="flex-1">
              <template #icon>
                <n-icon :component="PlayOutline" />
              </template>
              开始上传
            </n-button>
          </div>

          <div class="text-gray-400 dark:text-gray-500 text-xs text-center">
            支持格式: {{ acceptText }} | 最大: {{ maxSizeText }}
          </div>
        </div>
      </div>

      <!-- 上传统计 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex-1 min-w-[300px] transition-all duration-300">
        <div class="flex items-start justify-between mb-4 gap-4">
          <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200">上传统计</h3>

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
          <n-progress type="line" :percentage="totalProgress" :status="getProgressStatus()" :height="12"
            :border-radius="6" :fill-border-radius="6" />
        </div>

        <!-- 详细 info -->
        <div class="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600 dark:text-gray-400 items-center">
          <div class="flex items-center gap-2">
            <n-icon :component="SpeedometerOutline" />
            <span>{{ formatSpeed(uploadSpeed) }}</span>
          </div>

          <!-- 🔥 使用平滑的时间显示 -->
          <div class="flex items-center gap-2">
            <n-icon :component="TimeOutline" />
            <span class="smooth-time">{{ formatTime(displayEstimatedTime) }}</span>
          </div>

          <div class="flex items-center gap-2">
            <n-icon :component="WifiOutline" />
            <n-tag :type="networkQuality === 'good' ? 'success' : networkQuality === 'fair' ? 'warning' : 'error'"
              size="small" :bordered="false">
              {{ networkQualityText }}
            </n-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 待上传队列 -->
    <upload-list-section v-if="uploadQueue.length > 0" title="待上传队列" :icon="FolderOpenOutline"
      :count="uploadQueue.length" tag-type="info" :items="uploadQueue" >
      <template #item="{ item: task,index }">
        <upload-file-item :index="index" :key="task.id" :task="task" :show-actions="true" @remove="removeFile(task.id)" />
      </template>
    </upload-list-section>

    <!-- 上传中 -->
    <upload-list-section v-if="activeUploads.size > 0" title="上传中" :icon="CloudUploadOutline"
      :count="activeUploads.size" tag-type="primary" :items="Array.from(activeUploads.values())">
      <template #item="{ item: task,index }">
        <upload-file-item :index="index" :key="task.id" :task="task" :show-progress="true" />
      </template>
    </upload-list-section>

    <!-- 已完成 -->
    <upload-list-section v-if="completedUploads.length > 0" title="已完成" :icon="CheckmarkDoneOutline"
      :count="completedUploads.length" :items="completedUploads" tag-type="success">
      <template #item="{ item: task, index }">
        <upload-file-item :task="task" :index="index" :show-actions="true" @retry="handleRetrySingle(task.id)"
          @view="handleView(task)" />
      </template>
    </upload-list-section>

    <!-- 设置抽屉 -->
    <n-drawer v-model:show="showSettings" :width="400" placement="right">
      <n-drawer-content title="上传设置" closable>
        <n-form label-placement="left" label-width="120">
          <n-form-item label="并发文件数">
            <n-input-number v-model:value="settings.maxConcurrentFiles" :min="1" :max="10"
              @update:value="handleSettingChange" />
          </n-form-item>
          <n-form-item label="并发分片数">
            <n-input-number v-model:value="settings.maxConcurrentChunks" :min="1" :max="10"
              @update:value="handleSettingChange" />
          </n-form-item>
          <n-form-item label="分片大小">
            <n-select v-model:value="settings.chunkSize" :options="chunkSizeOptions"
              @update:value="handleSettingChange" />
          </n-form-item>
          <n-form-item label="最大重试次数">
            <n-input-number v-model:value="settings.maxRetries" :min="0" :max="10"
              @update:value="handleSettingChange" />
          </n-form-item>
          <n-form-item label="网络自适应">
            <n-switch v-model:value="settings.enableNetworkAdaptation" @update:value="handleSettingChange" />
          </n-form-item>
          <n-form-item label="智能重试">
            <n-switch v-model:value="settings.enableSmartRetry" @update:value="handleSettingChange" />
          </n-form-item>
          <n-form-item label="秒传检测">
            <n-switch v-model:value="settings.enableDeduplication" @update:value="handleSettingChange" />
          </n-form-item>
          <n-form-item label="使用 Worker">
            <n-switch v-model:value="settings.useWorker" @update:value="handleSettingChange" />
          </n-form-item>
        </n-form>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onBeforeUnmount } from 'vue';
import {
  useMessage,
} from 'naive-ui';
import {
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
  TrashOutline,
  SettingsOutline,
  SpeedometerOutline,
  WifiOutline,
} from '@vicons/ionicons5';
import { useChunkUpload } from '@/hooks/upload/useChunkUpload';
import { FileTask, UploadStatus } from '@/hooks/upload/type';
import { CONSTANTS } from '@/hooks/upload/constants';
import UploadFileItem from './components/UploadFileItem.vue';
import UploadListSection from './components/UploadListSection.vue';
import { useDrawer } from '@/hooks/customer/useDrawer/index';
import customUpload, { CustomUploadFileInfo } from '@/components/customUpload';
const drawer = useDrawer();

const message = useMessage();

// 设置状态
const showSettings = ref(false);
const settings = reactive({
  maxConcurrentFiles: CONSTANTS.CONCURRENT.DEFAULT_FILES,
  maxConcurrentChunks: CONSTANTS.CONCURRENT.DEFAULT_CHUNKS,
  chunkSize: CONSTANTS.UPLOAD.CHUNK_SIZE,
  maxRetries: CONSTANTS.RETRY.MAX_RETRIES,
  enableNetworkAdaptation: true,
  enableSmartRetry: true,
  enableDeduplication: false,
  useWorker: false
});

// 分片大小选项
const chunkSizeOptions = [
  { label: '512 KB', value: 512 * 1024 },
  { label: '1 MB', value: 1024 * 1024 },
  { label: '2 MB', value: 2 * 1024 * 1024 },
  { label: '5 MB', value: 5 * 1024 * 1024 },
  { label: '10 MB', value: 10 * 1024 * 1024 },
];

const token = `WGz4LlZ0W8P3+HOaQlLRkcdCuTsJGVrvvTZfdJYY3otxprBxscciMf+yoDBGJ+9f1bA5c+xXMNCkSzTr1aflzW0TcOXtrKagFj0ZvBk//rdHwQUzXVmVkiWN+5LR2wi/oqAnl5o5KmFP5tuTifyd1CUTZdG6aUPvnnHKbYZfevBbpvmuhKqC9Ks2v/NrfBGZ`

// 使用上传 Hook
const {
  addFiles,
  start,
  pauseAll,
  resumeAll,
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
  getProgressStatus,
} = useChunkUpload({
  uploadChunkUrl: 'https://testaest-v1.umi6.com/proxy-minio/upload/chunk',
  mergeChunksUrl: 'https://testaest-v1.umi6.com/proxy-minio/upload/complete',
  checkFileUrl: '/api/upload/check',
  headers: {
    'custom-origin': 'https://testaigc.umi6.com',
    'origin': 'https://testaigc.umi6.com',
    'authorization': 'Bearer 6992fcd36dce4d24b9ddf26a110a17cf'
  },
  chunkUploadTransformer: ({ task, chunk }) => {
    const formData = new FormData();
    formData.append('file', chunk.blob);
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
    }
  },
  ...settings,
});

const fileInputRef = ref<HTMLInputElement>();

// 🔥 添加平滑时间显示
const displayEstimatedTime = ref(0);
let localTime = 0;
let lastUpdateTime = 0;
let timeCountdownTimer: number | null = null;

// 启动倒计时
const startTimeCountdown = (initialTime: number) => {
  if (timeCountdownTimer) {
    clearInterval(timeCountdownTimer);
  }

  localTime = initialTime;
  displayEstimatedTime.value = localTime;
  lastUpdateTime = Date.now();

  timeCountdownTimer = window.setInterval(() => {
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

// 监听后端时间变化
watch(
  () => uploadStats.value.estimatedTime,
  (newTime) => {
    // 🔥 只在变化超过 5 秒或首次时才更新
    const diff = Math.abs(newTime - localTime);

    if (diff > 5 || timeCountdownTimer === null) {
      console.log(`🕐 剩余时间同步: ${localTime.toFixed(0)}s -> ${newTime}s`);
      startTimeCountdown(newTime);
    }
  },
  { immediate: true }
);

// 清理定时器
onBeforeUnmount(() => {
  if (timeCountdownTimer) {
    clearInterval(timeCountdownTimer);
  }
});

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
  return formatFileSize(CONSTANTS.UPLOAD.MAX_FILESIZE);
});

// 处理文件选择
const handleFilesChange = async (files: CustomUploadFileInfo[]) => {
  if (!files || files.length === 0) return;
  try {
    const fileList = files.map(f => f.file);
    await addFiles(fileList);
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  } catch (error) {
    message.error(`添加文件失败: ${error}`);
  }
};

// 处理文件错误
const handleUploadError = (error: { file: File; message: string }) => {
  message.error(error.message);
};

// 处理文件超出限制
const handleExceed = (data: { files: File[]; max: number }) => {
  message.warning(`文件数量超出限制，最多允许 ${data.max} 个文件`);
};

// 开始上传
const handleStartUpload = async () => {
  await start();
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

// 文件预览
const handleView = (task: FileTask) => {
  console.log(task, '任务信息');
  drawer.open({
    title: '文件预览',
    content: JSON.stringify(task, null, 2),
    width: 600
  })
}

// 设置变更
const handleSettingChange = () => {
  updateConfig(settings);
  message.success('设置已更新');
};
</script>

<style scoped>
/* 🔥 添加平滑过渡效果 */
.smooth-time {
  transition: opacity 0.3s ease;
  font-variant-numeric: tabular-nums;
  /* 等宽数字，避免跳动 */
}
</style>