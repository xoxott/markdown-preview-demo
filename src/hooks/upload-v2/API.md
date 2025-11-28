# upload-v2 API 参考文档

本文档提供 upload-v2 模块的详细 API 参考。

## 目录

- [useChunkUpload](#usechunkupload)
- [UploadOrchestrator](#uploadorchestrator)
- [类型定义](#类型定义)
- [事件系统](#事件系统)
- [工具函数](#工具函数)

## useChunkUpload

主要的 Composition API Hook，提供上传功能。

### 函数签名

```typescript
function useChunkUpload(config?: Partial<UploadConfig>): UploadHookReturn
```

### 返回值

返回一个包含状态、方法和工具函数的对象。

## UploadOrchestrator

上传编排器，负责协调所有服务和管理器。

### 构造函数

```typescript
constructor(config: Partial<UploadConfig>)
```

### 方法

#### addFiles

添加文件到上传队列。

```typescript
addFiles(
  files: File | File[] | FileList,
  options?: FileUploadOptions
): Promise<this>
```

**参数**：
- `files`: 要上传的文件
- `options`: 文件上传选项

**示例**：
```typescript
await uploader.addFiles([file1, file2], {
  priority: 'high',
  category: 'documents'
});
```

#### start

开始上传队列中的文件。

```typescript
start(): Promise<this>
```

#### pause

暂停指定任务。

```typescript
pause(taskId: string): this
```

#### pauseAll

暂停所有上传任务。

```typescript
pauseAll(): Promise<this>
```

#### resume

恢复指定任务。

```typescript
resume(taskId: string): this
```

#### resumeAll

恢复所有暂停的任务。

```typescript
resumeAll(): this
```

#### cancel

取消指定任务。

```typescript
cancel(taskId: string): this
```

#### cancelAll

取消所有任务。

```typescript
cancelAll(): Promise<this>
```

#### retryFailed

重试所有失败的任务。

```typescript
retryFailed(): this
```

#### retrySingleFile

重试单个失败的任务。

```typescript
retrySingleFile(taskId: string): this
```

#### removeFile

从队列中移除文件。

```typescript
removeFile(taskId: string): this
```

#### clear

清空所有文件和状态。

```typescript
clear(): this
```

#### getTask

获取指定任务。

```typescript
getTask(taskId: string): FileTask | undefined
```

#### updateConfig

更新配置。

```typescript
updateConfig(config: Partial<UploadConfig>): this
```

#### destroy

销毁上传器，清理所有资源。

```typescript
destroy(): void
```

## 类型定义

### UploadConfig

上传配置接口。

```typescript
interface UploadConfig {
  // 请求参数转换器
  chunkUploadTransformer?: ChunkUploadTransformer;
  mergeChunksTransformer?: MergeChunksTransformer;
  checkFileTransformer?: CheckFileTransformer;
  
  // 并发控制
  maxConcurrentFiles: number;
  maxConcurrentChunks: number;
  
  // 切片配置
  chunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;
  
  // 重试配置
  maxRetries: number;
  retryDelay: number;
  retryBackoff: number;
  
  // 接口配置
  uploadChunkUrl: string;
  mergeChunksUrl: string;
  checkFileUrl?: string;
  cancelUploadUrl?: string;
  
  // 请求配置
  headers: Record<string, string>;
  timeout: number;
  customParams: Record<string, any>;
  
  // 文件过滤
  accept?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  
  // 功能开关
  enableResume: boolean;
  enableDeduplication: boolean;
  enablePreview: boolean;
  enableCompression: boolean;
  useWorker: boolean;
  enableCache: boolean;
  enableNetworkAdaptation: boolean;
  enableSmartRetry: boolean;
  
  // 压缩和预览配置
  compressionQuality: number;
  previewMaxWidth: number;
  previewMaxHeight: number;
}
```

### FileTask

文件任务接口。

```typescript
interface FileTask {
  id: string;                    // 任务 ID
  file: File;                     // 文件对象
  status: UploadStatus;          // 上传状态
  progress: number;              // 上传进度（0-100）
  speed: number;                  // 上传速度（KB/s）
  uploadedChunks: number;         // 已上传分片数
  totalChunks: number;            // 总分片数
  uploadedSize: number;           // 已上传大小（字节）
  startTime: number | null;       // 开始时间
  endTime: number | null;         // 结束时间
  pausedTime: number;             // 暂停时间
  resumeTime: number;             // 恢复时间
  retryCount: number;             // 重试次数
  error: UploadError | null;      // 错误信息
  result: ChunkUploadResponse | null; // 上传结果
  chunks: ChunkInfo[];            // 分片信息
  fileMD5: string;                // 文件 MD5
  options: FileUploadOptions;     // 上传选项
}
```

### FileUploadOptions

文件上传选项。

```typescript
interface FileUploadOptions {
  category?: string;             // 分类
  tags?: string[];                // 标签
  metadata?: Record<string, any>; // 元数据
  customParams?: Record<string, any>; // 自定义参数
  priority?: 'low' | 'normal' | 'high'; // 优先级
  maxRetries?: number;           // 最大重试次数
  chunkSize?: number;            // 分片大小
}
```

### UploadStatus

上传状态枚举。

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

### ChunkStatus

分片状态枚举。

```typescript
enum ChunkStatus {
  PENDING = 'pending',      // 等待中
  UPLOADING = 'uploading',  // 上传中
  SUCCESS = 'success',      // 成功
  ERROR = 'error',          // 失败
  RETRYING = 'retrying'     // 重试中
}
```

### UploadStats

上传统计信息。

```typescript
interface UploadStats {
  completed: number;        // 已完成数量
  active: number;           // 进行中数量
  pending: number;         // 等待中数量
  failed: number;          // 失败数量
  paused: number;          // 暂停数量
  cancelled: number;       // 取消数量
  total: number;           // 总数量
  totalSize: number;       // 总大小（字节）
  uploadedSize: number;     // 已上传大小（字节）
  averageSpeed: number;    // 平均速度（KB/s）
  estimatedTime: number;   // 预计剩余时间（秒）
  instantSpeed: number;    // 瞬时速度（KB/s）
  networkQuality: string;  // 网络质量
}
```

### UploadError

上传错误类型。

```typescript
class UploadError extends Error {
  type: ErrorType;
  code?: string | number;
  context?: Record<string, any>;
  retryable: boolean;
  cause?: Error;
}
```

## 事件系统

### CallbackManager

回调管理器，用于注册和触发事件。

#### on

注册事件监听器。

```typescript
on<K extends keyof CallbackMap>(
  event: K,
  callback: CallbackMap[K]
): void
```

**可用事件**：
- `onFileProgress`: `(task: FileTask) => void` - 文件上传进度
- `onFileSuccess`: `(task: FileTask, result: ChunkUploadResponse) => void` - 文件上传成功
- `onFileError`: `(task: FileTask, error: UploadError) => void` - 文件上传失败
- `onFilePause`: `(task: FileTask) => void` - 文件暂停
- `onFileResume`: `(task: FileTask) => void` - 文件恢复
- `onFileCancel`: `(task: FileTask) => void` - 文件取消
- `onChunkSuccess`: `(task: FileTask, chunk: ChunkInfo) => void` - 分片上传成功
- `onChunkError`: `(task: FileTask, chunk: ChunkInfo, error: Error) => void` - 分片上传失败
- `onAllComplete`: `(tasks: FileTask[]) => void` - 所有文件完成
- `onAllError`: `(error: Error) => void` - 所有文件失败

**示例**：
```typescript
uploader.callbackManager.on('onFileSuccess', (task, result) => {
  console.log('上传成功:', task.file.name);
});
```

#### once

注册一次性事件监听器。

```typescript
once<K extends keyof CallbackMap>(
  event: K,
  callback: CallbackMap[K]
): void
```

#### off

移除事件监听器。

```typescript
off<K extends keyof CallbackMap>(
  event: K,
  callback?: CallbackMap[K]
): void
```

#### emit

触发事件。

```typescript
emit<K extends keyof CallbackMap>(
  event: K,
  ...args: Parameters<CallbackMap[K]>
): Promise<void>
```

## 工具函数

### 格式化函数

#### formatFileSize

格式化文件大小。

```typescript
function formatFileSize(size: number): string
```

**示例**：
```typescript
formatFileSize(1024 * 1024); // '1.00 MB'
```

#### formatSpeed

格式化上传速度。

```typescript
function formatSpeed(speed: number): string
```

**示例**：
```typescript
formatSpeed(1024); // '1.00 MB/s'
```

#### formatTime

格式化时间。

```typescript
function formatTime(seconds: number): string
```

**示例**：
```typescript
formatTime(3661); // '1小时1分1秒'
```

### 文件类型函数

#### getFileIcon

获取文件图标。

```typescript
function getFileIcon(file: File): string
```

#### getFileColor

获取文件颜色。

```typescript
function getFileColor(file: File): string
```

### 状态映射函数

#### getStatusText

获取状态文本。

```typescript
function getStatusText(status: UploadStatus): string
```

#### getStatusType

获取状态类型。

```typescript
function getStatusType(status: UploadStatus): 'default' | 'success' | 'error' | 'warning'
```

#### convertToNaiveStatus

转换为 Naive UI 状态。

```typescript
function convertToNaiveStatus(status: UploadStatus): 'pending' | 'uploading' | 'finished' | 'error' | 'removed'
```

## 管理器

### StatsManager

统计信息管理器。

#### getTodayStats

获取今日统计信息。

```typescript
getTodayStats(): TodayStats
```

返回：
```typescript
{
  totalFiles: number;
  successFiles: number;
  failedFiles: number;
  totalSize: number;
  uploadedSize: number;
  averageSpeed: number;
}
```

#### getHistoryStats

获取历史统计信息。

```typescript
getHistoryStats(days?: number): HistoryStats
```

返回：
```typescript
{
  days: Array<{
    date: string;
    totalFiles: number;
    successFiles: number;
    failedFiles: number;
    totalSize: number;
    averageSpeed: number;
  }>;
}
```

#### getTrendAnalysis

获取趋势分析。

```typescript
getTrendAnalysis(days?: number): TrendAnalysis
```

返回：
```typescript
{
  uploadTrend: 'up' | 'down' | 'stable';
  speedTrend: 'up' | 'down' | 'stable';
  successRate: number;
}
```

### PerformanceMonitor

性能监控器。

#### start

开始性能监控。

```typescript
start(): void
```

#### stop

停止性能监控。

```typescript
stop(): void
```

#### generateReport

生成性能报告。

```typescript
generateReport(): PerformanceReport
```

#### getMetrics

获取性能指标。

```typescript
getMetrics(): PerformanceMetrics
```

## 国际化

### i18n

国际化工具。

#### setLanguage

设置语言。

```typescript
setLanguage(language: 'zh-CN' | 'en-US'): void
```

#### setCustomTexts

设置自定义文本。

```typescript
setCustomTexts(texts: Partial<{ status: Partial<StatusTextMap> }>): void
```

#### getStatusText

获取状态文本。

```typescript
getStatusText(status: UploadStatus): string
```

#### getErrorMessage

获取错误消息。

```typescript
getErrorMessage(error: UploadError): string
```

## 浏览器兼容性

### BrowserCompat

浏览器兼容性检查。

#### checkCompatibility

检查浏览器兼容性。

```typescript
checkCompatibility(): CompatibilityResult
```

## 配置验证

### validateAndWarnConfig

验证并警告配置。

```typescript
function validateAndWarnConfig(config: Partial<UploadConfig>): void
```

## 常量

### CONSTANTS

全局常量。

```typescript
const CONSTANTS = {
  RETRY: {
    MAX_DELAY: 30000,
    CHUNK_MAX_DELAY: 10000,
    BASE_DELAY: 1000,
    BACKOFF_MULTIPLIER: 1.5,
    MAX_RETRIES: 3
  },
  NETWORK: {
    ADJUST_INTERVAL: 10000,
    POLL_INTERVAL: 50,
    QUALITY_THRESHOLDS: {
      GOOD: 1000,
      FAIR: 100
    }
  },
  UPLOAD: {
    TIMEOUT: 60000,
    CHUNK_SIZE: 2 * 1024 * 1024,
    MIN_CHUNK_SIZE: 512 * 1024,
    MAX_CHUNK_SIZE: 20 * 1024 * 1024,
    MAX_FILESIZE: 1 * 1024 * 1024 * 1024,
    MAX_FILES: 500
  },
  // ...
}
```

