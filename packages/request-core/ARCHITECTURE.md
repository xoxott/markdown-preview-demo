# @suga/request-core 架构设计文档

## 1. 设计目标

本架构用于构建一套 **框架无关、传输层无关、可扩展、可治理** 的前端请求基础设施。

### 核心目标

- **传输层解耦**
  - 不绑定 Axios、fetch、XHR
  - Transport 可替换

- **能力可组合**
  - 缓存、重试、熔断、取消等能力以插件方式存在
  - 不通过 if / config 堆叠控制

- **职责严格分离**
  - 请求执行
  - 状态管理
  - 能力治理
  - 结果处理

- **长期可维护**
  - 无魔法字符串
  - 无隐式副作用
  - 所有状态变化可追踪、可测试

---

## 2. 总体架构概览

```
┌─────────────────────────────┐
│ Application                 │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│ RequestClient                │ ← 对外 API
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│ RequestExecutor              │ ← 执行调度器
└──────────────┬──────────────┘
               │
┌─────────▼─────────┐
│ RequestSteps      │ ← 能力插件（链式）
└─────────┬─────────┘
           │
┌──────────────▼──────────────┐
│ Transport                    │ ← Axios / fetch / mock
└─────────────────────────────┘
```

---

## 3. 核心概念定义

### 3.1 RequestContext（请求上下文）

> **请求的唯一事实来源**

```typescript
interface RequestContext<T = unknown> {
  readonly id: string
  readonly config: NormalizedRequestConfig
  state: {
    aborted: boolean
    fromCache: boolean
    retrying: boolean
    retryCount: number
  }
  meta: Record<string, unknown>
  result?: T
  error?: unknown
}
```

**设计原则**
- 请求生命周期内唯一共享对象
- 禁止通过 config 传递运行态数据
- 所有 Step 只能通过 Context 通信
- 不包含业务层配置（通过 meta 传递）

### 3.2 Transport（传输层抽象）

```typescript
interface Transport {
  request<T>(config: NormalizedRequestConfig): Promise<TransportResponse<T>>
}
```

**特点**
- 只关心「如何发请求」
- 不感知缓存、熔断、重试、取消等概念
- 可被 mock、替换、测试
- 不包含业务逻辑

### 3.3 RequestStep（请求能力插件）

```typescript
interface RequestStep {
  execute<T>(
    ctx: RequestContext<T>,
    next: () => Promise<void>
  ): Promise<void>
}
```

**设计约束**
- 单一职责
- 可插拔
- 可排序
- 可独立测试
- 通过 Context 通信，不直接调用其他 Step

### 3.4 NormalizedRequestConfig（标准化配置）

```typescript
interface NormalizedRequestConfig {
  readonly url: string
  readonly method: string
  readonly baseURL?: string
  readonly timeout?: number
  readonly headers?: Record<string, string>
  readonly params?: unknown
  readonly data?: unknown
  readonly responseType?: string
  readonly signal?: AbortSignal
  readonly onUploadProgress?: (progressEvent: unknown) => void
  readonly onDownloadProgress?: (progressEvent: unknown) => void
  [key: string]: unknown
}
```

**特点**
- 只包含传输层需要的字段
- 不包含业务逻辑相关字段
- 业务配置通过 `meta` 传递

---

## 4. 请求执行模型

### 4.1 执行器（RequestExecutor）

```typescript
class RequestExecutor {
  constructor(
    private readonly steps: RequestStep[],
  ) {}

  async execute<T>(
    config: NormalizedRequestConfig,
    meta?: Record<string, unknown>
  ): Promise<T> {
    const ctx = createRequestContext<T>(config, undefined, meta)
    const composed = composeSteps(this.steps)
    await composed(ctx)
    if (ctx.error) throw ctx.error
    return ctx.result as T
  }
}
```

### 4.2 执行顺序示例

```
PrepareContextStep
 → CacheReadStep
   → CircuitBreakerStep
     → RetryStep
       → AbortStep
         → TransportStep
       → CacheWriteStep
```

**说明：**
- Step 按添加顺序执行
- `next()` 调用下一个 Step
- 可以在 `next()` 前后执行逻辑
- 如果某个 Step 不调用 `next()`，后续 Step 不会执行

---

## 5. 标准能力插件设计

### 5.1 缓存（CacheStep）

