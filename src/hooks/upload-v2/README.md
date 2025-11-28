# upload-v2 分片上传工具

一个功能强大、性能优化的 Vue 3 分片上传解决方案，支持断点续传、智能重试、网络自适应等高级特性。

## 📋 目录

- [特性](#特性)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [配置选项](#配置选项)
- [使用示例](#使用示例)
- [存储服务适配](#存储服务适配)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [类型定义](#类型定义)

## ✨ 特性

### 核心功能
- ✅ **分片上传**：自动将大文件分割成小块上传，提高上传成功率
- ✅ **断点续传**：支持暂停和恢复，断网后自动续传
- ✅ **智能重试**：自动重试失败的分片，支持指数退避策略
- ✅ **并发控制**：可配置的文件和分片并发数
- ✅ **进度监控**：实时上传进度、速度、预计时间
- ✅ **文件去重**：基于 MD5 的秒传功能

### 高级特性
- 🚀 **网络自适应**：根据网络质量自动调整上传策略
- 🎯 **性能优化**：Web Worker 计算 MD5，减少主线程阻塞
- 📊 **统计信息**：上传历史统计和趋势分析
- 🌍 **国际化**：支持多语言状态文本
- 🔍 **性能监控**：详细的性能指标收集
- 🎨 **UI 集成**：完美集成 Naive UI 组件库

### 开发体验
- 📝 **TypeScript**：完整的类型定义
- 🧪 **单元测试**：100% 测试通过率
- 📦 **模块化设计**：清晰的代码结构，易于维护
- 🛠️ **工具函数**：丰富的工具函数和辅助方法

## 🚀 快速开始

### 基础使用

```typescript
import { useChunkUpload } from '@/hooks/upload-v2';

const {
  // 状态
  uploadQueue,
  activeUploads,
  completedUploads,
  totalProgress,
  uploadSpeed,
  isUploading,
  uploadStats,

  // 方法
  addFiles,
  start,
  pause,
  resume,
  cancel,
  removeFile,

  // 工具函数
  formatFileSize,
  formatSpeed,
  getStatusText
} = useChunkUpload({
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge',
  maxConcurrentFiles: 3,
  maxConcurrentChunks: 5,
  chunkSize: 2 * 1024 * 1024, // 2MB
  enableResume: true,
  enableDeduplication: true
});

// 添加文件
await addFiles(files);

// 开始上传
await start();
```

### 完整配置示例

```typescript
const uploader = useChunkUpload({
  // 必需配置
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge',

  // 并发控制
  maxConcurrentFiles: 3,        // 同时上传的文件数
  maxConcurrentChunks: 5,        // 每个文件同时上传的分片数

  // 分片配置
  chunkSize: 2 * 1024 * 1024,   // 分片大小：2MB
  minChunkSize: 512 * 1024,     // 最小分片：512KB
  maxChunkSize: 10 * 1024 * 1024, // 最大分片：10MB

  // 重试配置
  maxRetries: 3,                 // 最大重试次数
  retryDelay: 1000,              // 基础延迟：1秒
  retryBackoff: 1.5,             // 指数退避倍数

  // 请求配置
  headers: {
    'Authorization': 'Bearer token'
  },
  timeout: 60000,                // 超时时间：60秒
  customParams: {
    userId: '123',
    category: 'documents'
  },

  // 文件过滤
  accept: ['.jpg', '.png', '.pdf'], // 允许的文件类型
  maxFileSize: 100 * 1024 * 1024,   // 最大文件大小：100MB
  maxFiles: 50,                      // 最大文件数

  // 功能开关
  enableResume: true,            // 断点续传
  enableDeduplication: true,      // 文件去重（秒传）
  enablePreview: true,            // 预览功能
  enableCompression: true,        // 自动压缩图片
  enableCache: true,              // 缓存支持
  useWorker: true,                // 使用 Web Worker 计算 MD5
  enableNetworkAdaptation: true,  // 网络自适应
  enableSmartRetry: true,         // 智能重试

  // 压缩和预览配置
  compressionQuality: 0.8,        // 压缩质量：80%
  previewMaxWidth: 200,          // 预览图最大宽度
  previewMaxHeight: 200,          // 预览图最大高度

  // 秒传检查（可选）
  checkFileUrl: '/api/upload/check',

  // 取消上传（可选）
  cancelUploadUrl: '/api/upload/cancel'
});
```

## 📚 API 文档

### 状态（响应式）

所有状态都是 Vue 3 的 `ref`，可以直接在模板中使用。

#### `uploadQueue`
- **类型**：`Ref<FileTask[]>`
- **说明**：等待上传的文件队列

#### `activeUploads`
- **类型**：`Ref<Map<string, FileTask>>`
- **说明**：正在上传的文件

#### `completedUploads`
- **类型**：`Ref<FileTask[]>`
- **说明**：已完成上传的文件（包括成功和失败）

#### `totalProgress`
- **类型**：`Ref<number>`
- **说明**：总上传进度（0-100）

#### `uploadSpeed`
- **类型**：`Ref<number>`
- **说明**：当前上传速度（KB/s）

#### `isUploading`
- **类型**：`Ref<boolean>`
- **说明**：是否正在上传

#### `isPaused`
- **类型**：`Ref<boolean>`
- **说明**：是否已暂停

#### `uploadStats`
- **类型**：`Ref<UploadStats>`
- **说明**：上传统计信息

```typescript
interface UploadStats {
  completed: number;      // 已完成数量
  active: number;         // 进行中数量
  pending: number;       // 等待中数量
  failed: number;        // 失败数量
  paused: number;        // 暂停数量
  cancelled: number;     // 取消数量
  total: number;         // 总数量
  totalSize: number;     // 总大小（字节）
  uploadedSize: number;  // 已上传大小（字节）
  averageSpeed: number;  // 平均速度（KB/s）
  estimatedTime: number; // 预计剩余时间（秒）
  instantSpeed: number; // 瞬时速度（KB/s）
  networkQuality: string; // 网络质量：'good' | 'fair' | 'poor'
}
```

#### `networkQuality`
- **类型**：`Ref<'good' | 'fair' | 'poor'>`
- **说明**：当前网络质量

### 方法

#### `addFiles(files, options?)`
添加文件到上传队列

```typescript
// 添加单个文件
await addFiles(new File(['content'], 'test.txt'));

// 添加多个文件
await addFiles([file1, file2, file3]);

// 添加文件并设置选项
await addFiles(files, {
  priority: 'high',
  category: 'documents',
  customParams: { userId: '123' }
});
```

**参数**：
- `files`: `File | File[] | FileList` - 要上传的文件
- `options?`: `FileUploadOptions` - 文件上传选项

**返回**：`Promise<void>`

#### `start()`
开始上传队列中的文件

```typescript
await start();
```

**返回**：`Promise<this>`

#### `pause(taskId)`
暂停指定任务

```typescript
pause('task-id-123');
```

**参数**：
- `taskId`: `string` - 任务 ID

#### `pauseAll()`
暂停所有上传任务

```typescript
await pauseAll();
```

#### `resume(taskId)`
恢复指定任务

```typescript
resume('task-id-123');
```

#### `resumeAll()`
恢复所有暂停的任务

```typescript
resumeAll();
```

#### `cancel(taskId)`
取消指定任务

```typescript
cancel('task-id-123');
```

#### `cancelAll()`
取消所有任务

```typescript
await cancelAll();
```

#### `retryFailed()`
重试所有失败的任务

```typescript
retryFailed();
```

#### `retrySingleFile(taskId)`
重试单个失败的任务

```typescript
retrySingleFile('task-id-123');
```

#### `removeFile(taskId)`
从队列中移除文件

```typescript
removeFile('task-id-123');
```

#### `clear()`
清空所有文件和状态

```typescript
clear();
```

#### `getTask(taskId)`
获取指定任务

```typescript
const task = getTask('task-id-123');
```

**返回**：`FileTask | undefined`

#### `updateConfig(config)`
更新配置

```typescript
updateConfig({
  maxConcurrentFiles: 5,
  chunkSize: 5 * 1024 * 1024
});
```

### 工具函数

#### `createNaiveFileList()`
创建 Naive UI 格式的文件列表

```typescript
const fileList = createNaiveFileList();
// 返回 UploadFileInfo[]，可直接用于 n-upload 组件
```

#### `formatFileSize(size)`
格式化文件大小

```typescript
formatFileSize(1024 * 1024); // '1.00 MB'
```

#### `formatSpeed(speed)`
格式化上传速度

```typescript
formatSpeed(1024); // '1.00 MB/s'
```

#### `formatTime(seconds)`
格式化时间

```typescript
formatTime(3661); // '1小时1分1秒'
```

#### `getStatusText(status)`
获取状态文本（支持国际化）

```typescript
getStatusText(UploadStatus.UPLOADING); // '上传中' 或 'Uploading'
```

#### `getFileIcon(file)`
获取文件图标

```typescript
const icon = getFileIcon(file); // 返回图标名称
```

#### `getFileColor(file)`
获取文件颜色

```typescript
const color = getFileColor(file); // 返回颜色值
```

### 统计信息 API

#### `getTodayStats()`
获取今日统计信息

```typescript
const stats = getTodayStats();
// {
//   totalFiles: 10,
//   successFiles: 8,
//   failedFiles: 2,
//   totalSize: 1024 * 1024 * 100,
//   averageSpeed: 1024
// }
```

#### `getHistoryStats(days)`
获取历史统计信息

```typescript
const stats = getHistoryStats(7); // 最近 7 天
```

#### `getTrendAnalysis(days)`
获取趋势分析

```typescript
const analysis = getTrendAnalysis(7);
// {
//   uploadTrend: 'up' | 'down' | 'stable',
//   speedTrend: 'up' | 'down' | 'stable',
//   successRate: 0.95
// }
```

### 国际化 API

#### `setLanguage(language)`
设置语言

```typescript
setLanguage('zh-CN'); // 中文
setLanguage('en-US'); // 英文
```

#### `setCustomTexts(texts)`
设置自定义文本

```typescript
setCustomTexts({
  status: {
    uploading: '正在上传...',
    success: '上传成功'
  }
});
```

### 性能监控 API

#### `getPerformanceReport()`
获取性能报告

```typescript
const report = getPerformanceReport();
// {
//   averageChunkUploadTime: 1234,
//   totalNetworkRequests: 100,
//   averageFileProcessingTime: 5678
// }
```

#### `getPerformanceMetrics()`
获取性能指标

```typescript
const metrics = getPerformanceMetrics();
```

## ⚙️ 配置选项

### 必需配置

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `uploadChunkUrl` | `string` | 分片上传接口地址 |
| `mergeChunksUrl` | `string` | 合并分片接口地址 |

### 并发控制

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxConcurrentFiles` | `number` | `3` | 同时上传的文件数 |
| `maxConcurrentChunks` | `number` | `5` | 每个文件同时上传的分片数 |

### 分片配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `chunkSize` | `number` | `2MB` | 分片大小（字节） |
| `minChunkSize` | `number` | `512KB` | 最小分片大小 |
| `maxChunkSize` | `number` | `20MB` | 最大分片大小 |

### 重试配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxRetries` | `number` | `3` | 最大重试次数 |
| `retryDelay` | `number` | `1000` | 基础延迟（毫秒） |
| `retryBackoff` | `number` | `1.5` | 指数退避倍数 |

### 请求配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `headers` | `Record<string, string>` | `{}` | 请求头 |
| `timeout` | `number` | `60000` | 超时时间（毫秒） |
| `customParams` | `Record<string, any>` | `{}` | 自定义参数 |

### 文件过滤

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `accept` | `string[]` | `undefined` | 允许的文件类型 |
| `maxFileSize` | `number` | `undefined` | 最大文件大小（字节） |
| `maxFiles` | `number` | `undefined` | 最大文件数 |

### 功能开关

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enableResume` | `boolean` | `true` | 启用断点续传 |
| `enableDeduplication` | `boolean` | `false` | 启用文件去重（秒传） |
| `enablePreview` | `boolean` | `true` | 启用预览功能 |
| `enableCompression` | `boolean` | `true` | 启用自动压缩 |
| `enableCache` | `boolean` | `true` | 启用缓存 |
| `useWorker` | `boolean` | `true` | 使用 Web Worker |
| `enableNetworkAdaptation` | `boolean` | `true` | 启用网络自适应 |
| `enableSmartRetry` | `boolean` | `true` | 启用智能重试 |

### 压缩和预览配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `compressionQuality` | `number` | `0.8` | 压缩质量（0-1） |
| `previewMaxWidth` | `number` | `200` | 预览图最大宽度 |
| `previewMaxHeight` | `number` | `200` | 预览图最大高度 |

## 🔌 存储服务适配

upload-v2 支持通过自定义请求转换器适配各种对象存储服务，包括：

- ✅ **MinIO** - 高性能对象存储
- ✅ **阿里云 OSS** - 阿里云对象存储服务
- ✅ **腾讯云 COS** - 腾讯云对象存储
- ✅ **AWS S3** - Amazon 对象存储
- ✅ **其他 S3 兼容服务**

### 快速配置

#### MinIO

```typescript
const uploader = useChunkUpload({
  uploadChunkUrl: '/api/minio/upload/chunk',
  mergeChunksUrl: '/api/minio/upload/complete',

  chunkUploadTransformer: ({ task, chunk }) => {
    const formData = new FormData();
    formData.append('file', chunk.blob || task.file.slice(chunk.start, chunk.end));
    formData.append('chunk_number', String(chunk.index));
    formData.append('upload_id', task.id);
    formData.append('total_chunks', String(task.totalChunks));
    return formData;
  },

  mergeChunksTransformer: ({ task }) => ({
    upload_id: task.id,
    filename: task.file.name,
    total_chunks: task.totalChunks
  })
});
```

#### 阿里云 OSS

```typescript
const uploader = useChunkUpload({
  uploadChunkUrl: '/api/oss/upload-part',
  mergeChunksUrl: '/api/oss/complete',

  chunkUploadTransformer: ({ task, chunk }) => {
    const formData = new FormData();
    formData.append('file', chunk.blob || task.file.slice(chunk.start, chunk.end));
    formData.append('partNumber', String(chunk.index + 1)); // OSS 从 1 开始
    formData.append('uploadId', task.id);
    formData.append('key', task.file.name);
    return formData;
  },

  mergeChunksTransformer: ({ task }) => ({
    uploadId: task.id,
    key: task.file.name,
    totalChunks: task.totalChunks
  })
});
```

> 📖 **详细配置指南**: 查看 [存储服务适配指南](./STORAGE.md) 获取更多信息。

## 💡 使用示例

### 基础上传

```vue
<template>
  <div>
    <input type="file" multiple @change="handleFileChange" />
    <button @click="startUpload">开始上传</button>
    <div>进度: {{ totalProgress }}%</div>
    <div>速度: {{ formatSpeed(uploadSpeed) }}</div>
  </div>
</template>

<script setup lang="ts">
import { useChunkUpload } from '@/hooks/upload-v2';

const {
  addFiles,
  start,
  totalProgress,
  uploadSpeed,
  formatSpeed
} = useChunkUpload({
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge'
});

const handleFileChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (files) {
    addFiles(Array.from(files));
  }
};

const startUpload = () => {
  start();
};
</script>
```

### 集成 Naive UI

```vue
<template>
  <n-upload
    :file-list="fileList"
    :disabled="isUploading"
    @change="handleFileChange"
  >
    <n-button>选择文件</n-button>
  </n-upload>

  <n-progress
    :percentage="totalProgress"
    :status="getProgressStatus()"
  />

  <div class="upload-stats">
    <span>速度: {{ formatSpeed(uploadSpeed) }}</span>
    <span>已完成: {{ uploadStats.completed }}/{{ uploadStats.total }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useChunkUpload } from '@/hooks/upload-v2';

const {
  addFiles,
  start,
  createNaiveFileList,
  totalProgress,
  uploadSpeed,
  uploadStats,
  isUploading,
  formatSpeed,
  getProgressStatus
} = useChunkUpload({
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge'
});

const fileList = computed(() => createNaiveFileList());

const handleFileChange = async (options: { fileList: File[] }) => {
  await addFiles(options.fileList);
  await start();
};
</script>
```

### 事件监听

```typescript
import { useChunkUpload } from '@/hooks/upload-v2';

const { uploader } = useChunkUpload({
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge'
});

// 监听文件上传进度
uploader.callbackManager.on('onFileProgress', (task) => {
  console.log(`文件 ${task.file.name} 进度: ${task.progress}%`);
});

// 监听文件上传成功
uploader.callbackManager.on('onFileSuccess', (task, result) => {
  console.log(`文件 ${task.file.name} 上传成功:`, result);
});

// 监听文件上传失败
uploader.callbackManager.on('onFileError', (task, error) => {
  console.error(`文件 ${task.file.name} 上传失败:`, error);
});

// 监听所有文件完成
uploader.callbackManager.on('onAllComplete', (tasks) => {
  console.log('所有文件上传完成:', tasks);
});
```

### 自定义请求转换器

```typescript
const uploader = useChunkUpload({
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge',

  // 自定义分片上传参数
  chunkUploadTransformer: ({ task, chunk, customParams }) => {
    const formData = new FormData();
    formData.append('file', chunk.blob, task.file.name);
    formData.append('chunkIndex', String(chunk.index));
    formData.append('totalChunks', String(task.totalChunks));
    formData.append('fileMD5', task.fileMD5);
    formData.append('taskId', task.id);

    // 添加自定义参数
    Object.entries(customParams || {}).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    return formData;
  },

  // 自定义合并参数
  mergeChunksTransformer: ({ task, customParams }) => {
    return {
      fileMD5: task.fileMD5,
      fileName: task.file.name,
      fileSize: task.file.size,
      totalChunks: task.totalChunks,
      taskId: task.id,
      ...customParams
    };
  }
});
```

### 断点续传

```typescript
const uploader = useChunkUpload({
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge',
  enableResume: true,      // 启用断点续传
  enableCache: true        // 启用缓存
});

// 暂停上传
uploader.pauseAll();

// 恢复上传（会自动从上次中断的地方继续）
uploader.resumeAll();
```

### 文件去重（秒传）

upload-v2 **完全支持秒传功能**！通过 MD5 校验，如果文件已存在于服务器，会自动跳过上传。

#### 工作原理

1. **计算文件 MD5**：在文件处理阶段自动计算文件 MD5 值
2. **检查文件是否存在**：调用 `checkFileUrl` 接口检查文件是否已存在
3. **跳过上传**：如果文件已存在，直接返回文件 URL，跳过实际上传

#### 配置示例

```typescript
const uploader = useChunkUpload({
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge',
  checkFileUrl: '/api/upload/check',  // 秒传检查接口（必需）
  enableDeduplication: true,           // 启用秒传功能（必需）
  useWorker: true                      // 推荐：使用 Web Worker 计算 MD5，不阻塞主线程
});

// 添加文件时，如果文件已存在，会自动跳过上传
await uploader.addFiles(files);
await uploader.start();
```

#### 服务端接口要求

**秒传检查接口** (`checkFileUrl`)

**请求方式**: `POST`

**请求参数**（可通过 `checkFileTransformer` 自定义）:
```json
{
  "fileMD5": "d41d8cd98f00b204e9800998ecf8427e",
  "fileName": "example.jpg",
  "fileSize": 1024000
}
```

**响应格式**:
```json
{
  "exists": true,                    // 文件是否存在
  "fileUrl": "https://example.com/file.jpg",  // 如果存在，返回文件 URL
  "fileId": "file-id-123"            // 文件 ID（可选）
}
```

如果 `exists: false`，则继续正常上传流程。

#### 自定义秒传检查参数

```typescript
const uploader = useChunkUpload({
  checkFileUrl: '/api/upload/check',
  enableDeduplication: true,

  // 自定义秒传检查参数
  checkFileTransformer: ({ task, customParams }) => {
    return {
      hash: task.fileMD5,
      name: task.file.name,
      size: task.file.size,
      ...customParams
    };
  }
});
```

#### 监听秒传事件

```typescript
uploader.callbackManager.on('onFileSuccess', (task, result) => {
  if (result.instantUpload) {
    console.log(`文件 ${task.file.name} 秒传成功！`);
  } else {
    console.log(`文件 ${task.file.name} 上传成功`);
  }
});
```

#### 性能优化建议

1. **使用 Web Worker**：启用 `useWorker: true`，在后台线程计算 MD5，不阻塞主线程
2. **批量检查**：如果支持，可以批量检查多个文件的 MD5
3. **缓存结果**：服务端可以缓存 MD5 检查结果，提高响应速度

#### 完整示例

```typescript
const uploader = useChunkUpload({
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge',
  checkFileUrl: '/api/upload/check',

  // 启用秒传
  enableDeduplication: true,
  useWorker: true,  // 使用 Web Worker 计算 MD5

  // 自定义检查参数
  checkFileTransformer: ({ task }) => ({
    md5: task.fileMD5,
    filename: task.file.name,
    size: task.file.size
  }),

  // 监听秒传成功
  onFileSuccess: (task, result) => {
    if (result.instantUpload) {
      message.success(`文件 ${task.file.name} 秒传成功！`);
    }
  }
});

// 添加文件
await uploader.addFiles(files);
await uploader.start();
```

## 🎯 最佳实践

### 1. 分片大小选择

- **小文件（< 10MB）**：使用默认 2MB 分片
- **中等文件（10-100MB）**：使用 5MB 分片
- **大文件（> 100MB）**：使用 10MB 分片

```typescript
const chunkSize = file.size > 100 * 1024 * 1024
  ? 10 * 1024 * 1024
  : file.size > 10 * 1024 * 1024
    ? 5 * 1024 * 1024
    : 2 * 1024 * 1024;
```

### 2. 并发控制

根据网络环境调整并发数：

```typescript
// 良好网络
maxConcurrentFiles: 5,
maxConcurrentChunks: 10

// 一般网络
maxConcurrentFiles: 3,
maxConcurrentChunks: 5

// 差网络
maxConcurrentFiles: 1,
maxConcurrentChunks: 2
```

### 3. 错误处理

```typescript
uploader.callbackManager.on('onFileError', (task, error) => {
  // 记录错误日志
  console.error('上传失败:', error);

  // 显示错误提示
  message.error(`文件 ${task.file.name} 上传失败`);

  // 可以手动重试
  uploader.retrySingleFile(task.id);
});
```

### 4. 性能优化

```typescript
const uploader = useChunkUpload({
  // 使用 Web Worker 计算 MD5，避免阻塞主线程
  useWorker: true,

  // 启用网络自适应，自动调整上传策略
  enableNetworkAdaptation: true,

  // 启用智能重试，提高成功率
  enableSmartRetry: true
});
```

### 5. 内存管理

对于大量文件上传，建议：

```typescript
// 限制同时上传的文件数
maxConcurrentFiles: 3,

// 及时清理已完成的任务
watch(() => uploader.completedUploads.value, (completed) => {
  // 保留最近 10 个已完成的任务
  if (completed.length > 10) {
    completed.slice(0, -10).forEach(task => {
      uploader.removeFile(task.id);
    });
  }
});
```

## ❓ 常见问题

### Q: 如何自定义上传接口？

A: 使用 `chunkUploadTransformer` 和 `mergeChunksTransformer` 自定义请求参数：

```typescript
chunkUploadTransformer: ({ task, chunk }) => {
  // 返回 FormData 或普通对象
  return new FormData();
}
```

### Q: 如何实现秒传功能？

A: upload-v2 **已完全支持秒传功能**！只需配置两个参数：

```typescript
{
  checkFileUrl: '/api/upload/check',  // 秒传检查接口
  enableDeduplication: true            // 启用秒传
}
```

**工作流程**：
1. 自动计算文件 MD5（支持 Web Worker，不阻塞主线程）
2. 调用 `checkFileUrl` 检查文件是否存在
3. 如果存在，直接返回文件 URL，跳过上传
4. 如果不存在，继续正常上传流程

**服务端接口要求**：

请求参数（可通过 `checkFileTransformer` 自定义）：
```json
{
  "fileMD5": "d41d8cd98f00b204e9800998ecf8427e",
  "fileName": "example.jpg",
  "fileSize": 1024000
}
```

响应格式：
```json
{
  "exists": true,                    // 文件是否存在
  "fileUrl": "https://example.com/file.jpg"  // 如果存在，返回文件 URL
}
```

**性能优化**：
- 推荐启用 `useWorker: true`，在后台线程计算 MD5
- 服务端可以缓存 MD5 检查结果，提高响应速度

详细说明请查看 [文件去重（秒传）](#文件去重秒传) 章节。

### Q: 如何监听上传进度？

A: 使用响应式状态或事件监听：

```typescript
// 方式1：使用响应式状态
watch(() => uploader.totalProgress.value, (progress) => {
  console.log('总进度:', progress);
});

// 方式2：使用事件监听
uploader.callbackManager.on('onFileProgress', (task) => {
  console.log('文件进度:', task.progress);
});
```

### Q: 如何处理上传失败？

A: 监听错误事件并重试：

```typescript
uploader.callbackManager.on('onFileError', (task, error) => {
  // 自动重试失败的任务
  uploader.retrySingleFile(task.id);
});
```

### Q: 如何暂停和恢复上传？

A: 使用 `pause`/`pauseAll` 和 `resume`/`resumeAll`：

```typescript
// 暂停所有
await uploader.pauseAll();

// 恢复所有
uploader.resumeAll();
```

### Q: 如何限制文件类型和大小？

A: 使用配置选项：

```typescript
{
  accept: ['.jpg', '.png', '.pdf'],
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxFiles: 50
}
```

## 📝 类型定义

### FileTask

```typescript
interface FileTask {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  speed: number;
  uploadedChunks: number;
  totalChunks: number;
  uploadedSize: number;
  startTime: number | null;
  endTime: number | null;
  pausedTime: number;
  resumeTime: number;
  retryCount: number;
  error: UploadError | null;
  result: ChunkUploadResponse | null;
  chunks: ChunkInfo[];
  fileMD5: string;
  options: FileUploadOptions;
}
```

### UploadStatus

```typescript
enum UploadStatus {
  PENDING = 'pending',      // 等待中
  UPLOADING = 'uploading',  // 上传中
  SUCCESS = 'success',      // 成功
  ERROR = 'error',          // 失败
  PAUSED = 'paused',        // 暂停
  CANCELLED = 'cancelled'   // 取消
}
```

### ChunkInfo

```typescript
interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
  blob: Blob | null;
  status: ChunkStatus;
  retryCount: number;
  uploadTime: number;
  etag?: string;
  hash?: string;
  error?: Error;
  result?: any;
}
```

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请提交 Issue 或联系维护者。

