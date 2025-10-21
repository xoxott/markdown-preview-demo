<template>
  <div class="upload-container">
    <!-- 头部标题 -->
    <div class="header">
      <h2>
        <n-icon :component="CloudUploadOutline" :size="28" />
        文件上传管理
      </h2>
      <n-space>
        <n-button @click="showSettings = true" quaternary circle>
          <template #icon>
            <n-icon :component="SettingsOutline" />
          </template>
        </n-button>
        <n-button @click="clear" quaternary circle type="error" v-if="uploadStats.total > 0">
          <template #icon>
            <n-icon :component="TrashOutline" />
          </template>
        </n-button>
      </n-space>
    </div>
 
    <div class="flex gap-6">
    <!-- 上传区域 -->
    <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
      <div class="upload-zone">
        <n-icon :component="CloudUploadOutline" :size="48" color="#18a058" />
        <p class="upload-hint">拖拽文件到此处或点击选择</p>
        <input
          type="file"
          multiple
          @change="handleFileSelect"
          ref="fileInputRef"
          class="file-input"
        />
      </div>
      <n-space vertical>
        <n-space>
          <n-button 
            type="primary" 
            @click="handleStartUpload" 
            :disabled="uploadQueue.length === 0"
            :loading="isUploading"
          >
            <template #icon>
              <n-icon :component="PlayOutline" />
            </template>
            开始上传
          </n-button>
          <n-button @click="pause" :disabled="!isUploading || isPaused">
            <template #icon>
              <n-icon :component="PauseOutline" />
            </template>
            暂停
          </n-button>
          <n-button @click="resume" :disabled="!isPaused">
            <template #icon>
              <n-icon :component="PlayOutline" />
            </template>
            恢复
          </n-button>
          <n-button 
            @click="retryFailed" 
            :disabled="failedCount === 0"
            type="warning"
          >
            <template #icon>
              <n-icon :component="RefreshOutline" />
            </template>
            重试失败 ({{ failedCount }})
          </n-button>
        </n-space>
        <div class="upload-tips">
          <n-text depth="3" style="font-size: 12px;">
            支持格式: {{ acceptText }} | 最大: {{ maxSizeText }}
          </n-text>
        </div>
      </n-space>
    </div>

    <!-- 统计信息 -->
    <div class="stats-card">
      <div class="stats-header">
        <h3>上传统计</h3>
        <n-space>
          <n-tag :bordered="false" type="info">
            <template #icon>
              <n-icon :component="DocumentsOutline" />
            </template>
            总计: {{ uploadStats.total }}
          </n-tag>
          <n-tag :bordered="false" type="warning">
            <template #icon>
              <n-icon :component="TimeOutline" />
            </template>
            待上传: {{ uploadStats.pending }}
          </n-tag>
          <n-tag :bordered="false" type="primary">
            <template #icon>
              <n-icon :component="ArrowUpOutline" />
            </template>
            上传中: {{ uploadStats.active }}
          </n-tag>
          <n-tag :bordered="false" type="success">
            <template #icon>
              <n-icon :component="CheckmarkCircleOutline" />
            </template>
            已完成: {{ uploadStats.completed }}
          </n-tag>
          <n-tag :bordered="false" type="error" v-if="uploadStats.failed > 0">
            <template #icon>
              <n-icon :component="CloseCircleOutline" />
            </template>
            失败: {{ uploadStats.failed }}
          </n-tag>
        </n-space>
      </div>
      
      <n-progress
        type="line"
        :percentage="totalProgress"
        :status="getProgressStatus()"
        :height="12"
        :border-radius="6"
        :fill-border-radius="6"
      />
      
      <div class="upload-info">
        <n-space>
          <div class="info-item">
            <n-icon :component="SpeedometerOutline" />
            <span>{{ formatSpeed(uploadSpeed) }}</span>
          </div>
          <n-divider vertical />
          <div class="info-item">
            <n-icon :component="TimeOutline" />
            <span>{{ formatTime(uploadStats.estimatedTime) }}</span>
          </div>
          <n-divider vertical />
          <div class="info-item">
            <n-icon :component="WifiOutline" />
            <n-tag 
              :type="networkQuality === 'good' ? 'success' : networkQuality === 'fair' ? 'warning' : 'error'"
              size="small"
              :bordered="false"
            >
              {{ networkQualityText }}
            </n-tag>
          </div>
        </n-space>
      </div>
    </div>

    </div>


    <!-- 待上传队列 -->
    <n-collapse-transition :show="uploadQueue.length > 0">
      <div class="file-section">
        <div class="section-header">
          <h3>
            <n-icon :component="FolderOpenOutline" />
            待上传队列
          </h3>
          <n-tag :bordered="false" round>{{ uploadQueue.length }}</n-tag>
        </div>
        <n-list hoverable clickable>
          <n-list-item v-for="task in uploadQueue" :key="task.id">
            <template #prefix>
              <n-avatar 
                :style="{ background: getFileColor(task.file.type) }"
                :size="40"
              >
                <n-icon :component="getFileIcon(task.file.type)" :size="20" />
              </n-avatar>
            </template>
            <div class="file-item">
              <div class="file-info">
                <n-ellipsis class="file-name" :line-clamp="1">
                  {{ task.file.name }}
                </n-ellipsis>
                <n-text depth="3" class="file-meta">
                  {{ formatFileSize(task.file.size) }} · 
                  {{ task.file.type || '未知类型' }}
                </n-text>
              </div>
              <n-tag 
                :type="getStatusType(task.status)" 
                :bordered="false"
                size="small"
              >
                {{ getStatusText(task.status) }}
              </n-tag>
            </div>
            <template #suffix>
              <n-button
                size="small"
                @click="removeFile(task.id)"
                quaternary
                circle
              >
                <template #icon>
                  <n-icon :component="CloseOutline" />
                </template>
              </n-button>
            </template>
          </n-list-item>
        </n-list>
      </div>
    </n-collapse-transition>

    <!-- 上传中 -->
    <n-collapse-transition :show="activeUploads.size > 0">
      <div class="file-section">
        <div class="section-header">
          <h3>
            <n-icon :component="CloudUploadOutline" />
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
          >
            <template #prefix>
              <n-avatar 
                :style="{ background: getFileColor(task.file.type) }"
                :size="40"
              >
                <n-icon :component="getFileIcon(task.file.type)" :size="20" />
              </n-avatar>
            </template>
            <div class="file-item uploading">
              <div class="file-info">
                <n-ellipsis class="file-name" :line-clamp="1">
                  {{ task.file.name }}
                </n-ellipsis>
                <div class="progress-wrapper">
                  <n-progress
                    type="line"
                    :percentage="task.progress"
                    :show-indicator="false"
                    :height="6"
                  />
                  <n-text depth="3" class="progress-text">
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
      <div class="file-section">
        <div class="section-header">
          <h3>
            <n-icon :component="CheckmarkDoneOutline" />
            已完成
          </h3>
          <n-tag :bordered="false" round>{{ completedUploads.length }}</n-tag>
        </div>
        <n-list hoverable>
          <n-list-item v-for="task in completedUploads" :key="task.id">
            <template #prefix>
              <n-avatar 
                :style="{ 
                  background: task.status === UploadStatus.SUCCESS 
                    ? '#18a05880' 
                    : '#d0305080' 
                }"
                :size="40"
              >
                <n-icon 
                  :component="task.status === UploadStatus.SUCCESS 
                    ? CheckmarkCircleOutline 
                    : CloseCircleOutline
                  "
                  :size="24"
                  :color="task.status === UploadStatus.SUCCESS ? '#18a058' : '#d03050'"
                />
              </n-avatar>
            </template>
            <div class="file-item">
              <div class="file-info">
                <n-ellipsis class="file-name" :line-clamp="1">
                  {{ task.file.name }}
                </n-ellipsis>
                <div class="file-meta-row">
                  <n-text depth="3" class="file-meta">
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
                <n-text 
                  v-if="task.error" 
                  type="error" 
                  class="error-message"
                  depth="3"
                >
                  {{ task.error.message }}
                </n-text>
              </div>
            </div>
            <template #suffix>
              <n-space :size="8">
                <n-button
                  v-if="task.status === UploadStatus.ERROR"
                  size="small"
                  @click="handleRetrySingle(task.id)"
                  type="warning"
                  secondary
                >
                  <template #icon>
                    <n-icon :component="RefreshOutline" />
                  </template>
                  重试
                </n-button>
                <n-button
                  v-if="task.status === UploadStatus.SUCCESS && task.result?.fileUrl"
                  size="small"
                  @click="handleViewFile(task.result.fileUrl)"
                  type="primary"
                  secondary
                >
                  <template #icon>
                    <n-icon :component="EyeOutline" />
                  </template>
                  查看
                </n-button>
                <n-button
                  size="small"
                  @click="removeFile(task.id)"
                  secondary
                  type="error"
                >
                  <template #icon>
                    <n-icon :component="TrashOutline" />
                  </template>
                  删除
                </n-button>
              </n-space>
            </template>
          </n-list-item>
        </n-list>
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
import { useChunkUpload } from '@/hooks/upload/ChunkUploadManager';
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
const getProgressStatus = () => {
  if (uploadStats.value.failed > 0) return 'exception';
  if (uploadStats.value.completed === uploadStats.value.total) return 'success';
  return 'default';
};
</script>

<style scoped lang="scss">
.upload-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  
  h2 {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }
}

.upload-area {
  margin-bottom: 24px;
  padding: 32px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 24px;
  align-items: center;
  
  .upload-zone {
    flex: 1;
    position: relative;
    padding: 48px 32px;
    border: 2px dashed #d9d9d9;
    border-radius: 12px;
    text-align: center;
    transition: all 0.3s;
    cursor: pointer;
    
    &:hover {
      border-color: #18a058;
      background: #f0fdf4;
    }
    
    .upload-hint {
      margin: 16px 0 0;
      font-size: 16px;
      color: #666;
    }
    
    .file-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
  }
  
  .upload-tips {
    margin-top: 8px;
  }
}

.stats-card {
  margin-bottom: 24px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  
  .stats-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    
    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
  }
  
  .upload-info {
    margin-top: 16px;
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
    }
  }
}

.file-section {
  margin-bottom: 24px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    
    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }
}

.file-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  
  &.uploading {
    .file-info {
      flex: 1;
    }
  }
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.file-meta {
  font-size: 12px;
}

.file-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-text {
  font-size: 12px;
}

.error-message {
  font-size: 12px;
  margin-top: 4px;
}
</style>