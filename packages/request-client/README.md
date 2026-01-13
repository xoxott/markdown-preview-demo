# @suga/request-client 使用指南

## 概述

`@suga/request-client` 是基于 `@suga/request-core` 构建的 Axios HTTP 请求客户端，支持拦截器、错误处理、请求重试、Loading 提示、日志记录、Token 刷新等功能，**不依赖任何 UI 库**，可在应用层配置。

本库使用 `@suga/request-core` 作为核心基础设施，提供了基于 Axios 的传输层实现和业务层步骤（缓存、重试、熔断等）。

## 核心特性

- ✅ 完整的请求/响应拦截器
- ✅ Token 自动注入和刷新
- ✅ 错误处理机制（可配置 UI 库）
- ✅ Loading 提示（可配置 UI 库）
- ✅ 请求重试（指数退避，支持按错误类型配置）
- ✅ 请求去重（防止重复请求）
- ✅ 请求缓存（内存 + localStorage，支持多种策略）
- ✅ 进度跟踪（上传/下载）
- ✅ 请求取消（支持按 URL 模式、方法、自定义条件）
- ✅ 日志记录（开发环境自动启用）
- ✅ 文件上传/下载
- ✅ 请求适配器抽象（支持切换 HTTP 客户端）
- ✅ 插件系统（支持扩展）
- ✅ 中间件系统（灵活的处理流程）
- ✅ 请求队列和并发控制（支持优先级）
- ✅ 性能监控（统计请求指标）
- ✅ 超时策略优化（按方法、URL 模式配置）
- ✅ 环境适配（自动检测和适配）
- ✅ 配置继承和合并（支持默认配置）
- ✅ 拦截器链优化（动态添加/移除）
- ✅ 请求熔断器（Circuit Breaker，服务异常时自动降级）
- ✅ 超时重试控制（retryOnTimeout，可配置超时错误是否重试）
- ✅ TypeScript 完整支持

## 快速开始

### 1. 基础使用

```typescript
import { createRequestClient } from '@suga/request-client';

// 创建请求实例
const request = createRequest(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

// GET 请求
const data = await request.get<User>('/user/1');

// POST 请求
const result = await request.post('/user', { name: 'John' });

// PUT 请求
await request.put('/user/1', { name: 'Jane' });

// DELETE 请求
await request.delete('/user/1');
```

### 2. 配置 UI 库（必需）

由于库不依赖任何 UI 库，需要在应用层配置 Loading 和错误提示。

#### 使用 TDesign

```typescript
import { loadingManager, errorMessageManager } from '@suga/request-client';
import { MessagePlugin, LoadingPlugin } from 'tdesign-vue-next';

// 配置 Loading 处理器
loadingManager.setHandlers({
  show: () => {
    LoadingPlugin.fullscreen({ loading: true });
  },
  hide: () => {
    LoadingPlugin.fullscreen({ loading: false });
  },
});

// 配置错误消息处理器
errorMessageManager.setHandler((message: string) => {
  MessagePlugin.error(message);
});
```

#### 使用 Element Plus

```typescript
import { loadingManager, errorMessageManager } from '@suga/request-client';
import { ElLoading, ElMessage } from 'element-plus';

let loadingInstance: ReturnType<typeof ElLoading.service> | null = null;

loadingManager.setHandlers({
  show: () => {
    loadingInstance = ElLoading.service({
      fullscreen: true,
      text: '加载中...',
    });
  },
  hide: () => {
    loadingInstance?.close();
    loadingInstance = null;
  },
});

errorMessageManager.setHandler((message: string) => {
  ElMessage.error(message);
});
```

#### 使用 Ant Design Vue

```typescript
import { loadingManager, errorMessageManager } from '@suga/request-client';
import { message } from 'ant-design-vue';

let loadingInstance: ReturnType<typeof message.loading> | null = null;

loadingManager.setHandlers({
  show: () => {
    loadingInstance = message.loading('加载中...', 0);
  },
  hide: () => {
    loadingInstance?.();
    loadingInstance = null;
  },
});

errorMessageManager.setHandler((message: string) => {
  message.error(message);
});
```

#### 使用原生实现

```typescript
import { loadingManager, errorMessageManager } from '@suga/request-client';

// 简单的 Loading 实现
loadingManager.setHandlers({
  show: () => {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = '<div>Loading...</div>';
    loader.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    document.body.appendChild(loader);
  },
  hide: () => {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.remove();
    }
  },
});

// 简单的错误提示实现
errorMessageManager.setHandler((message: string) => {
  alert(message); // 或使用自定义的 Toast 组件
});
```

