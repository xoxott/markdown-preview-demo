<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NButton,
  NButtonGroup,
  NCard,
  NIcon,
  NList,
  NListItem,
  NP,
  NProgress,
  NStatistic,
  NTag,
  NText,
  NUpload,
  NUploadDragger,
  type UploadCustomRequestOptions,
  type UploadFileInfo,
  useMessage,
  useThemeVars
} from 'naive-ui';
import { Archive as ArchiveIcon, DocumentAttach as DocumentIcon } from '@vicons/ionicons5';
import { formatFileSize, formatSpeed, formatTime } from '@/hooks/upload/utils';
import { UploadStatus } from '@/hooks/upload/type';
import { useChunkUpload } from '@/hooks/upload/ChunkUploadManager';
import MarkDown from '@/components/markdown/index.vue';
import README from './README.md?raw'
const themeVars = useThemeVars();
const previewStyle = computed(() => ({
  backgroundColor: themeVars.value.cardColor,
  color: themeVars.value.textColorBase,
  borderColor: themeVars.value.borderColor
}));
// 消息提示
const message = useMessage();

// 上传管理器
const {
  uploadQueue,
  activeUploads,
  completedUploads,
  totalProgress,
  uploadSpeed,
  isUploading,
  isPaused,
  uploadStats,
  uploader,
  addFiles,
  start,
  pause,
  resume,
  cancel,
  retryFailed,
  removeFile,
  clear,
  createNaiveFileList
} = useChunkUpload({
  maxConcurrentFiles: 2,
  maxConcurrentChunks: 4,
  chunkSize: 2 * 1024 * 1024, // 2MB
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge',
  maxFileSize: 500 * 1024 * 1024, // 500MB
  enableResume: true,
  enableDeduplication: true
});

uploader
  .onFileStart(task => {
    console.log(`开始上传: ${task.file.name}`);
  })
  .onFileSuccess(async task => {
    console.log('文件上传成功调用其他的接口添加文件地址');
  })
  .onFileError((task, error) => {
    console.log(`上传失败: ${task.file.name} - ${error.message}`);
  })
  .onAllComplete(tasks => {
    const successCount = tasks.filter(t => t.status === UploadStatus.SUCCESS).length;
    console.log(`批量上传完成! 成功: ${successCount}${tasks.length}`);
  });

// 计算属性
const naiveFileList = computed(() => createNaiveFileList());

const allTasks = computed(() => [
  ...uploadQueue.value,
  ...Array.from(activeUploads.value.values()),
  ...completedUploads.value
]);

// 方法
const handleCustomRequest = ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
  // Naive UI 自定义上传处理
  addFiles(file.file as File, {
    category: 'user-upload',
    customParams: { userId: '123' }
  });

  // 监听上传结果
  const task = allTasks.value.find(t => t.file === file.file);
  if (task) {
    const checkStatus = () => {
      if (task.status === UploadStatus.SUCCESS) {
        onFinish();
      } else if (task.status === UploadStatus.ERROR) {
        onError();
      } else {
        setTimeout(checkStatus, 1000);
      }
    };
    checkStatus();
  }
};

const handlePreview = (file: UploadFileInfo) => {
  const task = allTasks.value.find(t => t.id === file.id);
  if (task?.result?.fileUrl) {
    window.open(task.result.fileUrl, '_blank');
  }
};

const handleRemove = ({ file }: { file: UploadFileInfo }) => {
  removeFile(file.id);
  return true;
};

const getStatusTagType = (status: UploadStatus) => {
  switch (status) {
    case UploadStatus.SUCCESS:
      return 'success';
    case UploadStatus.ERROR:
      return 'error';
    case UploadStatus.UPLOADING:
      return 'info';
    case UploadStatus.PAUSED:
      return 'warning';
    default:
      return 'default';
  }
};

const getStatusText = (status: UploadStatus) => {
  const statusMap = {
    [UploadStatus.PENDING]: '等待中',
    [UploadStatus.UPLOADING]: '上传中',
    [UploadStatus.SUCCESS]: '完成',
    [UploadStatus.ERROR]: '失败',
    [UploadStatus.PAUSED]: '暂停',
    [UploadStatus.CANCELLED]: '取消'
  };
  return statusMap[status] || '未知';
};

// 批量操作
const startUpload = () => start();
const pauseAll = () => pause();
const resumeAll = () => resume();
const cancelAll = () => cancel();
const clearAll = () => clear();

const pauseFile = (taskId: string) => {
  // 实现单个文件暂停逻辑
  message.info('暂停功能开发中');
};

