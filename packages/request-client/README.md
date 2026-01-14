# @suga/request-client

基于 Axios 的 HTTP 请求客户端，构建在 `@suga/request-core` 之上，整合了缓存、重试、熔断、去重、队列、事件、性能监控、日志、进度等完整的请求功能。

## 特性

- ✅ **开箱即用**：整合所有 `@suga/request-*` 功能包，无需手动配置
- ✅ **统一配置**：所有配置（Axios + 业务层）都可以放在一个对象中，TypeScript 自动处理类型
- ✅ **Axios 适配**：完整支持所有 `AxiosRequestConfig` 字段，不丢失任何功能
- ✅ **功能丰富**：缓存、重试、熔断、去重、队列、事件、性能监控、日志、进度
- ✅ **类型安全**：完整的 TypeScript 支持，所有步骤配置都有完整的类型定义
- ✅ **可扩展**：基于 Step 架构，易于扩展和定制
- ✅ **业务无关**：不包含业务逻辑，专注于请求基础设施

## 安装

```bash
pnpm add @suga/request-client
# 或
npm install @suga/request-client
# 或
yarn add @suga/request-client
```

## 快速开始

### 基础使用

```typescript
import { createRequestClient } from '@suga/request-client';

// 创建请求客户端（所有配置都在一个对象中）
const client = createRequestClient({
  baseURL: '/api',
  timeout: 10000,
});

// GET 请求
const user = await client.get<User>('/user/1');

// POST 请求
const result = await client.post('/user', { name: 'John' });

// PUT 请求
const updated = await client.put('/user/1', { name: 'Jane' });

// DELETE 请求
await client.delete('/user/1');

// PATCH 请求
const patched = await client.patch('/user/1', { name: 'Bob' });
```

### 使用自定义 Axios 配置

```typescript
import { createRequestClient } from '@suga/request-client';

// 所有配置都可以放在一个对象中
const client = createRequestClient({
  // Axios 配置（所有 AxiosRequestConfig 字段都可以使用）
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Authorization': 'Bearer token',
      'X-Custom-Header': 'value',
    },
  params: { foo: 'bar' },
  responseType: 'json',
  // ... 其他所有 AxiosRequestConfig 字段
});
```

## 功能配置

### 缓存

启用缓存功能，自动缓存 GET 请求的响应：

```typescript
// 启用缓存（默认过期时间）
const data = await client.get('/data', undefined, {
  cache: true,
});

// 自定义缓存过期时间（毫秒）
const data = await client.get('/data', undefined, {
  cache: true,
  cacheExpireTime: 60000, // 60秒
});
```

### 重试

自动重试失败的请求：

```typescript
import type { RetryConfig } from '@suga/request-client';

// 启用重试（使用 RetryConfig 对象）
const data = await client.get('/data', undefined, {
  retry: {
  retry: true,
    retryCount: 3,
    retryOnTimeout: false,
  },
});

// 或者使用简写（boolean）- 使用默认重试配置
const data2 = await client.get('/data', undefined, {
  retry: true,
});
```

**全局配置：** 可以在创建客户端时设置全局重试策略：

```typescript
import type { RetryStrategy } from '@suga/request-client';

const client = createRequestClient({
  baseURL: '/api',
  // 全局重试策略
  retryStrategy: {
    enabled: true,
    maxRetries: 3,
    retryDelay: (attempt) => attempt * 1000,
    shouldRetry: (error) => true,
  },
});
```

### 熔断器

在服务异常时自动降级或阻止请求：

```typescript
import type { CircuitBreakerOptions } from '@suga/request-client';

const circuitBreakerOptions: CircuitBreakerOptions = {
  failureThreshold: 5, // 失败阈值
  successThreshold: 2, // 成功阈值
  timeout: 60000, // 超时时间（毫秒）
  resetTimeout: 30000, // 重置超时时间（毫秒）
};

const data = await client.get('/data', undefined, {
  circuitBreaker: circuitBreakerOptions,
});
```

### 去重

自动去重相同的并发请求：

```typescript
import type { DedupeOptions } from '@suga/request-client';

// 启用去重（使用 DedupeOptions 对象）
const data = await client.get('/data', undefined, {
  dedupe: {
    dedupeWindow: 1000, // 去重时间窗口（毫秒）
    strategy: 'exact', // 去重策略：'exact' | 'ignore-params' | 'custom'
  },
});

// 或者使用简写（boolean）
const data2 = await client.get('/data', undefined, {
  dedupe: true, // 使用默认去重配置
});
```