### 3. 配置 Token 刷新（可选）

```typescript
import { configureTokenRefresh } from '@suga/request-client';

// 配置 Token 刷新
configureTokenRefresh({
  refreshTokenUrl: '/api/auth/refresh',
  refreshTokenMethod: 'POST',
  refreshTokenParamKey: 'refreshToken',
  tokenKeyInResponse: 'token',
  refreshTokenKeyInResponse: 'refreshToken',
  onRefreshSuccess: (token: string, refreshToken: string) => {
    // 刷新成功后的回调（可选）
    console.log('Token 刷新成功');
  },
  onRefreshFailed: () => {
    // 刷新失败后的回调（可选）
    // 可以在这里跳转到登录页
    window.location.href = '/login';
  },
});
```

## 高级功能

### 请求配置

```typescript
// 禁用 Loading
await request.get('/api/data', {}, { loading: false });

// 禁用错误提示
await request.get('/api/data', {}, { showError: false });

// 启用重试（指数退避）
await request.get(
  '/api/data',
  {},
  {
    retry: true,
    retryCount: 3, // 最多重试 3 次
    retryOnTimeout: true, // 超时时也重试（可选，默认 false）
  },
);

// 请求去重（相同请求在时间窗口内只发送一次）
await request.get('/api/data', {}, { dedupe: true });

// 启用缓存（仅 GET 请求）
await request.get(
  '/api/data',
  {},
  {
    cache: true,
    cacheExpireTime: 5 * 60 * 1000, // 缓存 5 分钟（可选，默认 5 分钟）
  },
);

// 取消请求
const requestId = 'unique-request-id';
request.get('/api/data', {}, { requestId });
// 稍后取消
request.cancel(requestId);

// 跳过错误处理（自行处理）
try {
  await request.get('/api/data', {}, { skipErrorHandler: true });
} catch (error) {
  // 自定义错误处理
}

// 跳过 Token 刷新（遇到 401 时不自动刷新）
await request.get('/api/data', {}, { skipTokenRefresh: true });

// 禁用日志（覆盖全局配置）
await request.get('/api/data', {}, { logEnabled: false });
```

### 请求重试

```typescript
import { retryRequest, shouldRetry } from '@suga/request-client';

// 自动重试配置（在请求配置中）
await request.get(
  '/api/data',
  {},
  {
    retry: true,
    retryCount: 3, // 默认 3 次
    retryOnTimeout: true, // 超时时也重试（可选，默认 false）
  },
);

// 手动使用重试函数
const result = await retryRequest(() => request.get('/api/data'), { retryCount: 5 });

// 自定义重试判断逻辑
if (shouldRetry(error)) {
  // 可以重试
}
```

重试机制会自动处理以下情况：

- 网络错误（无响应）
- 5xx 服务器错误
- 408 请求超时（需要设置 `retryOnTimeout: true`）
- 429 请求过多

**超时重试控制**：

默认情况下，超时错误（408）不会触发重试。如果需要在超时时也重试，可以设置 `retryOnTimeout: true`：

```typescript
await request.get(
  '/api/data',
  {},
  {
    retry: true,
    retryOnTimeout: true, // 超时时也重试
  },
);
```

### 请求去重

```typescript
import { configureRequestDedupe, requestDedupeManager } from '@suga/request-client';

// 配置请求去重时间窗口（可选，默认 1000ms）
configureRequestDedupe({
  dedupeWindow: 2000, // 2 秒内相同请求只发送一次
});

// 在请求中启用去重
await request.get('/api/search', { keyword: 'test' }, { dedupe: true });

// 手动清除所有待处理的重复请求
requestDedupeManager.clear();
```

### 请求缓存

```typescript
import { configureRequestCache, requestCacheManager } from '@suga/request-client';

// 配置请求缓存（可选）
configureRequestCache({
  defaultExpireTime: 5 * 60 * 1000, // 默认过期时间 5 分钟
  useLocalStorage: true, // 启用 localStorage 持久化
  localStoragePrefix: 'api_cache_', // localStorage 键前缀
});

// 在请求中启用缓存
await request.get(
  '/api/user/1',
  {},
  {
    cache: true,
    cacheExpireTime: 10 * 60 * 1000, // 缓存 10 分钟（可选）
  },
);

// 手动管理缓存
requestCacheManager.set(config, data, expireTime); // 设置缓存
const cached = requestCacheManager.get(config); // 获取缓存
requestCacheManager.delete(config); // 删除缓存
requestCacheManager.clear(); // 清空所有缓存
requestCacheManager.cleanup(); // 清理过期缓存

// 获取缓存统计
const stats = requestCacheManager.getStats();
console.log(stats); // { memoryCount: 10, storageCount: 5 }
```

