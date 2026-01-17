# @suga/request-abort

请求中止机制，用于管理和中止 HTTP 请求。使用原生 `AbortController` API，通过 Step 方式集成到 `@suga/request-core`。

## 📦 安装

```bash
pnpm add @suga/request-abort
```

## 🚀 快速开始

### 基本使用（Step 方式）

```typescript
import { RequestClient } from '@suga/request-core';
import { CancelStep } from '@suga/request-abort';
// 注意：AxiosTransport 应该在业务层实现，这里仅作示例
// 业务层需要创建 Transport 实例，实现 Transport 接口

// 创建传输层（示例：需要业务层实现 AxiosTransport）
// const transport = new AxiosTransport({ instance: axios.create() });

// 创建客户端并添加中止步骤
const client = new RequestClient(transport)
  .with(new CancelStep());

// 发起请求（默认启用中止）
await client.request({
  url: '/api/users',
  method: 'GET',
}, {
  cancelable: true, // 启用中止（默认启用，可省略）
});

// 禁用中止
await client.request({
  url: '/api/users',
  method: 'GET',
}, {
  cancelable: false, // 禁用中止
});
```

### 中止请求

```typescript
import { CancelStep } from '@suga/request-abort';

// 创建 CancelStep 实例（通常在创建客户端时创建）
const cancelStep = new CancelStep();
const client = new RequestClient(transport)
  .with(cancelStep);

// 获取 AbortControllerManager
const abortControllerManager = cancelStep.getAbortControllerManager();

// 中止指定请求（使用请求的 ctx.id，ctx.id 在 core 中自动生成）
abortControllerManager.cancel('request_id', '用户中止操作');

// 中止所有请求
abortControllerManager.cancelAll('页面切换，中止所有请求');
```

### 中止所有请求

```typescript
// 中止所有待处理的请求
abortControllerManager.cancelAll('页面切换，中止所有请求');
```

### 按条件中止请求

```typescript
// 中止所有匹配条件的请求
const count = abortControllerManager.cancelBy(
  (config) => config.url?.startsWith('/api/search'),
  '搜索条件已改变'
);
console.log(`已中止 ${count} 个请求`);
```

### 配置选项

```typescript
import { CancelStep } from '@suga/request-abort';

// 配置 CancelStep
const cancelStep = new CancelStep({
  // 自定义 AbortControllerManager
  abortControllerManager: new AbortControllerManager({
    // 是否在创建新 controller 时自动中止旧请求，默认 true
    autoCancelPrevious: true,
    // 默认中止消息
    defaultCancelMessage: '请求已中止',
  }),
  // 默认中止配置
  defaultOptions: {
    enabled: true, // 默认启用
    autoCancelPrevious: true, // 自动中止旧请求
  },
});
```

## 📚 API

### `CancelStep`

中止步骤，用于在请求链中管理请求中止。

#### 构造函数

```typescript
new CancelStep(options?: CancelStepOptions)
```

**参数：**
- `options.abortControllerManager?: AbortControllerManager` - AbortController 管理器实例
- `options.defaultOptions?: CancelOptions` - 默认中止配置

#### 方法

- `getAbortControllerManager()`: 获取 AbortController 管理器
  - 返回: `AbortControllerManager`

### `AbortControllerManager`

AbortController 管理器，使用原生 Web API `AbortController` 管理请求中止。

#### 构造函数

```typescript
new AbortControllerManager(options?: AbortControllerManagerOptions)
```

**参数：**
- `options.autoCancelPrevious?: boolean` - 是否在创建新 controller 时自动中止旧请求，默认 `true`
- `options.defaultCancelMessage?: string` - 默认中止消息，默认 `'请求已取消'`

#### 方法

- `createAbortController(requestId, config?)`: 创建 AbortController
  - 参数:
    - `requestId: string` - 请求标识
    - `config?: CancelableRequestConfig` - 请求配置（可选，用于按条件中止）
  - 返回: `AbortController`

- `cancel(requestId, message?)`: 中止指定请求
  - 参数:
    - `requestId: string` - 请求标识
    - `message?: string` - 中止原因（注意：AbortController 不支持自定义消息，消息仅用于日志）

- `cancelAll(message?)`: 中止所有请求
  - 参数:
    - `message?: string` - 中止原因（注意：AbortController 不支持自定义消息，消息仅用于日志）

- `cancelBy(predicate, message?)`: 按条件中止请求
  - 参数:
    - `predicate: (config: CancelableRequestConfig) => boolean` - 中止条件函数
    - `message?: string` - 中止原因（注意：AbortController 不支持自定义消息，消息仅用于日志）
  - 返回: `number` - 中止的请求数量

- `remove(requestId)`: 移除 AbortController（请求完成后调用）
  - 参数:
    - `requestId: string` - 请求标识

- `get(requestId)`: 获取 AbortController
  - 参数:
    - `requestId: string` - 请求标识
  - 返回: `AbortController | undefined`

- `has(requestId)`: 检查请求是否存在
  - 参数:
    - `requestId: string` - 请求标识
  - 返回: `boolean`

- `getPendingCount()`: 获取当前待中止的请求数量
  - 返回: `number`

- `clear()`: 清除所有请求记录（不中止请求）

## 💡 使用示例

### 基本使用

```typescript
import { RequestClient } from '@suga/request-core';
import { CancelStep } from '@suga/request-abort';
// 注意：AxiosTransport 应该在业务层实现
// const transport = new AxiosTransport({ instance: axios.create() });

const cancelStep = new CancelStep();
// const client = new RequestClient(transport).with(cancelStep);

// 发起请求
const requestPromise = client.request({
  url: '/api/users',
  method: 'GET',
});

// 中止请求
const abortControllerManager = cancelStep.getAbortControllerManager();
// 假设我们知道 requestId（实际使用中需要通过其他方式获取）
abortControllerManager.cancel('request_id', '用户中止操作');
```

### 按条件中止

```typescript
// 中止所有搜索相关的请求
const count = abortControllerManager.cancelBy(
  (config) => config.url?.includes('/search'),
  '搜索条件已改变'
);
console.log(`已中止 ${count} 个搜索请求`);
```

### 自动中止旧请求

```typescript
// 如果同一个 requestId 发起新请求，自动中止旧请求
const cancelStep = new CancelStep({
  abortControllerManager: new AbortControllerManager({
    autoCancelPrevious: true, // 默认 true
  }),
});
```

## 📝 注意事项

1. **AbortController 不支持自定义消息**：`abort()` 方法可以传入消息，但 AbortController 不会在 signal 上暴露这个消息。消息仅用于内部日志记录。

2. **事件监听**：使用 `signal.addEventListener('abort', callback)` 监听中止事件，事件是同步触发的。

3. **请求标识**：使用 `ctx.id` 作为请求标识，该 ID 在 `@suga/request-core` 中自动生成。

4. **自动清理**：请求完成后（成功或失败）会自动清理 AbortController，无需手动调用 `remove()`。

5. **原生 API**：本包使用原生 Web API `AbortController`，不依赖任何第三方库，与现代浏览器和 Node.js 18+ 兼容。

