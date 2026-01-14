# @suga/request-retry

为 `@suga/request-core` 提供的请求重试机制包。

## 特性

- ✅ 灵活的重试策略（可自定义）
- ✅ 指数退避延迟算法
- ✅ 支持按错误类型配置重试策略
- ✅ RequestStep 集成（RetryStep）
- ✅ 支持超时重试控制
- ✅ TypeScript 完整支持
- ✅ 框架无关和传输层无关

## 安装

```bash
npm install @suga/request-retry
```

## 使用方法

### 基础用法

```typescript
import { RetryStep } from '@suga/request-retry';
import { RequestClient } from '@suga/request-core';

// 创建带重试步骤的请求客户端
const client = new RequestClient(transport)
  .with(new RetryStep());

// 在请求中使用重试
const result = await client.request({
  url: '/api/users',
  method: 'GET',
}, {
  retry: true, // 启用重试
  retryCount: 3, // 最多重试 3 次
  retryOnTimeout: true, // 超时时也重试
});
```

### 自定义重试策略

```typescript
import { RetryStrategy, RetryMeta } from '@suga/request-retry';
import type { RetryableError } from '@suga/request-retry';

const customStrategy: RetryStrategy = {
  enabled: true,
  maxRetries: 5,
  shouldRetry: (error: RetryableError, attempt: number) => {
    // 自定义重试逻辑
    if (error.status === 429) {
      return attempt < 3; // 429 错误最多重试 3 次
    }
    return attempt < 5; // 其他错误最多重试 5 次
  },
  retryDelay: (attempt: number, error: RetryableError) => {
    // 自定义延迟逻辑
    if (error.status === 429) {
      return 2000 * (attempt + 1); // 429 错误使用线性延迟
    }
    return 1000 * Math.pow(2, attempt); // 其他错误使用指数退避
  },
};

const meta: RetryMeta = {
  retry: customStrategy,
};

const result = await client.request({
  url: '/api/users',
  method: 'GET',
}, meta);
```

### 使用 retryRequest 函数

```typescript
import { retryRequest } from '@suga/request-retry';

// 直接使用 retryRequest 函数
const result = await retryRequest(
  async () => {
    return await fetch('/api/users').then((res) => res.json());
  },
  {
    retry: true,
    retryCount: 3,
    retryOnTimeout: true,
  },
);
```

### 按错误类型配置重试策略

```typescript
import { RetryStrategy } from '@suga/request-retry';

const strategy: RetryStrategy = {
  enabled: true,
  maxRetries: 5,
  shouldRetry: (error, attempt) => attempt < 5,
  retryDelay: (attempt) => 1000 * Math.pow(2, attempt),
  errorTypeStrategy: {
    timeout: {
      maxRetries: 3,
      delay: 2000, // 超时错误固定延迟 2 秒
    },
    network: {
      maxRetries: 5,
      delay: 1000, // 网络错误固定延迟 1 秒
    },
    server: {
      maxRetries: 3,
      delay: 3000, // 服务器错误固定延迟 3 秒
    },
  },
};
```

## API

### RetryStep

重试步骤类，用于请求管道。

#### 构造函数选项

```typescript
interface RetryStepOptions {
  /** 默认重试策略 */
  defaultStrategy?: RetryStrategy;
}
```

#### 使用示例

```typescript
class RetryStep implements RequestStep {
  constructor(options?: RetryStepOptions);
  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void>;
}
```

### retryRequest

重试请求函数。

```typescript
function retryRequest<T>(
  requestFn: () => Promise<T>,
  config?: RetryConfig,
  strategy?: RetryStrategy,
): Promise<T>;
```

### shouldRetry

判断是否应该重试。

```typescript
function shouldRetry(
  error: RetryableError,
  strategy?: RetryStrategy,
  attempt?: number,
  retryOnTimeout?: boolean,
): boolean;
```

### calculateRetryDelay

计算重试延迟时间。

```typescript
function calculateRetryDelay(
  retryCount: number,
  baseDelay?: number,
  error?: RetryableError,
  strategy?: RetryStrategy,
): number;
```

### RetryStrategy

重试策略接口。

```typescript
interface RetryStrategy {
  enabled: boolean;
  maxRetries: number;
  retryDelay: (attempt: number, error: RetryableError) => number;
  shouldRetry: (error: RetryableError, attempt: number) => boolean;
  errorTypeStrategy?: {
    timeout?: { maxRetries: number; delay: number };
    network?: { maxRetries: number; delay: number };
    server?: { maxRetries: number; delay: number };
    client?: { maxRetries: number; delay: number };
  };
}
```

### RetryMeta

重试元数据接口。

```typescript
interface RetryMeta {
  /**
   * 重试配置
   * - `true`: 启用重试（使用默认策略）
   * - `false`: 禁用重试
   * - `RetryStrategy`: 使用自定义策略
   * - `RetryConfig`: 使用配置对象
   */
  retry?: boolean | RetryStrategy | RetryConfig;
  [key: string]: unknown;
}
```

## 架构

包的组织结构如下：

```
src/
├── index.ts                    # 主导出文件
├── constants.ts                # 常量定义
├── types.ts                    # 类型定义（ErrorType, RetryableError, RetryStrategy, RetryConfig, RetryMeta）
├── steps/                      # 请求步骤
│   └── RetryStep.ts
└── utils/                      # 工具函数
    ├── error-utils.ts         # 错误工具函数
    ├── retry-utils.ts         # 重试工具函数
    └── retry-request.ts       # 重试请求函数
```

## 设计原则

1. **通用性**：不依赖特定的错误库（如 axios），使用通用错误接口
2. **可扩展性**：通过策略模式支持自定义重试逻辑
3. **类型安全**：完整的 TypeScript 类型定义
4. **框架无关**：可以与任何请求库配合使用

## 默认行为

- **默认重试次数**：3 次
- **默认延迟**：1000 毫秒
- **延迟算法**：指数退避（2^n * baseDelay）
- **最大延迟**：10000 毫秒
- **可重试状态码**：408（请求超时）、429（请求过多）、5xx（服务器错误）
- **超时重试**：默认不重试超时错误，需要显式设置 `retryOnTimeout: true`

## 许可证

MIT

