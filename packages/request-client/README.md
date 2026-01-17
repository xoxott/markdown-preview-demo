# @suga/request-client

请求客户端工具集和示例，用于 `@suga/request-core` 和 `@suga/request-*` 功能包。

## ⚠️ 重要说明

**此包提供工具函数和示例，但不推荐直接使用固定的组合方式。**

### 推荐使用方式：按需组装

`@suga/request-client` 的理念是**组合优于配置**。业务层应该根据实际需求，只引入需要的功能包，自由组装请求客户端，而不是依赖一个包含所有功能的固定组合。

```typescript
// ✅ 推荐：按需组装
import { RequestClient } from '@suga/request-core';
import { AxiosTransport, TransportStep } from '@suga/request-axios';
import { RetryStep } from '@suga/request-retry';
import { DedupeStep } from '@suga/request-dedupe';

const transport = new AxiosTransport({ 
  instance: axios.create({ baseURL: '/api' }) 
});

const client = new RequestClient(transport)
  .with(new PrepareContextStep())
  .with(new DedupeStep())
  .with(new RetryStep({ retry: true, retryCount: 3 }))
  .with(new TransportStep(transport));

// 发起请求
const data = await client.get('/users');
```

### 提供的内容

此包提供：

1. **工具函数**：
   - `ApiRequestClient`：业务层请求客户端包装类
   - `configAdapter`：配置转换工具
   - 类型定义：`RequestConfig`、`RequestMethod` 等

2. **示例函数**（仅供参考）：
   - `createMinimalClient`：最小化客户端（只包含基本功能）
   - `createCustomClient`：自定义客户端（根据选项动态组装）
   - `createDefaultClient`：全功能客户端（包含所有功能包）
   - `createRequestClient`：向后兼容函数（内部使用 `createDefaultClient`）

## 安装

```bash
pnpm add @suga/request-client @suga/request-axios @suga/request-core
# 根据需要添加其他功能包
pnpm add @suga/request-retry @suga/request-cache @suga/request-dedupe
```

## 使用示例

### 方式一：按需组装（推荐）

```typescript
import { RequestClient } from '@suga/request-core';
import { PrepareContextStep } from '@suga/request-core';
import { AxiosTransport, TransportStep, AbortStep } from '@suga/request-axios';
import { RetryStep } from '@suga/request-retry';
import { DedupeStep } from '@suga/request-dedupe';
import axios from 'axios';

// 创建传输层
const transport = new AxiosTransport({
  instance: axios.create({
    baseURL: '/api',
    timeout: 10000,
  }),
});

// 创建客户端（只包含需要的功能）
const client = new RequestClient(transport)
  .with(new PrepareContextStep())
  .with(new DedupeStep())
  .with(new AbortStep())
  .with(new RetryStep({ retry: true, retryCount: 3 }))
  .with(new TransportStep(transport));

// 使用
const users = await client.get<User[]>('/users');
```

### 方式二：使用示例函数（不推荐）

如果确实需要快速开始，可以使用提供的示例函数：

```typescript
import { createMinimalClient } from '@suga/request-client';

// 最小化客户端（只包含基本功能）
const client = createMinimalClient('/api', 10000);

const users = await client.get<User[]>('/users');
```

```typescript
import { createCustomClient } from '@suga/request-client';

// 自定义客户端（根据选项动态组装）
const client = createCustomClient({
  baseURL: '/api',
  timeout: 10000,
  enableRetry: true,
  enableDedupe: true,
  retryConfig: { retry: true, retryCount: 3 },
});

const users = await client.get<User[]>('/users');
```

```typescript
import { createRequestClient } from '@suga/request-client';

// 全功能客户端（包含所有功能包，不推荐）
// 这会安装所有依赖，即使你不需要它们
const client = createRequestClient({
  baseURL: '/api',
  timeout: 10000,
});

const users = await client.get<User[]>('/users');
```

## API 文档

### 工具类

#### `ApiRequestClient`

业务层请求客户端包装类，提供 `get`、`post`、`put`、`delete`、`patch` 等便捷方法。

```typescript
import { ApiRequestClient } from '@suga/request-client';
import { RequestClient } from '@suga/request-core';

const coreClient = new RequestClient(transport)
  .with(...steps);

const apiClient = new ApiRequestClient(coreClient);

// 使用
await apiClient.get('/users');
await apiClient.post('/users', { name: 'John' });
```

### 示例函数

#### `createMinimalClient(baseURL?, timeout?)`

创建最小化请求客户端，只包含基本功能。

**参数：**
- `baseURL?: string` - API 基础 URL（默认：`'/api'`）
- `timeout?: number` - 超时时间（默认：`10000` 毫秒）

**返回：** `RequestClient` 实例

#### `createCustomClient(options?)`

创建自定义请求客户端，根据选项动态组装功能。

**参数：**
```typescript
interface CustomClientOptions {
  baseURL?: string;
  timeout?: number;
  enableRetry?: boolean;
  enableDedupe?: boolean;
  enableEvents?: boolean;
  retryConfig?: RetryConfig;
  dedupeConfig?: DedupeOptions;
}
```

**返回：** `RequestClient` 实例

#### `createDefaultClient(config?)`

创建全功能请求客户端，包含所有功能包。

