# @suga/request-cancel

请求取消机制，用于管理和取消 HTTP 请求。通过 Step 方式集成到 `@suga/request-core`。

## 📦 安装

```bash
pnpm add @suga/request-cancel
```

## 🚀 快速开始

### 基本使用（Step 方式）

```typescript
import { RequestClient } from '@suga/request-core';
import { CancelStep } from '@suga/request-cancel';
import { AxiosTransport } from '@suga/request-client';

// 创建传输层
const transport = new AxiosTransport({ instance: axios.create() });

// 创建客户端并添加取消步骤
const client = new RequestClient(transport)
  .with(new CancelStep());

// 发起请求（默认启用取消）
await client.request({
  url: '/api/users',
  method: 'GET',
}, {
  cancelable: true, // 启用取消（默认启用，可省略）
});

// 禁用取消
await client.request({
  url: '/api/users',
  method: 'GET',
}, {
  cancelable: false, // 禁用取消
});
```

### 取消请求

```typescript
import { CancelStep } from '@suga/request-cancel';

// 创建 CancelStep 实例（通常在创建客户端时创建）
const cancelStep = new CancelStep();
const client = new RequestClient(transport)
  .with(cancelStep);

// 获取 CancelTokenManager
const cancelTokenManager = cancelStep.getCancelTokenManager();

// 取消指定请求（使用请求的 ctx.id，ctx.id 在 core 中自动生成）
cancelTokenManager.cancel('request_id', '用户取消操作');

// 取消所有请求
cancelTokenManager.cancelAll('页面切换，取消所有请求');
```

### 取消所有请求

```typescript
// 取消所有待处理的请求
cancelTokenManager.cancelAll('页面切换，取消所有请求');
```

### 按条件取消请求

```typescript
// 取消所有匹配条件的请求
const count = cancelTokenManager.cancelBy(
  (config) => config.url?.startsWith('/api/search'),
  '搜索条件已改变'
);
console.log(`已取消 ${count} 个请求`);
```

### 配置选项

```typescript
import { CancelStep } from '@suga/request-cancel';

// 配置 CancelStep
const cancelStep = new CancelStep({
  // 自定义 CancelTokenManager
  cancelTokenManager: new CancelTokenManager({
    // 是否在创建新token时自动取消旧请求，默认 true
    autoCancelPrevious: true,
    // 默认取消消息
    defaultCancelMessage: '请求已取消',
  }),
  // 默认取消配置
  defaultOptions: {
    enabled: true, // 默认启用
    autoCancelPrevious: true, // 自动取消旧请求
  },
});

const client = new RequestClient(transport)
  .with(cancelStep);
```

## 📚 API

### CancelStep

取消步骤，实现 `RequestStep` 接口，通过 Step 方式集成到请求流程中。

#### 构造函数选项

```typescript
interface CancelStepOptions {
  /** 取消Token管理器实例 */
  cancelTokenManager?: CancelTokenManager;
  /** 默认取消配置 */
  defaultOptions?: CancelOptions;
}
```

#### 方法

- `getCancelTokenManager()`: 获取取消Token管理器
  - 返回: `CancelTokenManager`
  - 用于外部取消请求

#### 配置选项

```typescript
interface CancelOptions {
  /** 是否启用取消功能，默认 true */
  enabled?: boolean;
  /** 是否在创建新token时自动取消旧请求，默认 true */
  autoCancelPrevious?: boolean;
}
```

### CancelTokenManager

取消Token管理器，管理所有请求的取消Token。

#### 构造函数选项

```typescript
interface CancelTokenManagerOptions {
  /** 是否在创建新token时自动取消旧请求，默认 true */
  autoCancelPrevious?: boolean;
  /** 默认取消消息 */
  defaultCancelMessage?: string;
}
```

#### 方法

- `createCancelToken(requestId, config?)`: 创建取消Token
  - `requestId`: 请求唯一标识
  - `config`: 请求配置（可选，用于按条件取消）
  - 返回: `CancelTokenSource`

- `cancel(requestId, message?)`: 取消指定请求
  - `requestId`: 请求标识
  - `message`: 取消原因（可选）

- `cancelAll(message?)`: 取消所有请求
  - `message`: 取消原因（可选）

- `cancelBy(predicate, message?)`: 按条件取消请求
  - `predicate`: 取消条件函数
  - `message`: 取消原因（可选）
  - 返回: 取消的请求数量

- `remove(requestId)`: 移除取消Token（请求完成后调用）
  - `requestId`: 请求标识

- `get(requestId)`: 获取取消Token
  - `requestId`: 请求标识
  - 返回: `CancelTokenSource | undefined`

- `has(requestId)`: 检查请求是否存在
  - `requestId`: 请求标识
  - 返回: `boolean`