**全局配置：** 可以在创建客户端时设置全局去重配置：

```typescript
const client = createRequestClient({
  baseURL: '/api',
  // 全局去重配置
  dedupeConfig: {
    dedupeWindow: 1000,
    strategy: 'exact',
  },
});
```

### 队列

控制并发请求数量：

```typescript
import type { QueueConfig } from '@suga/request-client';

// 单个请求的队列配置
const data = await client.get('/data', undefined, {
  queue: {
    maxConcurrent: 5, // 最大并发数
    queueStrategy: 'fifo', // 队列策略：'fifo' | 'priority'
  },
  priority: 10, // 请求优先级（数字越大优先级越高）
});
```

**全局配置：** 可以在创建客户端时设置全局队列配置：

```typescript
const client = createRequestClient({
  baseURL: '/api',
  // 全局队列配置
  queueConfig: {
    maxConcurrent: 5,
    queueStrategy: 'fifo',
  },
});
```

### 日志

启用请求日志：

```typescript
import type { LoggerOptions } from '@suga/request-client';

// 单个请求的日志配置
const data = await client.get('/data', undefined, {
  logEnabled: true,
  logger: {
    enabled: true,
    logRequest: true,
    logResponse: true,
    logError: true,
  },
});
```

### 进度监控

监控上传和下载进度：

```typescript
import { createProgressTracker } from '@suga/request-client';

// 使用进度追踪器（推荐，提供更多信息）
const uploadTracker = createProgressTracker((progress) => {
  console.log(`上传进度: ${progress.percent}%`);
  console.log(`速度: ${progress.speed}`);
  console.log(`已传输: ${progress.loaded} / ${progress.total}`);
  console.log(`耗时: ${progress.elapsed}ms`);
});

await client.post('/upload', formData, {
  onUploadProgress: uploadTracker,
});

// 或者使用自定义回调
await client.post('/upload', formData, {
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`上传进度: ${percentCompleted}%`);
  },
});

// 下载进度
const downloadTracker = createProgressTracker((progress) => {
  console.log(`下载进度: ${progress.percent}%`);
});

await client.get('/download', undefined, {
  onDownloadProgress: downloadTracker,
});
```

### 请求取消

取消正在进行的请求：

```typescript
import { cancelTokenManager, generateRequestId } from '@suga/request-client';
import type { CancelOptions } from '@suga/request-client';

// 单个请求的取消配置
const data = await client.get('/data', undefined, {
  cancelable: {
    enabled: true,
    autoCancelPrevious: true, // 自动取消相同 requestId 的旧请求
  },
  requestId: 'unique-request-id',
});

// 或者使用简写（boolean）
const data2 = await client.get('/data', undefined, {
  cancelable: true, // 使用默认取消配置
  requestId: generateRequestId(),
});

// 取消请求
cancelTokenManager.cancel('unique-request-id');
```

**全局配置：** 可以在创建客户端时设置全局取消配置：

```typescript
const client = createRequestClient({
  baseURL: '/api',
  // 全局取消配置
  cancelConfig: {
    enabled: true,
    autoCancelPrevious: true,
  },
});
```

### 事件监听

监听请求生命周期事件：

```typescript
import {
  onRequestStart,
  onRequestSuccess,
  onRequestError,
  onRequestComplete,
} from '@suga/request-client';

// 监听请求开始
onRequestStart((event) => {
  console.log('请求开始:', event.url);
});

// 监听请求成功
onRequestSuccess((event) => {
  console.log('请求成功:', event.data);
});

// 监听请求错误
onRequestError((event) => {
  console.error('请求失败:', event.error);
});

// 监听请求完成（无论成功或失败）
onRequestComplete((event) => {
  console.log('请求完成:', event.duration);
});

// 移除监听器
import { offRequestStart } from '@suga/request-client';
offRequestStart(handler);
```

### 性能监控

监控请求性能指标：

```typescript
import { performanceMonitor } from '@suga/request-client';

// 获取性能指标
const metrics = performanceMonitor.getMetrics();
console.log('平均响应时间:', metrics.averageResponseTime);
console.log('请求总数:', metrics.totalRequests);
console.log('成功请求数:', metrics.successfulRequests);
console.log('失败请求数:', metrics.failedRequests);

// 重置指标
performanceMonitor.reset();
```

