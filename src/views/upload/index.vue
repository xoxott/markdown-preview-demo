<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useMessage, useThemeVars } from 'naive-ui';
import {
  ArrowUpOutline,
  CheckmarkCircleOutline,
  CheckmarkDoneOutline,
  CloseCircleOutline,
  CloudUploadOutline,
  DocumentsOutline,
  FolderOpenOutline,
  PauseOutline,
  PlayOutline,
  RefreshOutline,
  SettingsOutline,
  SpeedometerOutline,
  TimeOutline,
  TrashOutline,
  WifiOutline
} from '@vicons/ionicons5';
import { useChunkUpload } from '@/hooks/upload/useChunkUpload';
import type { FileTask } from '@/hooks/upload/type';
import { UploadStatus } from '@/hooks/upload/type';
import { CONSTANTS } from '@/hooks/upload/constants';
import useDrawer from '@/components/base-drawer/useDrawer';
import type { CustomUploadFileInfo } from '@/components/custom-upload';
import CustomUpload from '@/components/custom-upload';
import UploadFileItem from './components/UploadFileItem.vue';
import UploadListSection from './components/UploadListSection.vue';
const drawer = useDrawer();
const themeVars = useThemeVars();
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
  { label: '10 MB', value: 10 * 1024 * 1024 }
];

const token = `WGz4LlZ0W8P3+HOaQlLRkcdCuTsJGVrvvTZfdJYY3otxprBxscciMf+yoDBGJ+9f1bA5c+xXMNCkSzTr1aflzW0TcOXtrKagFj0ZvBk//rdHwQUzXVmVkiWN+5LR2wi/oqAnl5o5KmFP5tuTifyd1CUTZdG6aUPvnnHKbYZfevBbpvmuhKqC9Ks2v/NrfBGZ`;

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
  getProgressStatus
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
    };
  },
  ...settings
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
  newTime => {
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
  });
};

// 设置变更
const handleSettingChange = () => {
  updateConfig(settings);
  message.success('设置已更新');
};
</script>