- `getPendingCount()`: 获取当前待取消的请求数量
  - 返回: `number`

- `clear()`: 清除所有请求记录（不取消请求）

### generateRequestId

生成请求ID的工具函数（用于手动管理请求时）。

```typescript
function generateRequestId(url: string, method: string, params?: unknown): string
```

**注意**：在使用 `CancelStep` 时，请求ID（`ctx.id`）会在 `@suga/request-core` 中自动生成，无需手动调用此函数。

## 📝 使用示例

### 示例 1：在请求客户端中使用（推荐方式）

```typescript
import { RequestClient } from '@suga/request-core';
import { CancelStep } from '@suga/request-cancel';
import { AxiosTransport } from '@suga/request-client';

// 创建 CancelStep 实例
const cancelStep = new CancelStep();

// 创建客户端并添加取消步骤
const client = new RequestClient(new AxiosTransport({ instance: axios.create() }))
  .with(cancelStep);

// 发起请求（默认启用取消）
const promise = client.request({
  url: '/api/users',
  method: 'GET',
}, {
  cancelable: true, // 可省略，默认启用
});

// 取消请求（使用 ctx.id，通常由业务层管理）
const cancelTokenManager = cancelStep.getCancelTokenManager();
cancelTokenManager.cancel('request_id');
```

### 示例 2：页面切换时取消所有请求

```typescript
import { CancelStep } from '@suga/request-cancel';

// 创建 CancelStep 实例（通常在应用初始化时创建）
const cancelStep = new CancelStep();
const client = new RequestClient(transport)
  .with(cancelStep);

// 在路由守卫中
router.beforeEach((to, from, next) => {
  // 取消所有待处理的请求
  const cancelTokenManager = cancelStep.getCancelTokenManager();
  cancelTokenManager.cancelAll('路由切换');
  next();
});
```

### 示例 3：搜索时自动取消之前的搜索请求

```typescript
import { RequestClient } from '@suga/request-core';
import { CancelStep } from '@suga/request-cancel';

// 创建客户端（CancelStep 会自动取消相同 requestId 的旧请求）
const cancelStep = new CancelStep();
const client = new RequestClient(transport)
  .with(cancelStep);

async function search(keyword: string) {
  try {
    // 如果存在相同的搜索请求（相同的 URL、方法、参数），
    // CancelStep 会自动取消之前的请求
    const result = await client.request({
      url: '/api/search',
      method: 'GET',
      params: { keyword },
    }, {
      cancelable: true, // 启用取消（默认启用）
    });
    return result;
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log('搜索请求已取消');
      return;
    }
    throw error;
  }
}
```

### 示例 4：使用自定义 requestId

```typescript
// 如果需要在业务层指定自定义 requestId
await client.request({
  url: '/api/users',
  method: 'GET',
}, {
  cancelable: true,
  requestId: 'custom_request_id', // 自定义 requestId
});

// 使用自定义 requestId 取消请求
const cancelTokenManager = cancelStep.getCancelTokenManager();
cancelTokenManager.cancel('custom_request_id');
```

## 🏗️ 架构

```
request-cancel/
├── src/
│   ├── constants.ts              # 常量配置
│   ├── types.ts                  # 类型定义
│   ├── steps/
│   │   └── CancelStep.ts         # 取消步骤（实现 RequestStep）
│   ├── managers/
│   │   └── CancelTokenManager.ts # 取消Token管理器
│   ├── utils/
│   │   └── requestId.ts          # 请求ID生成工具（可选）
│   └── index.ts                  # 入口文件
```

## 🔧 实现细节

1. **Step 集成**：通过 `CancelStep` 实现 `RequestStep` 接口，集成到请求流程中
2. **Token管理**：使用 `CancelTokenManager` 的 Map 存储所有请求的 CancelTokenSource
3. **自动取消**：默认在创建新token时自动取消相同 `ctx.id` 的旧请求
4. **请求ID**：使用 `@suga/request-core` 自动生成的 `ctx.id` 作为请求标识
5. **条件取消**：支持按条件函数批量取消请求
6. **自动清理**：请求完成后自动清理token记录
7. **配置传递**：通过 `meta.cancelable` 传递取消配置，与 `RequestConfig` 保持一致

## 🔗 与 request-client 集成

`@suga/request-client` 已经默认集成了 `CancelStep`，无需手动添加：

```typescript
import { createRequestClient } from '@suga/request-client';

// 创建客户端（已包含 CancelStep）
const client = createRequestClient();

// 发起请求（默认启用取消）
await client.get('/api/users', {}, {
  cancelable: true, // 可省略，默认启用
});

// 如果需要访问 CancelTokenManager，可以通过 createRequestClient 的配置获取
// 或者直接创建 CancelStep 实例
```

## 📄 License

MIT

