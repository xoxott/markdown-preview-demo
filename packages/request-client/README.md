# @suga/request-client

基于 Axios 的 HTTP 请求客户端，构建在 `@suga/request-core` 之上，整合了缓存、重试、熔断、去重、队列、事件、性能监控、日志、进度等完整的请求功能。

## 特性

- ✅ **开箱即用**：整合所有 `@suga/request-*` 功能包，无需手动配置
- ✅ **Axios 适配**：基于 Axios，提供熟悉的 API 接口
- ✅ **功能丰富**：缓存、重试、熔断、去重、队列、事件、性能监控、日志、进度
- ✅ **类型安全**：完整的 TypeScript 支持
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

// 创建请求客户端
const client = createRequestClient(undefined, {
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
import axios from 'axios';
import { createRequestClient } from '@suga/request-client';

// 创建自定义 Axios 实例
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Authorization': 'Bearer token',
  },
});

// 使用自定义实例创建客户端
const client = createRequestClient(
  {
    headers: {
      'X-Custom-Header': 'value',
    },
  },
  {
    baseURL: '/api',
    timeout: 10000,
  }
);
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
// 启用重试（默认重试3次）
const data = await client.get('/data', undefined, {
  retry: true,
});

// 自定义重试次数
const data = await client.get('/data', undefined, {
  retry: true,
  retryCount: 5,
});

// 超时时也重试
const data = await client.get('/data', undefined, {
  retry: true,
  retryOnTimeout: true,
});
```

> **注意：** 目前这些配置需要在每个请求中单独设置。如需全局配置，可以在应用层封装一个包装函数（见下方"全局配置方案"）。

**全局配置：** 目前需要在每个请求中单独配置。如需全局配置，可以在应用层封装一个包装函数（见下方"全局配置方案"）。

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
// 启用去重
const data = await client.get('/data', undefined, {
  dedupe: true,
});
```

### 队列

控制并发请求数量：

```typescript
import type { QueueConfig } from '@suga/request-client';

const queueConfig: QueueConfig = {
  maxConcurrent: 5, // 最大并发数
  timeout: 30000, // 队列超时时间
};

const data = await client.get('/data', undefined, {
  queue: queueConfig,
  priority: 10, // 请求优先级（数字越大优先级越高）
});
```

### 日志

启用请求日志：

```typescript
import type { LoggerOptions } from '@suga/request-client';

const loggerOptions: LoggerOptions = {
  level: 'info', // 'debug' | 'info' | 'warn' | 'error'
  enableRequest: true,
  enableResponse: true,
  enableError: true,
};

const data = await client.get('/data', undefined, {
  logEnabled: true,
  logger: loggerOptions,
});
```

### 进度监控

监控上传和下载进度：

```typescript
// 上传进度
await client.post('/upload', formData, {
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`上传进度: ${percentCompleted}%`);
  },
});

// 下载进度
await client.get('/download', undefined, {
  onDownloadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`下载进度: ${percentCompleted}%`);
  },
});
```

### 请求取消

取消正在进行的请求：

```typescript
import { cancelTokenManager, generateRequestId } from '@suga/request-client';

// 生成请求 ID
const requestId = generateRequestId();

// 发起请求
const promise = client.get('/data', undefined, {
  requestId,
});

// 取消请求
cancelTokenManager.cancel(requestId);
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

```typescript
import { createRequestClient } from '@suga/request-client';
import type { RequestConfig } from '@suga/request-client';