## 完整配置示例

### 创建客户端（全局配置）

```typescript
import { createRequestClient } from '@suga/request-client';
import type { RequestConfig } from '@suga/request-client';
import { RequestCacheManager } from '@suga/request-cache';
import { LoggerManager } from '@suga/request-logger';

// 创建缓存管理器
const cacheManager = new RequestCacheManager({
  defaultExpireTime: 60000,
});

// 创建日志管理器
const loggerManager = new LoggerManager({
  enabled: true,
  logRequest: true,
  logResponse: true,
  logError: true,
});

// 创建客户端（所有配置都在一个对象中）
const client = createRequestClient({
  // ========== Axios 配置 ==========
  baseURL: '/api',
  timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    'Authorization': 'Bearer token',
  },
  params: { version: 'v1' },
  responseType: 'json',
  // ... 其他所有 AxiosRequestConfig 字段都可以使用

  // ========== 步骤配置（全局默认配置）==========
  // 队列配置
  queueConfig: {
    maxConcurrent: 5,
    queueStrategy: 'fifo',
  },

  // 去重配置
  dedupeConfig: {
    dedupeWindow: 1000,
    strategy: 'exact',
  },

  // 取消配置
  cancelConfig: {
    enabled: true,
    autoCancelPrevious: true,
  },

  // 日志配置
  loggerConfig: {
    enabled: true,
    logRequest: true,
    logResponse: true,
    logError: true,
  },
  // 或者使用自定义日志管理器
  // loggerManager: loggerManager,

  // 缓存步骤配置
  cacheReadStepOptions: {
    requestCacheManager: cacheManager,
  },
  cacheWriteStepOptions: {
    requestCacheManager: cacheManager,
  },

  // ========== 全局默认配置（单个请求的配置）==========
  defaultConfig: {
  // 缓存配置
  cache: true,
  cacheExpireTime: 60000,

  // 重试配置
    retry: {
  retry: true,
  retryCount: 3,
  retryOnTimeout: false,
    },

  // 去重配置
  dedupe: true,

    // 取消配置
    cancelable: true,

    // 日志配置
    logEnabled: true,
    logger: {
      enabled: true,
      logRequest: true,
      logResponse: true,
      logError: true,
    },

  // 队列配置
  queue: {
    maxConcurrent: 5,
      queueStrategy: 'fifo',
    },

    // 全局 headers
    headers: {
      'X-Custom-Header': 'value',
    },
  },
});

// ========== 使用示例 ==========

// 1. 使用全局配置
const data1 = await client.get('/data'); // 自动应用所有全局配置

// 2. 单个请求覆盖全局配置
const data2 = await client.get('/data', undefined, {
  cache: true,
  cacheExpireTime: 30000, // 覆盖全局缓存时间
  retry: {
    retry: true,
    retryCount: 5, // 覆盖全局重试次数
  },
});

// 3. 深度合并示例（嵌套对象会被合并）
const data3 = await client.get('/data', undefined, {
  logger: {
    enabled: false, // 只覆盖 enabled，其他 logger 配置保留
  },
  headers: {
    'X-Request-ID': '123', // 与全局 headers 合并
  },
});
```

## 配置层次结构

`@suga/request-client` 的配置分为三个层次：

1. **步骤配置**（`queueConfig`、`dedupeConfig` 等）：传递给各个 Step 的全局默认配置
2. **全局默认配置**（`defaultConfig`）：单个请求的全局默认配置，会被单个请求配置覆盖
3. **单个请求配置**：在调用 `client.get/post` 等方法时传入的配置，优先级最高

### 配置优先级

```
单个请求配置 > 全局默认配置（defaultConfig）> 步骤配置
```

## 全局配置

`@suga/request-client` 支持在创建客户端时设置全局默认配置。所有请求会自动应用全局配置，单个请求的配置会覆盖全局配置：

