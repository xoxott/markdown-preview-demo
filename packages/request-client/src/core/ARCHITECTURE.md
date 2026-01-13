# 前端请求基础设施架构设计文档

## 1. 设计目标（Design Goals）

本架构用于构建一套 **框架无关、传输层无关、可扩展、可治理** 的前端请求基础设施，用于替代"Axios 二次封装 + 拦截器堆功能"的传统方案。

### 核心目标

- **传输层解耦**
  - 不绑定 Axios、fetch、XHR
  - Transport 可替换

- **能力可组合**
  - 缓存、重试、熔断、取消、降级等能力以插件方式存在
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
│ Middleware /       │ ← 能力插件（链式）
│ RequestSteps       │
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

---

## 4. 请求执行模型

### 4.1 执行器（RequestExecutor）

```typescript
class RequestExecutor {
  constructor(
    private readonly steps: RequestStep[],
  ) {}

  async execute<T>(config: RequestConfig): Promise<T> {
    const ctx = createRequestContext<T>(config)
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

---

## 5. 标准能力插件设计

### 5.1 缓存（CacheStep）

**职责**
- 读缓存
- 写缓存
- 标记 ctx.state.fromCache

**禁止**
- 判断 HTTP 方法
- 判断业务语义

### 5.2 取消（AbortStep）

- 使用 AbortController
- Abort 状态写入 ctx.state.aborted
- Transport 通过 signal 感知

### 5.3 重试（RetryStep）

- 基于策略对象
- 不嵌套 try/catch
- 不污染 Transport

### 5.4 熔断（CircuitBreakerStep）

- 默认关闭
- 仅适用于高频 / 高价值请求
- 不作为全局默认能力

---

## 6. RequestClient（对外 API）

```typescript
class RequestClient {
  constructor(
    private readonly executor: RequestExecutor,
  ) {}

  request<T>(config: RequestConfig): Promise<T> {
    return this.executor.execute<T>(config)
  }
}
```

**可扩展用法**

```typescript
client
  .with(cache(cachePolicy))
  .with(retry(retryPolicy))
  .with(circuitBreaker(breakerKey))
  .request<T>(config)
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
request({
  url: '/list',
  meta: {
    cache: cachePolicy,
    retry: retryPolicy,
  }
})
```

---

## 8. 架构约束（强制）

- 不允许在 Transport 层引入业务逻辑
- 不允许 Step 直接相互调用
- 不允许 Step 修改 config
- 所有状态变化必须写入 Context
- 不允许新增"全局 manager"保存请求态

---

## 9. 可测试性设计

- **Step**：纯单元测试
- **Executor**：流程测试
- **Transport**：mock 测试
- **Context**：快照测试

---

## 10. 使用示例

### 基础使用

```typescript
import { createRequestClient } from '@suga/request-client';

const client = createRequestClient(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

// GET 请求
const data = await client.get<User>('/user/1');

// POST 请求
const result = await client.post('/user', { name: 'John' });
```

### 链式配置

```typescript
import { RequestClient, CacheReadStep, RetryStep } from '@suga/request-client';

const client = new RequestClient(transport)
  .with(new CacheReadStep())
  .with(new RetryStep())
  .with(new CircuitBreakerStep());

const data = await client.request<User>({
  url: '/user/1',
  meta: {
    cache: cachePolicy,
    retry: retryPolicy,
  }
});
```

