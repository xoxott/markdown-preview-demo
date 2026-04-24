# @suga/request-core

Framework-agnostic, transport-layer-agnostic, extensible request infrastructure.

一个**框架无关、传输层无关、可扩展**的前端请求基础设施核心库。

## ✨ 特性

- 🚀 **传输层解耦** - 不绑定 Axios、fetch、XHR，Transport 可替换
- 🔌 **能力可组合** - 缓存、重试、熔断、取消等能力以插件方式存在
- 🎯 **职责严格分离** - 请求执行、状态管理、能力治理、结果处理分离
- 🛠️ **长期可维护** - 无魔法字符串、无隐式副作用，所有状态变化可追踪、可测试
- 📦 **零依赖** - 核心库不依赖任何外部库，保持轻量

## 📦 安装

```bash
npm install @suga/request-core
# or
pnpm add @suga/request-core
# or
yarn add @suga/request-core
```

## 🚀 快速开始

### 基础使用

```typescript
import {
  RequestClient,
  Transport,
  TransportResponse,
  NormalizedRequestConfig
} from '@suga/request-core';

// 1. 实现 Transport 接口
class FetchTransport implements Transport {
  async request<T>(config: NormalizedRequestConfig): Promise<TransportResponse<T>> {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.data ? JSON.stringify(config.data) : undefined
    });

    const data = await response.json();

    return {
      data: data as T,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      config
    };
  }
}

// 2. 创建客户端
const transport = new FetchTransport();
const client = new RequestClient(transport);

// 3. 发起请求
const users = await client.get<User[]>('/api/users');
const newUser = await client.post<User>('/api/users', { name: 'John' });
```

### 使用自定义步骤（Step）

```typescript
import { RequestClient, RequestStep, RequestContext } from '@suga/request-core';

// 定义自定义步骤
class LoggingStep implements RequestStep {
  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    console.log('Request started:', ctx.config.url);
    const startTime = Date.now();

    await next();

    const duration = Date.now() - startTime;
    console.log('Request completed:', ctx.config.url, `(${duration}ms)`);
  }
}

// 添加步骤到客户端
const client = new RequestClient(transport).with(new LoggingStep());

// 使用
await client.get('/api/users');
```

## 📚 核心概念

### 1. Transport（传输层）

Transport 是请求基础设施的传输层抽象，只关心「如何发请求」，不感知缓存、熔断、重试等概念。

```typescript
interface Transport {
  request<T>(config: NormalizedRequestConfig): Promise<TransportResponse<T>>;
}
```

**特点：**

- 可被 mock、替换、测试
- 不包含业务逻辑
- 只处理 HTTP 请求的发送和响应

### 2. RequestStep（请求步骤）

RequestStep 是能力插件的基础接口，用于实现缓存、重试、熔断等功能。

```typescript
interface RequestStep {
  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void>;
}
```

**设计约束：**

- 单一职责
- 可插拔
- 可排序
- 可独立测试

### 3. RequestContext（请求上下文）

RequestContext 是请求生命周期内的唯一共享对象，所有 Step 通过 Context 通信。

```typescript
interface RequestContext<T = unknown> {
  readonly id: string; // 请求唯一标识
  readonly config: NormalizedRequestConfig; // 标准化请求配置
  state: RequestState; // 请求状态
  meta: Record<string, unknown>; // 元数据（用于 Step 之间传递信息）
  result?: T; // 请求结果
  error?: unknown; // 请求错误
}
```

**设计原则：**

- 请求生命周期内唯一共享对象
- 禁止通过 config 传递运行态数据
- 所有 Step 只能通过 Context 通信

### 4. RequestExecutor（执行器）

RequestExecutor 负责执行 Step 链，协调各个步骤的执行顺序。

```typescript
class RequestExecutor {
  constructor(private readonly steps: RequestStep[]);
  async execute<T>(config: NormalizedRequestConfig, meta?: Record<string, unknown>): Promise<T>;
}
```

### 5. RequestClient（客户端）

RequestClient 是对外 API，提供便捷的请求方法。

```typescript
class RequestClient {
  constructor(transport: Transport);
  with(step: RequestStep): RequestClient; // 链式添加步骤
  request<T>(config: NormalizedRequestConfig, meta?: Record<string, unknown>): Promise<T>;
  get<T>(
    url: string,
    params?: unknown,
    config?: Partial<NormalizedRequestConfig>,
    meta?: Record<string, unknown>
  ): Promise<T>;
  post<T>(
    url: string,
    data?: unknown,
    config?: Partial<NormalizedRequestConfig>,
    meta?: Record<string, unknown>
  ): Promise<T>;
  // ... put, delete, patch
}
```