**职责**
- 读缓存
- 写缓存
- 标记 `ctx.state.fromCache`

**禁止**
- 判断 HTTP 方法（由业务层决定）
- 判断业务语义（由业务层决定）

**示例：**
```typescript
class CacheStep implements RequestStep {
  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 从 meta 读取缓存配置
    const shouldCache = ctx.meta.cache === true;

    if (shouldCache) {
      const cached = this.getFromCache(ctx.config);
      if (cached) {
        ctx.result = cached;
        ctx.state.fromCache = true;
        return; // 不调用 next()，直接返回
      }
    }

    await next(); // 执行请求

    // 写入缓存
    if (shouldCache && ctx.result) {
      this.setCache(ctx.config, ctx.result);
    }
  }
}
```

### 5.2 取消（AbortStep）

**职责**
- 检查取消状态
- 使用 AbortSignal

**实现：**
```typescript
class AbortStep implements RequestStep {
  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    if (ctx.state.aborted || ctx.config.signal?.aborted) {
      ctx.state.aborted = true;
      ctx.error = new Error('Request aborted');
      return;
    }
    await next();
  }
}
```

### 5.3 重试（RetryStep）

**职责**
- 基于策略对象重试
- 不嵌套 try/catch
- 不污染 Transport

**实现：**
```typescript
class RetryStep implements RequestStep {
  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    const maxRetries = (ctx.meta.retryCount as number) || 3;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        ctx.state.retrying = i > 0;
        ctx.state.retryCount = i;
        await next();
        return; // 成功
      } catch (error) {
        if (i < maxRetries) {
          await this.delay(this.calculateDelay(i));
        } else {
          ctx.error = error;
          throw error;
        }
      }
    }
  }
}
```

### 5.4 熔断（CircuitBreakerStep）

**职责**
- 熔断保护
- 默认关闭
- 仅适用于高频 / 高价值请求

**特点**
- 不作为全局默认能力
- 通过 meta 配置启用

---

## 6. RequestClient（对外 API）

```typescript
class RequestClient {
  constructor(
    private readonly transport: Transport,
  ) {}

  with(step: RequestStep): RequestClient {
    // 链式添加步骤
  }

  request<T>(
    config: NormalizedRequestConfig,
    meta?: Record<string, unknown>
  ): Promise<T> {
    // 执行请求
  }
}
```

**可扩展用法**

```typescript
client
  .with(cacheStep)
  .with(retryStep)
  .with(circuitBreakerStep)
  .request<T>(config, meta)
```

---

## 7. 配置设计原则

❌ **禁止设计**
```typescript
config.cache = true
config.retry = 3
config.circuitBreaker = true
```

✅ **推荐设计**
```typescript
request(
  {
    url: '/list',
    method: 'GET',
  },
  {
    cache: true,
    retry: true,
    retryCount: 3,
  }
)
```

**原因：**
- `config` 只包含传输层需要的字段
- 业务配置通过 `meta` 传递
- 保持核心库的纯净性

---

## 8. 架构约束（强制）

1. **不允许在 Transport 层引入业务逻辑**
   - Transport 只负责发送请求和接收响应
   - 错误处理、Token 注入等应在 Step 中实现

2. **不允许 Step 直接相互调用**
   - Step 之间通过 Context 通信
   - 使用 `next()` 调用下一个 Step

3. **不允许 Step 修改 config**
   - `config` 是只读的
   - 需要修改配置时，创建新的配置对象

4. **所有状态变化必须写入 Context**
   - 不通过全局变量或闭包保存状态
   - 状态变化可追踪

5. **不允许新增"全局 manager"保存请求态**
   - 所有状态在 Context 中管理
   - 避免全局状态污染

6. **核心库不包含业务逻辑**
   - 不依赖业务层类型
   - 不包含业务层配置
   - 通过 `meta` 传递业务信息

---

## 9. 可测试性设计

### Step：纯单元测试

```typescript
describe('CacheStep', () => {
  it('should return cached data', async () => {
    const step = new CacheStep();
    const ctx = createRequestContext({ url: '/test', method: 'GET' });
    ctx.meta.cache = true;

    // Mock cache
    mockCache.set('/test', { data: 'cached' });

    await step.execute(ctx, async () => {
      // 不应该执行
      throw new Error('Should not execute');
    });

    expect(ctx.result).toBe('cached');
    expect(ctx.state.fromCache).toBe(true);
  });
});
```