<template>
  <div class="h-full w-full flex flex-col gap-4">
    <!-- 头部标题 -->
    <div class="flex items-center justify-between">
      <NH3 class="m-0 flex items-center gap-3 font-semibold">
        <NIcon :component="CloudUploadOutline" :size="22" />
        文件上传管理
      </NH3>
      <NSpace>
        <NButton size="small" quaternary circle @click="showSettings = true">
          <template #icon>
            <NIcon :component="SettingsOutline" />
          </template>
        </NButton>
        <NButton
          v-if="uploadStats.total > 0"
          size="small"
          quaternary
          circle
          type="error"
          @click="clear"
        >
          <template #icon>
            <NIcon :component="TrashOutline" />
          </template>
        </NButton>
      </NSpace>
    </div>

    <div class="w-full flex flex-col gap-4 xl:flex-row">
      <!-- 上传区域 -->
      <div
        class="flex flex-col flex-1 gap-4 rounded-lg bg-white p-6 shadow transition-all duration-300 md:flex-row dark:bg-gray-800"
      >
        <CustomUpload
          :abstract="true"
          :multiple="true"
          :directory-dnd="true"
          :max="CONSTANTS.UPLOAD.MAX_FILES"
          :max-size="CONSTANTS.UPLOAD.MAX_FILESIZE"
          :disabled="isUploading || isPaused"
          :batch-size="100"
          :processing-timeout="20"
          class="flex-1"
          @change="handleFilesChange"
          @error="handleUploadError"
          @exceed="handleExceed"
        >
          <template #default="{ isDragOver, isProcessing }">
            <div class="flex flex-col items-center justify-center px-4 py-4 text-center">
              <NIcon
                :component="CloudUploadOutline"
                :size="56"
                :color="isDragOver ? themeVars.primaryColor : themeVars.primaryColorHover"
                class="transition-all duration-300"
              />
              <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {{ isProcessing ? '处理中...' : '拖拽文件到此处或点击选择' }}
              </p>
            </div>
          </template>
        </CustomUpload>

        <div class="flex flex-col justify-between gap-4 md:w-[260px]">
          <div class="flex flex-wrap gap-2">
            <NButton
              size="small"
              :disabled="failedCount === 0"
              type="warning"
              class="flex-1"
              @click="retryFailed"
            >
              <template #icon>
                <NIcon :component="RefreshOutline" />
              </template>
              重试失败 ({{ failedCount }})
            </NButton>

            <NButton
              size="small"
              :disabled="!isUploading || isPaused"
              class="flex-1"
              @click="pauseAll"
            >
              <template #icon>
                <NIcon :component="PauseOutline" />
              </template>
              暂停
            </NButton>

            <NButton
              size="small"
              :disabled="!isPaused || isUploading"
              class="flex-1"
              @click="resumeAll"
            >
              <template #icon>
                <NIcon :component="PlayOutline" />
              </template>
              恢复
            </NButton>

            <NButton
              type="primary"
              :disabled="uploadQueue.length === 0 || isUploading || isPaused"
              :loading="isUploading"
              size="small"
              class="flex-1"
              @click="handleStartUpload"
            >
              <template #icon>
                <NIcon :component="PlayOutline" />
              </template>
              开始上传
            </NButton>
          </div>

          <div class="text-center text-xs text-gray-400 dark:text-gray-500">
            支持格式: {{ acceptText }} | 最大: {{ maxSizeText }}
          </div>
        </div>
      </div>

      <!-- 上传统计 -->
      <div
        class="min-w-[300px] flex-1 rounded-lg bg-white p-6 shadow transition-all duration-300 dark:bg-gray-800"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <h3 class="text-lg text-gray-600 font-medium dark:text-gray-200">上传统计</h3>

          <div class="flex flex-wrap gap-2">
            <NTag :bordered="false" type="info" class="flex items-center">
              <template #icon><NIcon :component="DocumentsOutline" /></template>
              总计: {{ uploadStats.total }}
            </NTag>

            <NTag :bordered="false" type="warning" class="flex items-center">
              <template #icon><NIcon :component="TimeOutline" /></template>
              待上传: {{ uploadStats.pending }}
            </NTag>

            <NTag :bordered="false" type="primary" class="flex items-center">
              <template #icon><NIcon :component="ArrowUpOutline" /></template>
              上传中: {{ uploadStats.active }}
            </NTag>

            <NTag :bordered="false" type="success" class="flex items-center">
              <template #icon><NIcon :component="CheckmarkCircleOutline" /></template>
              已完成: {{ uploadStats.completed }}
            </NTag>

            <NTag
              v-if="uploadStats.failed > 0"
              :bordered="false"
              type="error"
              class="flex items-center"
            >
              <template #icon><NIcon :component="CloseCircleOutline" /></template>
              失败: {{ uploadStats.failed }}
            </NTag>
          </div>
        </div>

        <!-- 全局进度 -->
        <div class="mb-4">
          <NProgress
            type="line"
            :percentage="totalProgress"
            :status="getProgressStatus()"
            :height="12"
            :border-radius="6"
            :fill-border-radius="6"
          />
        </div>

        <!-- 详细 info -->
        <div
          class="grid grid-cols-1 mt-2 items-center gap-3 text-sm text-gray-600 sm:grid-cols-3 dark:text-gray-400"
        >
          <div class="flex items-center gap-2">
            <NIcon :component="SpeedometerOutline" />
            <span>{{ formatSpeed(uploadSpeed) }}</span>
          </div>

          <!-- 🔥 使用平滑的时间显示 -->
          <div class="flex items-center gap-2">
            <NIcon :component="TimeOutline" />
            <span class="smooth-time">{{ formatTime(displayEstimatedTime) }}</span>
          </div>

          <div class="flex items-center gap-2">
            <NIcon :component="WifiOutline" />
            <NTag
              :type="
                networkQuality === 'good'
                  ? 'success'
                  : networkQuality === 'fair'
                    ? 'warning'
                    : 'error'
              "
              size="small"
              :bordered="false"
            >
              {{ networkQualityText }}
            </NTag>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表区域 -->
    <div class="flex flex-col flex-1 gap-4">
      <!-- 待上传队列 -->
      <UploadListSection
        v-if="uploadQueue.length > 0"
        title="待上传队列"
        :icon="FolderOpenOutline"
        :count="uploadQueue.length"
        tag-type="info"
        :items="uploadQueue"
        default-collapsed
        max-height="250px"
      >
        <template #item="{ item: task, index }">
          <UploadFileItem
            :key="task.id"
            :index="index"
            :task="task"
            :show-actions="true"
            @remove="removeFile(task.id)"
          />
        </template>
      </UploadListSection>

      <!-- 上传中 -->
      <UploadListSection
        v-if="activeUploads.size > 0"
        max-height="380px"
        title="上传中"
        :icon="CloudUploadOutline"
        :count="activeUploads.size"
        tag-type="primary"
        :items="Array.from(activeUploads.values())"
      >
        <template #item="{ item: task, index }">
          <UploadFileItem :key="task.id" :index="index" :task="task" :show-progress="true" />
        </template>
      </UploadListSection>

      <!-- 已完成 -->
      <UploadListSection
        v-if="completedUploads.length > 0"
        title="已完成"
        max-height="250px"
        :icon="CheckmarkDoneOutline"
        :count="completedUploads.length"
        :items="completedUploads"
        tag-type="success"
      >
        <template #item="{ item: task, index }">
          <UploadFileItem
            :task="task"
            :index="index"
            :show-actions="true"
            @retry="handleRetrySingle(task.id)"
            @view="handleView(task)"
          />
        </template>
      </UploadListSection>
    </div>

    <!-- 设置抽屉 -->
    <NDrawer v-model:show="showSettings" :width="400" placement="right">
      <NDrawerContent title="上传设置" closable>
        <NForm label-placement="left" label-width="120">
          <NFormItem label="并发文件数">
            <NInputNumber
              v-model:value="settings.maxConcurrentFiles"
              :min="1"
              :max="10"
              @update:value="handleSettingChange"
            />
          </NFormItem>
          <NFormItem label="并发分片数">
            <NInputNumber
              v-model:value="settings.maxConcurrentChunks"
              :min="1"
              :max="10"
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
          <NFormItem label="网络自适应">
            <NSwitch
              v-model:value="settings.enableNetworkAdaptation"
              @update:value="handleSettingChange"
            />
          </NFormItem>
          <NFormItem label="智能重试">
            <NSwitch
              v-model:value="settings.enableSmartRetry"
              @update:value="handleSettingChange"
            />
          </NFormItem>
          <NFormItem label="秒传检测">
            <NSwitch
              v-model:value="settings.enableDeduplication"
              @update:value="handleSettingChange"
            />
          </NFormItem>
          <NFormItem label="使用 Worker">
            <NSwitch v-model:value="settings.useWorker" @update:value="handleSettingChange" />
          </NFormItem>
        </NForm>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
/* 🔥 添加平滑过渡效果 */
.smooth-time {
  transition: opacity 0.3s ease;
  font-variant-numeric: tabular-nums;
  /* 等宽数字，避免跳动 */
}
</style>