## 📖 API 文档

### RequestClient

#### 构造函数

```typescript
new RequestClient(transport: Transport)
```

创建一个新的请求客户端实例。

**参数：**

- `transport: Transport` - 传输层实现

#### 方法

##### `with(step: RequestStep): RequestClient`

链式添加请求步骤。

```typescript
const client = new RequestClient(transport).with(new CacheStep()).with(new RetryStep());
```

##### `request<T>(config, meta?): Promise<T>`

执行请求。

**参数：**

- `config: NormalizedRequestConfig` - 标准化请求配置
- `meta?: Record<string, unknown>` - 元数据（可选）

**返回：** `Promise<T>`

##### `get<T>(url, params?, config?, meta?): Promise<T>`

GET 请求。

##### `post<T>(url, data?, config?, meta?): Promise<T>`

POST 请求。

##### `put<T>(url, data?, config?, meta?): Promise<T>`

PUT 请求。

##### `delete<T>(url, config?, meta?): Promise<T>`

DELETE 请求。

##### `patch<T>(url, data?, config?, meta?): Promise<T>`

PATCH 请求。

### NormalizedRequestConfig

标准化请求配置，只包含传输层需要的字段。

```typescript
interface NormalizedRequestConfig {
  readonly url: string;
  readonly method: string;
  readonly baseURL?: string;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
  readonly params?: unknown;
  readonly data?: unknown;
  readonly responseType?: string;
  readonly signal?: AbortSignal;
  readonly onUploadProgress?: (progressEvent: unknown) => void;
  readonly onDownloadProgress?: (progressEvent: unknown) => void;
  [key: string]: unknown;
}
```

### Transport

传输层接口。

```typescript
interface Transport {
  request<T>(config: NormalizedRequestConfig): Promise<TransportResponse<T>>;
}

interface TransportResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  config: NormalizedRequestConfig;
}
```

### RequestStep

请求步骤接口。

```typescript
interface RequestStep {
  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void>;
}
```

### RequestContext

请求上下文。

```typescript
interface RequestContext<T = unknown> {
  readonly id: string;
  readonly config: NormalizedRequestConfig;
  state: RequestState;
  meta: Record<string, unknown>;
  result?: T;
  error?: unknown;
}

interface RequestState {
  aborted: boolean; // 是否已取消
  fromCache: boolean; // 是否来自缓存
  retrying: boolean; // 是否正在重试
  retryCount: number; // 重试次数
}
```

## 💡 使用示例

### 示例 1: 使用 Fetch 作为传输层

```typescript
import {
  RequestClient,
  Transport,
  TransportResponse,
  NormalizedRequestConfig
} from '@suga/request-core';

class FetchTransport implements Transport {
  async request<T>(config: NormalizedRequestConfig): Promise<TransportResponse<T>> {
    const url = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
    const options: RequestInit = {
      method: config.method,
      headers: config.headers as HeadersInit
    };

    if (config.data) {
      options.body = JSON.stringify(config.data);
      options.headers = {
        ...(options.headers as Record<string, string>),
        'Content-Type': 'application/json'
      };
    }

    if (config.signal) {
      options.signal = config.signal;
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      data: data as T,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      config
    };
  }
}

const client = new RequestClient(new FetchTransport());
const users = await client.get('/api/users');
```

### 示例 2: 实现缓存步骤

```typescript
import { RequestStep, RequestContext } from '@suga/request-core';

class CacheStep implements RequestStep {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5分钟

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    const key = `${ctx.config.method}:${ctx.config.url}`;
    const cached = this.cache.get(key);

    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      ctx.result = cached.data as T;
      ctx.state.fromCache = true;
      return;
    }

    // 执行请求
    await next();

    // 写入缓存
    if (ctx.result !== undefined && !ctx.error) {
      this.cache.set(key, {
        data: ctx.result,
        timestamp: Date.now()
      });
    }
  }
}

const client = new RequestClient(transport).with(new CacheStep());
```

### 示例 3: 实现重试步骤

```typescript
import { RequestStep, RequestContext } from '@suga/request-core';

class RetryStep implements RequestStep {
  private maxRetries = 3;
  private retryDelay = 1000;

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    let lastError: unknown;

    for (let i = 0; i <= this.maxRetries; i++) {
      try {
        ctx.state.retrying = i > 0;
        ctx.state.retryCount = i;
        await next();
        return; // 成功，退出
      } catch (error) {
        lastError = error;
        if (i < this.maxRetries) {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)));
        }
      }
    }

    // 所有重试都失败
    ctx.error = lastError;
    throw lastError;
  }
}

const client = new RequestClient(transport).with(new RetryStep());
```

