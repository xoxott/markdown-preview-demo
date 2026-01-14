# @suga/request-progress

请求进度跟踪工具，提供上传和下载进度的跟踪功能。

## 📦 安装

```bash
pnpm add @suga/request-progress
```

## 🚀 快速开始

### 基本使用

```typescript
import { createProgressTracker } from '@suga/request-progress';

// 创建进度追踪器
const tracker = createProgressTracker((progress) => {
  console.log(`进度: ${progress.percent}%`);
  console.log(`已传输: ${progress.loaded} / ${progress.total}`);
  console.log(`速度: ${progress.speed}`);
  console.log(`耗时: ${progress.elapsed}ms`);
});

// 在请求中使用
const config = {
  url: '/api/upload',
  method: 'POST',
  data: formData,
  onUploadProgress: tracker, // 使用追踪器
};
```

### 使用 ProgressTracker 类

```typescript
import { ProgressTracker } from '@suga/request-progress';

const tracker = new ProgressTracker((progress) => {
  console.log(`进度: ${progress.percent}%`);
});

// 更新进度
tracker.update({ loaded: 1024, total: 10240 });

// 重置追踪器
tracker.reset();
```

### 工具函数

```typescript
import { calculateProgress, formatFileSize, formatSpeed } from '@suga/request-progress';

// 计算进度百分比
const percent = calculateProgress({ loaded: 5120, total: 10240 }); // 50

// 格式化文件大小
const size = formatFileSize(1024 * 1024); // "1 MB"

// 格式化速度
const speed = formatSpeed(1024 * 1024, 1000); // "1 MB/s"
```

## 📚 API

### ProgressTracker

进度追踪器类。

#### 构造函数

```typescript
constructor(onProgress?: ProgressCallback)
```

#### 方法

- `update(progressEvent: ProgressEvent)`: 更新进度
- `reset()`: 重置追踪器

### createProgressTracker

创建进度追踪器的工厂函数。

```typescript
function createProgressTracker(onProgress?: ProgressCallback): (progressEvent: ProgressEvent) => void
```

### 工具函数

- `calculateProgress(progressEvent: ProgressEvent)`: 计算进度百分比 (0-100)
- `formatFileSize(bytes: number)`: 格式化文件大小（如 "1.5 MB"）
- `formatSpeed(bytes: number, elapsedTime: number)`: 格式化传输速度（如 "1.5 MB/s"）

### 类型定义

```typescript
// 进度事件数据
interface ProgressEvent {
  loaded: number;  // 已传输字节数
  total: number;   // 总字节数（如果未知则为 0）
}

// 进度信息
interface ProgressInfo {
  percent: number;  // 进度百分比 (0-100)
  loaded: number;   // 已传输字节数
  total: number;    // 总字节数
  speed: string;    // 传输速度（格式化字符串，如 "1.5 MB/s"）
  elapsed: number;  // 已用时间（毫秒）
}

// 进度回调函数
type ProgressCallback = (progress: ProgressInfo) => void;
```

## 📝 使用示例

### 示例 1：上传进度跟踪

```typescript
import { createProgressTracker, formatFileSize } from '@suga/request-progress';

const uploadTracker = createProgressTracker((progress) => {
  console.log(`上传进度: ${progress.percent}%`);
  console.log(`已上传: ${formatFileSize(progress.loaded)} / ${formatFileSize(progress.total)}`);
  console.log(`速度: ${progress.speed}`);
});

// 在请求配置中使用
const config = {
  url: '/api/upload',
  method: 'POST',
  data: file,
  onUploadProgress: uploadTracker,
};
```

### 示例 2：下载进度跟踪

```typescript
import { createProgressTracker, formatFileSize } from '@suga/request-progress';

const downloadTracker = createProgressTracker((progress) => {
  console.log(`下载进度: ${progress.percent}%`);
  console.log(`已下载: ${formatFileSize(progress.loaded)} / ${formatFileSize(progress.total)}`);
  console.log(`速度: ${progress.speed}`);
});

// 在请求配置中使用
const config = {
  url: '/api/download',
  method: 'GET',
  onDownloadProgress: downloadTracker,
};
```

### 示例 3：进度条显示

```typescript
import { createProgressTracker } from '@suga/request-progress';

const tracker = createProgressTracker((progress) => {
  // 更新进度条
  progressBar.style.width = `${progress.percent}%`;
  progressText.textContent = `${progress.percent}%`;
  speedText.textContent = progress.speed;
});
```

### 示例 4：多个文件上传

```typescript
import { ProgressTracker } from '@suga/request-progress';

const files = [file1, file2, file3];
const trackers = files.map((file, index) => {
  return new ProgressTracker((progress) => {
    console.log(`文件 ${index + 1} 进度: ${progress.percent}%`);
  });
});

// 为每个文件使用对应的追踪器
// 注意：uploadFile 是一个示例函数，实际使用时需要根据你的请求库进行适配
files.forEach((file, index) => {
  uploadFile(file, {
    onUploadProgress: (event) => trackers[index].update(event),
  });
});
```

### 示例 5：格式化显示

```typescript
import { formatFileSize, formatSpeed } from '@suga/request-progress';

const tracker = createProgressTracker((progress) => {
  const display = {
    percent: `${progress.percent}%`,
    loaded: formatFileSize(progress.loaded),
    total: formatFileSize(progress.total),
    speed: progress.speed,
    elapsed: `${(progress.elapsed / 1000).toFixed(1)}s`,
  };

  console.log(`${display.percent} - ${display.loaded} / ${display.total} @ ${display.speed} (${display.elapsed})`);
});
```

## 🏗️ 架构

```
request-progress/
├── src/
│   ├── types.ts                  # 类型定义
│   ├── utils.ts                  # 工具函数
│   ├── ProgressTracker.ts        # 进度追踪器
│   └── index.ts                  # 入口文件
```

## 🔧 实现细节

1. **进度计算**：基于已传输字节数和总字节数计算百分比
2. **速度计算**：基于最近一次的变化计算瞬时速度
3. **格式化**：自动格式化文件大小和速度，便于显示
4. **通用性**：不依赖特定的 HTTP 库，可以适配任何支持进度事件的传输层

## 📄 License

MIT

