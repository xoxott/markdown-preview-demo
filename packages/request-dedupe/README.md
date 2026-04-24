# @suga/request-dedupe

请求去重机制，防止重复请求。相同请求在时间窗口内只发送一次，后续请求会复用第一个请求的 Promise。

## 📦 安装

```bash
pnpm add @suga/request-dedupe
```

## 🚀 快速开始

### 基本使用

```typescript
import { RequestClient } from '@suga/request-core';
import { DedupeStep } from '@suga/request-dedupe';

// 创建带去重步骤的请求客户端
const client = new RequestClient(transport, [
  new DedupeStep()
  // ... 其他步骤
]);

// 在 meta 中启用去重
await client.request({
  url: '/api/users',
  method: 'GET',
  meta: {
    dedupe: true // 启用去重
  }
});
```

### 配置去重选项

```typescript
import { DedupeStep } from '@suga/request-dedupe';

const dedupeStep = new DedupeStep({
  defaultOptions: {
    dedupeWindow: 2000, // 2 秒内相同请求只发送一次
    strategy: 'exact' // 精确匹配
  }
});

const client = new RequestClient(transport).with(dedupeStep);
```

### 使用自定义管理器

```typescript
import { DedupeManager, DedupeStep } from '@suga/request-dedupe';

const dedupeManager = new DedupeManager({
  dedupeWindow: 1000 // 只设置时间窗口
});

const dedupeStep = new DedupeStep({
  dedupeManager,
  defaultOptions: {
    strategy: 'ignore-params',
    ignoreParams: ['timestamp']
  }
});

const client = new RequestClient(transport).with(dedupeStep);
```

注意：`DedupeManager` 构造函数只使用 `dedupeWindow` 选项，策略相关的配置（`strategy`、`ignoreParams`、`customKeyGenerator`）应在 `DedupeStep` 的 `defaultOptions` 中配置。

## 📚 API

### DedupeStep

去重步骤，实现 `RequestStep` 接口。

#### 构造函数选项

```typescript
interface DedupeStepOptions {
  /** 去重管理器实例 */
  dedupeManager?: DedupeManager;
  /** 默认去重配置 */
  defaultOptions?: DedupeOptions;
}
```

### DedupeManager

去重管理器，管理待处理的请求。

#### 构造函数选项

```typescript
interface DedupeOptions {
  /** 去重时间窗口（毫秒），默认 1000ms */
  dedupeWindow?: number;
  /** 去重策略，默认 'exact' */
  strategy?: 'exact' | 'ignore-params' | 'custom';
  /** 忽略的参数名列表（仅在 strategy 为 'ignore-params' 时有效） */
  ignoreParams?: string[];
  /** 自定义键生成函数（仅在 strategy 为 'custom' 时有效） */
  customKeyGenerator?: (config: NormalizedRequestConfig) => string;
}
```

#### 方法

- `getOrCreateRequestByKey<T>(key, requestFn)`: 通过键获取或创建请求
  - `key`: 请求唯一标识（通常使用 `ctx.id`）
  - `requestFn`: 请求函数，返回 Promise
- `clear()`: 清除所有待处理的请求
- `getPendingCount()`: 获取当前待处理的请求数量
- `setDedupeWindow(window)`: 设置去重时间窗口

## 🎯 去重策略

### 1. exact（精确匹配）

默认策略，完全匹配请求的 URL、方法、参数和数据。

```typescript
{
  strategy: 'exact',
}
```

### 2. ignore-params（忽略参数）

忽略指定的参数，只匹配 URL 和方法。

```typescript
{
  strategy: 'ignore-params',
  ignoreParams: ['timestamp', 'nonce'],
}
```

如果不指定 `ignoreParams`，则忽略所有参数。

### 3. custom（自定义）

使用自定义函数生成请求键。

```typescript
{
  strategy: 'custom',
  customKeyGenerator: (config) => {
    return `${config.method}_${config.url}`;
  },
}
```

## 📝 使用示例

### 示例 1：防止重复搜索请求

```typescript
// 用户快速输入时，防止发送重复的搜索请求
const client = new RequestClient(transport).with(
  new DedupeStep({
    defaultOptions: {
      dedupeWindow: 500, // 500ms 内相同请求只发送一次
      strategy: 'ignore-params',
      ignoreParams: ['timestamp']
    }
  })
);

// 多次快速调用，只会发送一次请求
await client.request({
  url: '/api/search',
  method: 'GET',
  params: { keyword: 'test' },
  meta: { dedupe: true }
});
await client.request({
  url: '/api/search',
  method: 'GET',
  params: { keyword: 'test' },
  meta: { dedupe: true }
});
```

### 示例 2：禁用特定请求的去重

```typescript
// 在 meta 中显式禁用去重
await client.get(
  '/api/data',
  {},
  {
    meta: {
      dedupe: false // 禁用去重
    }
  }
);
```

### 示例 3：自定义键生成

```typescript
const dedupeStep = new DedupeStep({
  defaultOptions: {
    strategy: 'custom',
    customKeyGenerator: config => {
      // 只根据 URL 和方法生成键，忽略所有参数
      return `${config.method}_${config.url}`;
    }
  }
});
```

## 🏗️ 架构

```
request-dedupe/
├── src/
│   ├── constants.ts          # 常量配置
│   ├── types.ts              # 类型定义
│   ├── managers/
│   │   └── DedupeManager.ts  # 去重管理器
│   ├── steps/
│   │   └── DedupeStep.ts    # 去重步骤
│   ├── utils/
│   │   └── key-generator.ts  # 键生成器
│   └── index.ts              # 入口文件
```

## 🔧 实现细节

1. **请求键生成**：根据策略生成唯一的请求键
2. **时间窗口**：在时间窗口内的相同请求会复用 Promise
3. **自动清理**：自动清理过期的请求记录
4. **错误处理**：请求失败时立即移除记录，避免阻塞后续请求

## 📄 License

MIT