```typescript
import { createRequestClient } from '@suga/request-client';

// 创建客户端并设置全局默认配置（所有配置都在一个对象中）
const client = createRequestClient({
  // Axios 配置
    baseURL: '/api',
    timeout: 10000,

  // 步骤配置（全局默认配置）
  queueConfig: {
    maxConcurrent: 5,
    queueStrategy: 'fifo',
  },
  dedupeConfig: {
    dedupeWindow: 1000,
  },
  cancelConfig: {
    enabled: true,
  },
  loggerConfig: {
    enabled: true,
    logRequest: true,
    logResponse: true,
    logError: true,
  },

  // 全局默认配置（单个请求的配置）
    defaultConfig: {
      // 全局重试配置
    retry: {
      retry: true,
      retryCount: 3,
      retryOnTimeout: false,
    },
      // 全局去重配置
      dedupe: true,
      // 全局日志配置
      logEnabled: true,
      logger: {
      enabled: true,
      logRequest: true,
      logResponse: true,
      logError: true,
      },
      // 全局 headers
      headers: {
        'X-Custom-Header': 'value',
      },
    },
});

// 现在所有请求都会自动应用全局配置
const data = await client.get('/data'); // 自动启用重试、去重、日志

// 单个请求可以覆盖全局配置
const data2 = await client.get('/data', undefined, {
  retry: { retry: false }, // 覆盖全局配置，禁用重试
});

// 嵌套对象（如 logger、headers、retry、queue、circuitBreaker）会被深度合并
const data3 = await client.get('/data', undefined, {
  logger: {
    enabled: false, // 只覆盖 enabled，其他 logger 配置保留
  },
});
```

### 配置合并规则

- **浅层属性**：单个请求的配置会完全覆盖全局配置
- **嵌套对象**（`headers`、`logger`、`queue`、`circuitBreaker`、`retry`）：会被深度合并
  - 全局配置和请求配置的嵌套对象会被合并
  - 请求配置中的属性会覆盖全局配置中的相同属性

## API 参考

### `createRequestClient(config?)`

创建请求客户端。所有配置都可以放在一个对象中，TypeScript 会自动区分哪些是 Axios 配置，哪些是业务层配置。

**参数：**

- `config?: CreateRequestClientConfig` - 统一配置对象，包含：
  - **Axios 配置**：所有 `AxiosRequestConfig` 字段都可以直接使用
  - `baseURL?: string` - API 基础 URL（默认：`'/api'`）
  - `timeout?: number` - 请求超时时间（默认：`10000` 毫秒）
    - `headers?: Record<string, string>` - 请求头
    - `params?: unknown` - URL 参数
    - `data?: unknown` - 请求体
    - `responseType?: string` - 响应类型
    - `signal?: AbortSignal` - 取消信号
    - `onUploadProgress?: (event) => void` - 上传进度回调
    - `onDownloadProgress?: (event) => void` - 下载进度回调
    - ... 其他所有 `AxiosRequestConfig` 字段

  - **步骤配置**（全局默认配置）：
    - `queueConfig?: QueueConfig` - 队列配置（传递给 QueueStep）
    - `dedupeConfig?: DedupeOptions` - 去重配置（传递给 DedupeStep）
    - `cancelConfig?: CancelOptions` - 取消配置（传递给 CancelStep）
    - `retryStrategy?: RetryStrategy` - 重试策略（传递给 RetryStep）
    - `circuitBreakerManagerOptions?: CircuitBreakerManagerOptions` - 熔断器管理器选项（传递给 CircuitBreakerStep）
    - `loggerManager?: LoggerManager` - 日志管理器实例
    - `loggerConfig?: LoggerOptions` - 日志配置（如果未提供 loggerManager）
    - `cacheReadStepOptions?: CacheReadStepOptions` - 缓存读取步骤配置
    - `cacheWriteStepOptions?: CacheWriteStepOptions` - 缓存写入步骤配置
    - `timeoutStrategy?: Partial<TimeoutStrategy>` - 超时策略（预留）

  - **全局默认配置**：
  - `defaultConfig?: Partial<RequestConfig>` - 全局默认配置（会被单个请求配置覆盖）

**返回：** `ApiRequestClient` 实例

**示例：**

```typescript
// 最简单的配置
const client = createRequestClient({
  baseURL: '/api',
  timeout: 10000,
});

// 完整配置示例
const client = createRequestClient({
  // Axios 配置
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Authorization': 'Bearer token' },

  // 步骤配置
  queueConfig: { maxConcurrent: 5 },
  loggerConfig: { enabled: true },

  // 全局默认配置
  defaultConfig: {
    retry: { retry: true, retryCount: 3 },
    dedupe: true,
  },
});
```