// 创建客户端
const client = createRequestClient(
  {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  {
    baseURL: '/api',
    timeout: 10000,
  }
);

// 带完整配置的请求
const config: RequestConfig = {
  url: '/data',
  method: 'GET',
  // 缓存配置
  cache: true,
  cacheExpireTime: 60000,
  // 重试配置
  retry: true,
  retryCount: 3,
  retryOnTimeout: false,
  // 去重配置
  dedupe: true,
  // 队列配置
  queue: {
    maxConcurrent: 5,
    timeout: 30000,
  },
  priority: 10,
  // 日志配置
  logEnabled: true,
  logger: {
    level: 'info',
    enableRequest: true,
    enableResponse: true,
    enableError: true,
  },
  // 请求 ID（用于取消）
  requestId: 'unique-request-id',
};

const data = await client.request(config);
```

## 全局配置方案

目前 `@suga/request-client` 不支持在创建客户端时设置全局默认配置（如全局重试、缓存等）。如果需要全局配置，可以在应用层封装一个包装函数：

### 方案：应用层封装全局配置

```typescript
import { createRequestClient, type ApiRequestClient, type RequestConfig } from '@suga/request-client';

// 定义全局默认配置
const globalDefaultConfig: Partial<RequestConfig> = {
  retry: true,
  retryCount: 3,
  retryOnTimeout: false,
  dedupe: true,
  logEnabled: true,
  logger: {
    level: 'info',
    enableRequest: true,
    enableResponse: true,
    enableError: true,
  },
};

// 创建基础客户端
const baseClient = createRequestClient(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

// 封装带全局配置的客户端
class ClientWithDefaults {
  constructor(
    private client: ApiRequestClient,
    private defaults: Partial<RequestConfig>
  ) {}

  private mergeConfig(config?: RequestConfig): RequestConfig {
    return {
      ...this.defaults,
      ...config,
      // 深度合并嵌套对象
      logger: {
        ...this.defaults.logger,
        ...config?.logger,
      } as typeof config?.logger,
      queue: {
        ...this.defaults.queue,
        ...config?.queue,
      } as typeof config?.queue,
    };
  }

  request<T = unknown>(config: RequestConfig): Promise<T> {
    return this.client.request<T>(this.mergeConfig(config));
  }

  get<T = unknown>(url: string, params?: unknown, config?: RequestConfig): Promise<T> {
    return this.client.get<T>(url, params, this.mergeConfig(config));
  }

  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.client.post<T>(url, data, this.mergeConfig(config));
  }

  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.client.put<T>(url, data, this.mergeConfig(config));
  }

  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.client.delete<T>(url, this.mergeConfig(config));
  }

  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.client.patch<T>(url, data, this.mergeConfig(config));
  }
}

// 使用带全局配置的客户端
const client = new ClientWithDefaults(baseClient, globalDefaultConfig);

// 现在所有请求都会自动应用全局配置
const data = await client.get('/data'); // 自动启用重试、去重、日志

// 单个请求可以覆盖全局配置
const data2 = await client.get('/data', undefined, {
  retry: false, // 覆盖全局配置，禁用重试
});
```

### 更简单的方案：使用工具函数

```typescript
import { createRequestClient, type RequestConfig } from '@suga/request-client';

// 全局默认配置
const globalDefaults: Partial<RequestConfig> = {
  retry: true,
  retryCount: 3,
  dedupe: true,
};

// 创建客户端
const client = createRequestClient(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

// 工具函数：合并配置
function withDefaults(config?: RequestConfig): RequestConfig {
  return {
    ...globalDefaults,
    ...config,
  };
}

// 使用方式
const data = await client.get('/data', undefined, withDefaults());
const data2 = await client.get('/data', undefined, withDefaults({ retry: false }));
```

## API 参考

### `createRequestClient(config?, options?)`

创建请求客户端。

**参数：**

- `config?: AxiosRequestConfig` - Axios 配置对象
- `options?: RequestOptions` - 请求选项
  - `baseURL?: string` - API 基础 URL（默认：`'/api'`）
  - `timeout?: number` - 请求超时时间（默认：`10000` 毫秒）
  - `timeoutStrategy?: Partial<TimeoutStrategy>` - 超时策略
  - `queueConfig?: QueueConfig` - 队列配置

**返回：** `ApiRequestClient` 实例

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

- `retry?: boolean` - 是否启用自动重试
- `retryCount?: number` - 重试次数（默认：3）
- `retryOnTimeout?: boolean` - 超时时是否重试（默认：false）
- `circuitBreaker?: CircuitBreakerOptions` - 熔断器配置
- `cancelable?: boolean` - 是否可取消请求（默认：true）
- `requestId?: string` - 请求标识（用于取消请求）
- `dedupe?: boolean` - 是否启用去重（默认：false）
- `cache?: boolean` - 是否使用缓存（仅 GET 请求，默认：false）
- `cacheExpireTime?: number` - 缓存过期时间（毫秒）
- `logEnabled?: boolean` - 是否启用日志（默认：false）
- `priority?: number` - 请求优先级（用于队列管理）
- `onUploadProgress?: (progressEvent: AxiosProgressEvent) => void` - 上传进度回调
- `onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void` - 下载进度回调
- `queue?: QueueConfig` - 队列配置
- `logger?: LoggerOptions` - 日志配置

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

const client = createRequestClient(undefined, {
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

