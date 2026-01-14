# @suga/request-queue

请求队列和并发控制机制，支持控制请求并发数量，避免服务器压力过大。

## 📦 安装

```bash
pnpm add @suga/request-queue
```

## 🚀 快速开始

### 基本使用

```typescript
import { RequestClient } from '@suga/request-core';
import { QueueStep } from '@suga/request-queue';

// 创建请求客户端（需要提供 transport）
const client = new RequestClient(transport)
  .with(new QueueStep({
    defaultConfig: {
      maxConcurrent: 5, // 最大并发数为 5
      queueStrategy: 'fifo', // FIFO 策略
    },
  }));

// 在 meta 中启用队列
await client.request({
  url: '/api/users',
  method: 'GET',
  meta: {
    queue: true, // 启用队列
  },
});
```

### 配置队列选项

```typescript
import { RequestClient } from '@suga/request-core';
import { QueueStep } from '@suga/request-queue';

const queueStep = new QueueStep({
  defaultConfig: {
    maxConcurrent: 10, // 最大并发数为 10
    queueStrategy: 'priority', // 优先级策略
  },
});

const client = new RequestClient(transport)
  .with(queueStep);
```

### 使用自定义管理器

```typescript
import { RequestClient } from '@suga/request-core';
import { QueueManager, QueueStep } from '@suga/request-queue';

const queueManager = new QueueManager({
  maxConcurrent: 5,
  queueStrategy: 'priority',
});

const queueStep = new QueueStep({
  queueManager,
});

const client = new RequestClient(transport)
  .with(queueStep);
```

### 设置请求优先级

```typescript
// 高优先级请求
await client.request({
  url: '/api/important',
  method: 'GET',
  meta: {
    queue: true,
    priority: 'high',
  },
});

// 低优先级请求
await client.request({
  url: '/api/background',
  method: 'GET',
  meta: {
    queue: true,
    priority: 'low',
  },
});
```

## 📚 API

### QueueStep

队列步骤，实现 `RequestStep` 接口。

#### 构造函数选项

```typescript
interface QueueStepOptions {
  /** 队列管理器实例 */
  queueManager?: QueueManager;
  /** 默认队列配置 */
  defaultConfig?: QueueConfig;
}
```

### QueueManager

队列管理器，管理请求队列和并发控制。

#### 构造函数选项

```typescript
interface QueueConfig {
  /** 最大并发数 */
  maxConcurrent: number;
  /** 队列策略 */
  queueStrategy?: 'fifo' | 'priority';
}
```

#### 方法

- `enqueue<T>(config: NormalizedRequestConfig, requestFn: () => Promise<T>, priority?: RequestPriority): Promise<T>`: 添加请求到队列
- `getQueueLength()`: 获取队列长度
- `getRunningCount()`: 获取运行中的请求数量
- `clear()`: 清空队列
- `updateConfig(config: Partial<QueueConfig>)`: 更新配置

### createRequestQueue

创建请求队列管理器的工厂函数。

```typescript
import { createRequestQueue } from '@suga/request-queue';

const queueManager = createRequestQueue({
  maxConcurrent: 10,
  queueStrategy: 'fifo',
});
```

## 🎯 队列策略

### 1. FIFO（先进先出）

默认策略，按照请求加入队列的顺序执行。

```typescript
{
  queueStrategy: 'fifo',
}
```

### 2. Priority（优先级）

按照请求优先级执行，高优先级请求优先执行。

```typescript
{
  queueStrategy: 'priority',
}
```

优先级等级：
- `high`: 高优先级（优先级值：3）
- `normal`: 普通优先级（优先级值：2，默认）
- `low`: 低优先级（优先级值：1）

## 📝 使用示例

### 示例 1：控制并发数量

```typescript
import { RequestClient } from '@suga/request-core';
import { QueueStep } from '@suga/request-queue';

// 限制最多同时发送 3 个请求
const client = new RequestClient(transport)
  .with(new QueueStep({
    defaultConfig: {
      maxConcurrent: 3,
      queueStrategy: 'fifo',
    },
  }));

// 发送多个请求，最多同时执行 3 个
for (let i = 0; i < 10; i++) {
  client.request({
    url: `/api/data/${i}`,
    method: 'GET',
    meta: { queue: true },
  });
}
```

### 示例 2：优先级队列

```typescript
import { RequestClient } from '@suga/request-core';
import { QueueStep } from '@suga/request-queue';

const client = new RequestClient(transport)
  .with(new QueueStep({
    defaultConfig: {
      maxConcurrent: 5,
      queueStrategy: 'priority',
    },
  }));

// 高优先级请求会优先执行
await client.request({
  url: '/api/important',
  method: 'GET',
  meta: {
    queue: true,
    priority: 'high',
  },
});

// 低优先级请求会等待高优先级请求完成
await client.request({
  url: '/api/background',
  method: 'GET',
  meta: {
    queue: true,
    priority: 'low',
  },
});
```

### 示例 3：禁用特定请求的队列

```typescript
// 在 meta 中显式禁用队列
await client.request({
  url: '/api/data',
  method: 'GET',
  meta: {
    queue: false, // 禁用队列
  },
});
```

### 示例 4：动态配置队列

```typescript
// 为特定请求配置不同的队列参数
await client.request({
  url: '/api/data',
  method: 'GET',
  meta: {
    queue: {
      maxConcurrent: 2, // 使用更小的并发数
      queueStrategy: 'priority',
    },
    priority: 'high',
  },
});
```

## 🏗️ 架构

```
request-queue/
├── src/
│   ├── constants.ts          # 常量配置
│   ├── types.ts              # 类型定义
│   ├── managers/
│   │   └── QueueManager.ts   # 队列管理器
│   ├── steps/
│   │   └── QueueStep.ts     # 队列步骤
│   └── index.ts              # 入口文件
```

## 🔧 实现细节

1. **队列管理**：使用数组存储待处理的请求
2. **并发控制**：使用 Set 跟踪运行中的请求
3. **优先级排序**：优先级策略下，按优先级值排序，相同优先级按创建时间排序
4. **自动处理**：请求完成后自动处理下一个请求

## 📄 License

MIT