### `ApiRequestClient`

请求客户端类，提供以下方法：

#### `request<T>(config: RequestConfig): Promise<T>`

执行请求。

#### `get<T>(url: string, params?: unknown, config?: RequestConfig): Promise<T>`

GET 请求。

#### `post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>`

POST 请求。

#### `put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>`

PUT 请求。

#### `delete<T>(url: string, config?: RequestConfig): Promise<T>`

DELETE 请求。

#### `patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>`

PATCH 请求。

### `RequestConfig`

请求配置接口，扩展了 `AxiosRequestConfig`，添加了以下功能配置：

- `retry?: RetryConfig` - 重试配置（完整类型，对应 RetryStep）
- `circuitBreaker?: CircuitBreakerOptions<unknown>` - 熔断器配置（完整类型，对应 CircuitBreakerStep）
- `cancelable?: boolean | CancelOptions` - 取消配置（完整类型，对应 CancelStep）
- `requestId?: string` - 请求标识（用于取消请求）
- `dedupe?: boolean | DedupeOptions` - 去重配置（完整类型，对应 DedupeStep）
- `cache?: CacheConfig` - 缓存配置（完整类型，对应 CacheReadStep/CacheWriteStep）
- `cacheExpireTime?: number` - 缓存过期时间（毫秒）
- `logEnabled?: boolean` - 是否启用日志（默认：false）
- `logger?: LoggerOptions` - 日志配置（完整类型，对应 Logger）
- `priority?: number` - 请求优先级（用于队列管理）
- `onUploadProgress?: (progressEvent: AxiosProgressEvent) => void` - 上传进度回调
- `onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void` - 下载进度回调
- `queue?: QueueConfig` - 队列配置（完整类型，对应 QueueStep）

**注意：** 所有配置字段都使用完整的类型定义，确保类型安全和完整的 IDE 提示。

## 注意事项

### 业务逻辑处理

`@suga/request-client` 是一个通用的请求基础设施包，**不包含任何业务逻辑**。以下功能需要由应用层自行实现：

- **Loading 状态管理**：需要在应用层监听事件或使用状态管理库
- **错误提示**：需要在应用层处理错误并显示提示
- **Token 刷新**：需要在应用层实现 token 刷新逻辑
- **业务响应格式处理**：需要在应用层处理业务响应格式（如 `ApiResponse`、`ErrorResponse`）
- **文件上传/下载**：需要基于 `client.post/get` 在应用层实现

### 示例：在应用层处理业务逻辑

```typescript
import { createRequestClient, onRequestStart, onRequestError } from '@suga/request-client';

const client = createRequestClient({
  baseURL: '/api',
  timeout: 10000,
});

// 应用层：处理 Loading 状态
onRequestStart(() => {
  showLoading();
});

onRequestComplete(() => {
  hideLoading();
});

// 应用层：处理错误提示
onRequestError((event) => {
  const error = event.error;
  if (error.response?.status === 401) {
    // Token 过期，刷新 token
    refreshToken().then(() => {
      // 重试请求
    });
  } else {
    // 显示错误提示
    showError(error.message);
  }
});

// 应用层：处理业务响应格式
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function requestWithBusinessFormat<T>(config: RequestConfig): Promise<T> {
  const response = await client.request<ApiResponse<T>>(config);

  if (response.code !== 200) {
    throw new Error(response.message);
  }

  return response.data;
}
```

## 依赖的功能包

`@suga/request-client` 整合了以下功能包：

- `@suga/request-core` - 核心请求架构
- `@suga/request-cache` - 缓存功能
- `@suga/request-retry` - 重试功能
- `@suga/request-circuit-breaker` - 熔断器功能
- `@suga/request-dedupe` - 去重功能
- `@suga/request-queue` - 队列功能
- `@suga/request-events` - 事件功能
- `@suga/request-performance` - 性能监控功能
- `@suga/request-logger` - 日志功能
- `@suga/request-progress` - 进度功能
- `@suga/storage` - 存储适配器

如需深入了解某个功能，请参考对应包的文档。

## 许可证

MIT

## 相关链接

- [GitHub](https://github.com/xoxott/suga-tools/tree/main/packages/request-client)
- [问题反馈](https://github.com/xoxott/suga-tools/issues)