### 示例 4: 组合多个步骤

```typescript
const client = new RequestClient(transport)
  .with(new LoggingStep())
  .with(new CacheStep())
  .with(new RetryStep())
  .with(new TimeoutStep());

// 执行顺序：
// 1. LoggingStep (开始日志)
// 2. CacheStep (检查缓存)
// 3. RetryStep (重试逻辑)
// 4. TimeoutStep (超时控制)
// 5. TransportStep (实际请求)
// 6. CacheStep (写入缓存)
// 7. LoggingStep (结束日志)
```

### 示例 5: 使用元数据传递业务配置

```typescript
// 在业务层，通过 meta 传递业务配置
const client = new RequestClient(transport);

await client.get('/api/users', undefined, undefined, {
  cache: true,
  retry: true,
  retryCount: 3,
  loading: true
});

// 在 Step 中读取 meta
class BusinessStep implements RequestStep {
  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    const shouldCache = ctx.meta.cache === true;
    const shouldRetry = ctx.meta.retry === true;

    // 根据 meta 决定行为
    await next();
  }
}
```

## 🏗️ 架构设计

### 执行流程

```
RequestClient.request()
    ↓
RequestExecutor.execute()
    ↓
createRequestContext() → RequestContext
    ↓
composeSteps() → Step Chain
    ↓
Step 1: PrepareContextStep
    ↓
Step 2: CustomStep (e.g., CacheStep)
    ↓
Step 3: TransportStep → Transport.request()
    ↓
Step 4: CustomStep (e.g., CacheWriteStep)
    ↓
返回结果或抛出错误
```

### 设计原则

1. **传输层解耦** - Transport 只关心如何发请求
2. **能力可组合** - 通过 Step 组合实现不同能力
3. **职责分离** - 每个组件职责单一
4. **状态管理** - 所有状态通过 Context 管理
5. **可测试性** - 每个组件可独立测试

## 🔧 最佳实践

### 1. Transport 实现

- 只处理 HTTP 请求的发送和响应
- 不包含业务逻辑（如错误处理、Token 注入等）
- 支持 AbortSignal 以实现请求取消

### 2. Step 实现

- 单一职责：每个 Step 只做一件事
- 通过 Context 通信，不直接调用其他 Step
- 使用 `next()` 调用下一个步骤
- 在 `next()` 前后可以执行逻辑

### 3. 错误处理

```typescript
class ErrorHandlingStep implements RequestStep {
  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    try {
      await next();
    } catch (error) {
      // 统一错误处理
      ctx.error = this.normalizeError(error);
      throw ctx.error;
    }
  }
}
```

### 4. 类型安全

```typescript
// 使用泛型确保类型安全
interface User {
  id: number;
  name: string;
}

const users = await client.get<User[]>('/api/users');
// users 的类型是 User[]
```

## 🤝 与业务层集成

`@suga/request-core` 是核心库，不包含业务逻辑。在实际项目中，通常会有一个业务层包装：

```typescript
// 业务层封装示例
import { RequestClient, NormalizedRequestConfig } from '@suga/request-core';
// 注意：AxiosTransport 应该在业务层实现，实现 Transport 接口
// import { AxiosTransport } from '../utils/AxiosTransport';
import { CacheStep, RetryStep } from './business-steps';
import axios from 'axios';

export class ApiClient {
  private client: RequestClient;

  constructor() {
    // 创建 Axios 实例（业务层负责）
    const axiosInstance = axios.create({
      baseURL: '/api',
      timeout: 10000
    });

    // 创建 Transport（业务层实现，实现 Transport 接口）
    // const transport = new AxiosTransport({ instance: axiosInstance });
    this.client = new RequestClient(transport).with(new CacheStep()).with(new RetryStep());
  }

  // 业务层方法，将业务配置转换为标准化配置
  async get<T>(url: string, config?: BusinessConfig): Promise<T> {
    const normalized: NormalizedRequestConfig = {
      url,
      method: 'GET'
      // ... 转换业务配置
    };

    const meta = {
      cache: config?.cache,
      retry: config?.retry
      // ... 业务配置放入 meta
    };

    return this.client.request<T>(normalized, meta);
  }
}
```

## 📝 许可证

MIT

## 🔗 相关链接

- [架构设计文档](./ARCHITECTURE.md) - 详细的架构设计说明
- [GitHub Repository](https://github.com/xoxott/markdown-preview-demo) - 源代码仓库