### 日志记录

```typescript
import { configureLogger, loggerManager } from '@suga/request-client';

// 配置日志（可选）
configureLogger({
  enabled: true, // 全局启用/禁用日志
  logRequest: true, // 是否记录请求日志
  logResponse: true, // 是否记录响应日志
  logError: true, // 是否记录错误日志
});

// 默认行为：
// - 开发环境：自动启用日志
// - 生产环境：自动禁用日志

// 单次请求禁用日志
await request.get('/api/data', {}, { logEnabled: false });

// 手动记录日志
import { logRequest, logResponse, logError } from '@suga/request-client';
logRequest(config, true);
logResponse(response, true);
logError(error, true);
```

### 进度跟踪

```typescript
// 上传进度
await request.upload('/api/upload', file, {
  onUploadProgress: progressEvent => {
    const percent = (progressEvent.loaded / progressEvent.total) * 100;
    console.log(`上传进度: ${percent}%`);
  },
});

// 下载进度
await request.download('/api/export', {}, 'report.xlsx', {
  onDownloadProgress: progressEvent => {
    const percent = (progressEvent.loaded / progressEvent.total) * 100;
    console.log(`下载进度: ${percent}%`);
  },
});

// 使用进度跟踪工具
import { createProgressTracker, formatFileSize, formatSpeed } from '@suga/request-client';

const tracker = createProgressTracker({
  onProgress: (percent, loaded, total, speed) => {
    console.log(`进度: ${percent}%`);
    console.log(`已传输: ${formatFileSize(loaded)} / ${formatFileSize(total)}`);
    console.log(`速度: ${formatSpeed(speed)}`);
  },
});

await request.upload('/api/upload', file, {
  onUploadProgress: tracker.update,
});
```

### 文件上传

```typescript
// 上传单个文件
const file = document.querySelector('input[type="file"]').files[0];
const result = await request.upload('/api/upload', file);

// 上传多个文件
const formData = new FormData();
formData.append('file1', file1);
formData.append('file2', file2);
formData.append('description', '文件描述');
const result = await request.upload('/api/upload', formData);

// 带进度跟踪的上传
await request.upload('/api/upload', file, {
  onUploadProgress: progressEvent => {
    const percent = (progressEvent.loaded / progressEvent.total) * 100;
    updateProgressBar(percent);
  },
});
```

### 文件下载

```typescript
// 下载文件
await request.download('/api/export', { type: 'excel' }, 'report.xlsx');

// 带进度跟踪的下载
await request.download('/api/export', {}, 'report.xlsx', {
  onDownloadProgress: progressEvent => {
    const percent = (progressEvent.loaded / progressEvent.total) * 100;
    updateProgressBar(percent);
  },
});
```

### 自定义错误处理

```typescript
// 全局错误处理
import { globalErrorHandlerManager } from '@suga/request-client';

globalErrorHandlerManager.setErrorHandler(async (error, errorResponse) => {
  // 自定义全局错误处理逻辑
  if (errorResponse.code === 'CUSTOM_ERROR_CODE') {
    // 处理特定业务错误
    return true; // 返回 true 表示已处理，不再执行默认处理
  }
  return false; // 返回 false 继续执行默认处理
});

// 错误日志记录
globalErrorHandlerManager.setErrorLogger((error, errorResponse) => {
  // 发送错误日志到服务器
  fetch('/api/log/error', {
    method: 'POST',
    body: JSON.stringify({ error, errorResponse }),
  });
});

// 单次请求自定义错误处理
await request.get(
  '/api/data',
  {},
  {
    onError: (error, errorResponse) => {
      // 单次请求的错误处理
      if (errorResponse.code === 'SPECIFIC_ERROR') {
        // 处理特定错误
        return true; // 已处理，不再执行默认处理
      }
      return false; // 继续执行默认处理
    },
  },
);
```

### 请求熔断器

```typescript
import { circuitBreakerManager, CircuitBreakerState } from '@suga/request-client';

// 在请求中启用熔断器
await request.get(
  '/api/unstable-service',
  {},
  {
    circuitBreaker: {
      failureThreshold: 5, // 连续失败 5 次后开启熔断
      timeout: 60000, // 熔断开启后 60 秒进入半开状态
      successThreshold: 2, // 半开状态下成功 2 次后关闭熔断
      fallback: () => {
        // 降级数据
        return { data: [], message: '服务暂时不可用，已返回降级数据' };
      },
    },
  },
);

// 手动管理熔断器
const breaker = circuitBreakerManager.getOrCreateBreaker('api-key', {
  failureThreshold: 5,
  timeout: 60000,
});

// 检查熔断器状态
const state = breaker.getState();
if (state === CircuitBreakerState.OPEN) {
  console.log('熔断器已开启，请求将被拒绝');
}

// 获取熔断器统计信息
const stats = breaker.getStats();
console.log('失败次数:', stats.failures);
console.log('当前状态:', stats.state);
```