**参数：** `CreateRequestClientConfig`（包含所有 Axios 和业务层配置）

**返回：** `ApiRequestClient` 实例

#### `createRequestClient(config?)`（向后兼容）

向后兼容函数，内部使用 `createDefaultClient`。

**⚠️ 不推荐使用**，推荐使用按需组装的方式。

### 类型

#### `RequestConfig`

请求配置接口，扩展了 `AxiosRequestConfig`，添加了功能配置字段。

#### `RequestMethod`

请求方法类型：`'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'`

## 为什么推荐按需组装？

1. **更小的包体积**：只安装需要的功能包
2. **更清晰的依赖关系**：明确知道使用了哪些功能
3. **更好的性能**：不需要加载不需要的代码
4. **更大的灵活性**：可以根据业务需求自由组合
5. **更容易维护**：功能边界清晰，便于理解和修改

## 可用的功能包

- `@suga/request-core` - 核心请求架构（必需）
- `@suga/request-axios` - Axios 传输层适配（必需，如果使用 Axios）
- `@suga/request-retry` - 请求重试
- `@suga/request-cache` - 请求缓存
- `@suga/request-dedupe` - 请求去重
- `@suga/request-queue` - 请求队列
- `@suga/request-events` - 请求事件
- `@suga/request-abort` - 请求中止
- `@suga/request-circuit-breaker` - 熔断器
- `@suga/request-logger` - 请求日志
- `@suga/request-performance` - 性能监控
- `@suga/request-progress` - 进度跟踪

## 最佳实践

### 1. 最小化依赖

只引入需要的功能包：

```typescript
// ✅ 好：只引入需要的包
import { RetryStep } from '@suga/request-retry';
import { DedupeStep } from '@suga/request-dedupe';

// ❌ 不好：引入不需要的包
import { CircuitBreakerStep } from '@suga/request-circuit-breaker'; // 如果不需要熔断
```

### 2. 封装工厂函数

在业务层封装自己的工厂函数：

```typescript
// 业务层：my-project/src/utils/request.ts
import { RequestClient } from '@suga/request-core';
import { PrepareContextStep } from '@suga/request-core';
import { AxiosTransport, TransportStep } from '@suga/request-axios';
import { RetryStep } from '@suga/request-retry';
import { DedupeStep } from '@suga/request-dedupe';
import axios from 'axios';

export function createMyRequestClient(config: MyConfig) {
  const transport = new AxiosTransport({
    instance: axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
    }),
  });

  const steps = [
    new PrepareContextStep(),
    ...(config.enableDedupe ? [new DedupeStep()] : []),
    ...(config.enableRetry ? [new RetryStep(config.retry)] : []),
    new TransportStep(transport),
  ];

  const client = new RequestClient(transport);
  for (const step of steps) {
    client.with(step);
  }

  return client;
}
```

### 3. 使用 ApiRequestClient 包装

如果需要便捷的 `get`、`post` 等方法，可以使用 `ApiRequestClient`：

```typescript
import { ApiRequestClient } from '@suga/request-client';

const coreClient = new RequestClient(transport).with(...steps);
const apiClient = new ApiRequestClient(coreClient);

// 使用便捷方法
await apiClient.get('/users');
await apiClient.post('/users', { name: 'John' });
```

## 注意事项

### 业务逻辑处理

`@suga/request-client` 是通用的请求基础设施，**不包含任何业务逻辑**。以下功能需要由应用层自行实现：

- **Loading 状态管理**：需要在应用层监听事件或使用状态管理库
- **错误提示**：需要在应用层处理错误并显示提示
- **Token 刷新**：需要在应用层实现 token 刷新逻辑
- **业务响应格式处理**：需要在应用层处理业务响应格式（如 `ApiResponse`、`ErrorResponse`）
- **文件上传/下载**：需要基于 `client.post/get` 在应用层实现

## 迁移指南

如果你之前使用 `createRequestClient`，迁移到按需组装：

### 之前

```typescript
import { createRequestClient } from '@suga/request-client';

const client = createRequestClient({
  baseURL: '/api',
  timeout: 10000,
});
```

### 之后（推荐）

```typescript
import { RequestClient } from '@suga/request-core';
import { PrepareContextStep } from '@suga/request-core';
import { AxiosTransport, TransportStep } from '@suga/request-axios';
import axios from 'axios';

const transport = new AxiosTransport({
  instance: axios.create({
    baseURL: '/api',
    timeout: 10000,
  }),
});

const client = new RequestClient(transport)
  .with(new PrepareContextStep())
  .with(new TransportStep(transport));
```

## 依赖的功能包

`@suga/request-client` 整合了以下功能包的导出，方便使用：

- `@suga/request-core` - 核心请求架构
- `@suga/request-axios` - Axios 传输层适配
- `@suga/request-retry` - 请求重试
- `@suga/request-cache` - 请求缓存
- `@suga/request-circuit-breaker` - 熔断器
- `@suga/request-dedupe` - 请求去重
- `@suga/request-queue` - 请求队列
- `@suga/request-events` - 请求事件
- `@suga/request-abort` - 请求中止
- `@suga/request-logger` - 请求日志
- `@suga/request-performance` - 性能监控
- `@suga/request-progress` - 进度跟踪

**注意**：虽然此包导出了所有功能包，但你只需要安装实际使用的包即可。