const resumeFile = (taskId: string) => {
  // 实现单个文件恢复逻辑
  message.info('恢复功能开发中');
};

const retryFile = (taskId: string) => {
  retryFailed();
  message.info('重试上传');
};
const content = computed(()=> README)
</script>

<template>
  <div class="upload-container">
    <n-upload
      :file-list="naiveFileList"
      :custom-request="handleCustomRequest"
      :on-preview="handlePreview"
      :on-remove="handleRemove"
      :show-file-list="true"
      :multiple="true"
      :directory-dnd="false"
    >
      <n-upload-dragger>
        <div style="margin-bottom: 12px">
          <n-icon size="48" :depth="3">
            <archive-icon />
          </n-icon>
        </div>
        <n-text style="font-size: 16px">点击或者拖动文件到该区域来上传</n-text>
        <n-p depth="3" style="margin: 8px 0 0 0">支持单个或批量上传，严禁上传公司数据或其他敏感信息</n-p>
      </n-upload-dragger>
    </n-upload>

    <!-- 上传进度面板 -->
    <n-card v-if="uploadStats.total > 0" title="上传进度" class="upload-progress-panel">
      <div class="progress-overview">
        <n-progress
          type="line"
          :percentage="totalProgress"
          :status="totalProgress === 100 ? 'success' : 'info'"
          :show-indicator="true"
        />
        <div class="progress-stats">
          <n-statistic label="总进度" :value="totalProgress" suffix="%" />
          <n-statistic label="上传速度" :value="formatSpeed(uploadSpeed)" />
          <n-statistic label="预计剩余" :value="formatTime(uploadStats.estimatedTime)" />
        </div>
      </div>

      <!-- 文件列表 -->
      <n-list class="file-list">
        <n-list-item v-for="task in allTasks" :key="task.id">
          <div class="file-item">
            <div class="file-info">
              <n-icon class="file-icon">
                <document-icon />
              </n-icon>
              <div class="file-details">
                <div class="file-name">{{ task.file.name }}</div>
                <div class="file-meta">
                  {{ formatFileSize(task.file.size) }} •
                  <n-tag :type="getStatusTagType(task.status)" size="small">
                    {{ getStatusText(task.status) }}
                  </n-tag>
                </div>
              </div>
            </div>

            <div class="file-progress">
              <n-progress
                :percentage="task.progress"
                :status="task.status === UploadStatus.ERROR ? 'error' : 'info'"
                :show-indicator="false"
                style="width: 120px"
              />
              <span class="progress-text">{{ task.progress }}%</span>
            </div>

            <div class="file-actions">
              <n-button
                v-if="task.status === UploadStatus.UPLOADING"
                size="small"
                type="warning"
                @click="pauseFile(task.id)"
              >
                暂停
              </n-button>

              <n-button
                v-if="task.status === UploadStatus.PAUSED"
                size="small"
                type="primary"
                @click="resumeFile(task.id)"
              >
                继续
              </n-button>

              <n-button v-if="task.status === UploadStatus.ERROR" size="small" type="error" @click="retryFile(task.id)">
                重试
              </n-button>

              <n-button size="small" type="default" @click="removeFile(task.id)">移除</n-button>
            </div>
          </div>
        </n-list-item>
      </n-list>

      <!-- 批量操作 -->
      <div class="batch-actions">
        <n-button-group>
          <n-button v-if="!isUploading" type="primary" @click="startUpload">开始上传</n-button>
          <n-button v-if="isUploading" type="warning" @click="pauseAll">暂停全部</n-button>
          <n-button v-if="isPaused" type="primary" @click="resumeAll">继续全部</n-button>
          <n-button @click="cancelAll">取消全部</n-button>
          <n-button @click="clearAll">清空列表</n-button>
        </n-button-group>
      </div>
    </n-card>
     <div class="border border-gray-200 rounded-md p-4 shadow w-full  flex items-center justify-center" :style="previewStyle">
        <MarkDown :content="content" />
   </div>
  </div>
</template>

<style scoped>
.upload-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.upload-progress-panel {
  margin-top: 20px;
}

.progress-overview {
  margin-bottom: 20px;
}

.progress-stats {
  display: flex;
  gap: 20px;
  margin-top: 10px;
}

.file-list {
  margin: 20px 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.file-icon {
  font-size: 20px;
  color: #666;
}

.file-details {
  flex: 1;
}

.file-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.file-meta {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-text {
  font-size: 12px;
  color: #666;
  min-width: 30px;
}

.file-actions {
  display: flex;
  gap: 4px;
}

.batch-actions {
  margin-top: 20px;
  text-align: center;
}
</style>
`