熔断器状态说明：

- **CLOSED（关闭）**：正常处理请求
- **OPEN（开启）**：拒绝请求，直接返回降级数据
- **HALF_OPEN（半开）**：尝试恢复，允许少量请求通过

### 请求取消

```typescript
// 取消单个请求
const requestId = 'unique-request-id';
const promise = request.get('/api/data', {}, { requestId });
// 稍后取消
request.cancel(requestId);

// 取消所有请求
request.cancelAll('页面切换');

// 手动管理取消 Token
import { cancelTokenManager, generateRequestId } from '@suga/request-client';

const requestId = generateRequestId();
const cancelToken = cancelTokenManager.getOrCreate(requestId);
// 取消请求
cancelTokenManager.cancel(requestId);
// 移除取消 Token
cancelTokenManager.remove(requestId);
// 清除所有取消 Token
cancelTokenManager.clear();
```

### Loading 管理

```typescript
import { loadingManager, showLoading, hideLoading, resetLoading } from '@suga/request-client';

// 手动显示/隐藏 Loading
showLoading();
hideLoading();

// 重置 Loading（清空计数器）
resetLoading();

// 获取当前 Loading 状态
const isShowing = loadingManager.isShowing();
const count = loadingManager.getCount();

// 配置 Loading 延迟显示（可选）
import { loadingManager } from '@suga/request-client';

// Loading 会在 200ms 后才显示，避免闪烁
loadingManager.setHandlers({
  show: () => {
    /* ... */
  },
  hide: () => {
    /* ... */
  },
  delay: 200, // 延迟显示时间（毫秒）
});
```

## 完整示例

```typescript
// 1. 应用入口配置（main.ts 或 app.ts）
import {
  createRequest,
  loadingManager,
  errorMessageManager,
  configureTokenRefresh,
  configureLogger,
} from '@suga/request-client';
import { MessagePlugin, LoadingPlugin } from 'tdesign-vue-next';

// 配置 Loading
loadingManager.setHandlers({
  show: () => LoadingPlugin.fullscreen({ loading: true }),
  hide: () => LoadingPlugin.fullscreen({ loading: false }),
  delay: 200,
});

// 配置错误提示
errorMessageManager.setHandler((message: string) => {
  MessagePlugin.error(message);
});

// 配置 Token 刷新
configureTokenRefresh({
  refreshTokenUrl: '/api/auth/refresh',
  onRefreshFailed: () => {
    window.location.href = '/login';
  },
});

// 配置日志（可选）
configureLogger({
  enabled: import.meta.env.DEV, // 开发环境启用
  logRequest: true,
  logResponse: true,
  logError: true,
});

// 2. 创建请求实例
const request = createRequest(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

// 3. 使用请求
export async function getUser(id: number) {
  return request.get<User>(
    `/user/${id}`,
    {},
    {
      cache: true, // 启用缓存
      cacheExpireTime: 5 * 60 * 1000, // 缓存 5 分钟
    },
  );
}

export async function createUser(data: CreateUserDto) {
  return request.post<User>('/user', data, {
    loading: true, // 显示 Loading
    showError: true, // 显示错误提示
  });
}

export async function uploadAvatar(file: File) {
  return request.upload<{ url: string }>('/user/avatar', file, {
    onUploadProgress: progressEvent => {
      const percent = (progressEvent.loaded / progressEvent.total) * 100;
      console.log(`上传进度: ${percent}%`);
    },
  });
}

export async function searchUsers(keyword: string) {
  return request.get<User[]>(
    '/user/search',
    { keyword },
    {
      dedupe: true, // 启用去重，防止重复请求
      retry: true, // 启用重试
      retryCount: 2,
    },
  );
}
```

## 类型定义