### Executor：流程测试

```typescript
describe('RequestExecutor', () => {
  it('should execute steps in order', async () => {
    const steps = [step1, step2, step3];
    const executor = new RequestExecutor(steps);
    const order: string[] = [];

    // Mock steps to record order
    // ...

    await executor.execute(config);
    expect(order).toEqual(['step1', 'step2', 'step3']);
  });
});
```

### Transport：mock 测试

```typescript
describe('Transport', () => {
  it('should send request', async () => {
    const transport = new MockTransport();
    const response = await transport.request(config);
    expect(response.data).toBeDefined();
  });
});
```

### Context：快照测试

```typescript
describe('RequestContext', () => {
  it('should create context correctly', () => {
    const ctx = createRequestContext(config, 'test-id', { cache: true });
    expect(ctx).toMatchSnapshot();
  });
});
```

---

## 10. 与业务层集成

### 业务层包装

```typescript
// 业务层：packages/request-client
import { RequestClient, NormalizedRequestConfig } from '@suga/request-core';
import { AxiosTransport } from './AxiosTransport';
import { CacheStep, RetryStep } from './business-steps';

export class ApiClient {
  private client: RequestClient;

  constructor() {
    const transport = new AxiosTransport();
    this.client = new RequestClient(transport)
      .with(new CacheStep())
      .with(new RetryStep());
  }

  // 将业务配置转换为标准化配置
  async get<T>(url: string, config?: BusinessConfig): Promise<T> {
    const normalized: NormalizedRequestConfig = {
      url,
      method: 'GET',
      baseURL: config?.baseURL,
      timeout: config?.timeout,
      headers: config?.headers,
    };

    const meta = {
      cache: config?.cache,
      retry: config?.retry,
      loading: config?.loading,
      // ... 其他业务配置
    };

    return this.client.request<T>(normalized, meta);
  }
}
```

### 配置适配器

```typescript
// 将业务配置转换为标准化配置
function normalizeConfig(businessConfig: BusinessConfig): {
  normalized: NormalizedRequestConfig;
  meta: Record<string, unknown>;
} {
  // 分离传输层配置和业务配置
  const { url, method, baseURL, timeout, headers, ...businessFields } = businessConfig;

  return {
    normalized: { url, method, baseURL, timeout, headers },
    meta: businessFields,
  };
}
```

---

## 11. 扩展指南

### 创建自定义 Transport

```typescript
class CustomTransport implements Transport {
  async request<T>(config: NormalizedRequestConfig): Promise<TransportResponse<T>> {
    // 实现自定义传输逻辑
    // 例如：使用 WebSocket、GraphQL 等
  }
}
```

### 创建自定义 Step

```typescript
class CustomStep implements RequestStep {
  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 前置逻辑
    const startTime = Date.now();

    try {
      await next();
      // 后置逻辑（成功）
      const duration = Date.now() - startTime;
      console.log(`Request took ${duration}ms`);
    } catch (error) {
      // 错误处理
      ctx.error = this.handleError(error);
      throw ctx.error;
    }
  }
}
```

### 组合多个能力

```typescript
const client = new RequestClient(transport)
  .with(new LoggingStep())
  .with(new CacheStep())
  .with(new RetryStep())
  .with(new CircuitBreakerStep())
  .with(new TimeoutStep());
```

---

## 12. 性能考虑

1. **Context 创建开销**
   - Context 创建是轻量级的
   - 避免在 Context 中存储大量数据

2. **Step 链执行**
   - Step 链是同步执行的
   - 避免在 Step 中执行耗时操作

3. **内存管理**
   - Context 在请求完成后可被 GC
   - 避免在 Step 中保存长期引用

---

## 13. 总结

`@suga/request-core` 提供了一个纯净、可扩展的请求基础设施核心，通过以下设计实现：

1. **传输层解耦** - Transport 接口抽象
2. **能力可组合** - Step 插件机制
3. **状态集中管理** - RequestContext
4. **职责分离** - 每个组件职责单一
5. **业务逻辑隔离** - 核心库不包含业务逻辑

这使得核心库可以独立发布和维护，同时业务层可以基于核心库构建自己的请求系统。