```typescript
import type {
  ApiResponse,
  PageResponse,
  PageData,
  ErrorResponse,
  RequestConfig,
  RequestMethod,
} from '@suga/request-client';

// 标准 API 响应格式
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  success?: boolean;
  timestamp?: number;
}

// 分页响应
interface PageResponse<T> {
  code: number;
  message: string;
  data: {
    list: T[];
    total: number;
    current: number;
    size: number;
    pages?: number;
  };
}

// 错误响应
interface ErrorResponse {
  code: string | number;
  message: string;
  data?: unknown;
}

// 请求配置
interface RequestConfig extends AxiosRequestConfig {
  loading?: boolean; // 是否显示 Loading
  showError?: boolean; // 是否显示错误提示
  retry?: boolean; // 是否重试
  retryCount?: number; // 重试次数
  retryOnTimeout?: boolean; // 超时时是否重试
  cancelable?: boolean; // 是否可取消
  circuitBreaker?: CircuitBreakerOptions; // 熔断器配置
  requestId?: string; // 请求标识
  skipErrorHandler?: boolean; // 是否跳过错误处理
  skipTokenRefresh?: boolean; // 是否跳过 Token 刷新
  dedupe?: boolean; // 是否启用去重
  cache?: boolean; // 是否使用缓存（仅 GET）
  cacheExpireTime?: number; // 缓存过期时间
  logEnabled?: boolean; // 是否启用日志
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void; // 上传进度
  onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void; // 下载进度
  onError?: (
    error: AxiosError<ErrorResponse>,
    errorResponse: ErrorResponse,
  ) => boolean | void | Promise<boolean | void>; // 自定义错误处理
}
```

## 最佳实践

1. **在应用入口配置 UI 库处理器**：确保在使用 API 之前配置好 Loading 和错误提示处理器

2. **统一错误处理**：使用 `errorMessageManager.setHandler` 统一配置错误提示，避免重复代码

3. **合理使用 Loading**：对于快速请求（< 200ms），可以考虑禁用 Loading 避免闪烁，或配置延迟显示

4. **请求去重**：对于可能重复触发的请求（如搜索、刷新），使用 `dedupe: true` 实现去重

5. **合理使用缓存**：对于不经常变化的数据，使用缓存可以减少请求次数，提升用户体验

6. **错误处理**：对于特殊业务错误，使用 `onError` 或 `skipErrorHandler` 自行处理

7. **Token 刷新**：配置 Token 刷新机制，确保用户在 Token 过期时能够自动刷新，无需重新登录

8. **日志记录**：生产环境建议禁用日志，或配置日志记录到服务器

## 注意事项

- ⚠️ **必须在应用初始化时配置 Loading 和错误提示处理器**，否则相关功能无法正常工作
- ⚠️ Loading 管理器支持并发请求计数，会自动处理多个请求的显示/隐藏
- ⚠️ 错误处理默认只输出到控制台，需要配置处理器才能显示 UI 提示
- ⚠️ Token 存储在 localStorage 中，key 为 `app_token`（可通过常量 `TOKEN_KEY` 获取）
- ⚠️ 请求缓存仅对 GET 请求有效，其他请求方法会被忽略
- ⚠️ 请求去重基于 URL + Method + Params，确保参数正确序列化
- ⚠️ Token 刷新机制会自动处理 401 错误，但需要确保刷新接口可用
- ⚠️ 日志功能默认在开发环境启用，生产环境禁用，可通过 `configureLogger` 自定义
- ⚠️ 插件系统：插件名称必须唯一，重复安装同名插件会被忽略
- ⚠️ 中间件系统：中间件按添加顺序执行，注意执行顺序的影响
- ⚠️ 请求队列：队列策略为 `priority` 时，高优先级请求会优先执行
- ⚠️ 性能监控：性能监控器会自动记录所有请求，注意内存使用
- ⚠️ 超时策略：URL 模式匹配按添加顺序，第一个匹配的模式会被使用
- ⚠️ 配置继承：默认配置会与请求配置深度合并，数组和对象会合并而非替换

## 常量

```typescript
import {
  TOKEN_KEY, // Token 存储键名: 'app_token'
  REFRESH_TOKEN_KEY, // 刷新 Token 存储键名: 'app_refresh_token'
  DEFAULT_TIMEOUT, // 默认请求超时: 10000ms
  DEFAULT_RETRY_COUNT, // 默认重试次数: 3
  DEFAULT_RETRY_DELAY, // 默认重试延迟: 1000ms
  HttpStatus, // HTTP 状态码枚举
  ContentType, // 内容类型枚举
  ERROR_MESSAGE_MAP, // 错误消息映射
  DEFAULT_RETRY_CONFIG, // 重试配置常量
  DEFAULT_CACHE_CONFIG, // 缓存配置常量
  DEFAULT_TOKEN_REFRESH_CONFIG, // Token 刷新配置常量
  CircuitBreakerState, // 熔断器状态枚举
} from '@suga/request-client';
```
