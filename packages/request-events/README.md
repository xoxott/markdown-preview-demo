# @suga/request-events

请求事件系统，支持监听请求生命周期事件，提供更好的扩展性。

## 📦 安装

```bash
pnpm add @suga/request-events
```

## 🚀 快速开始

### 基本使用

```typescript
import { RequestClient } from '@suga/request-core';
import { EventStep, onRequestStart, onRequestSuccess, onRequestError } from '@suga/request-events';

// 创建请求客户端（需要提供 transport）
const client = new RequestClient(transport).with(new EventStep());

// 监听请求开始事件
onRequestStart(data => {
  console.log('Request started:', data.config.url);
});

// 监听请求成功事件
onRequestSuccess(data => {
  console.log('Request succeeded:', data.config.url, `(${data.duration}ms)`);
});

// 监听请求错误事件
onRequestError(data => {
  console.error('Request failed:', data.config.url, data.error);
});

// 发送请求
await client.request({
  url: '/api/users',
  method: 'GET'
});
```

### 使用自定义事件管理器

```typescript
import { RequestClient } from '@suga/request-core';
import { EventManager, EventStep } from '@suga/request-events';

const eventManager = new EventManager();

const eventStep = new EventStep({
  eventManager
});

const client = new RequestClient(transport).with(eventStep);

// 使用自定义管理器监听事件
eventManager.on('request:start', data => {
  console.log('Request started:', data.config.url);
});
```

## 📚 API

### EventStep

事件步骤，实现 `RequestStep` 接口，负责触发请求生命周期事件。

#### 构造函数选项

```typescript
interface EventStepOptions {
  /** 事件管理器实例 */
  eventManager?: EventManager;
}
```

### EventManager

事件管理器，管理事件监听器。

#### 方法

- `on<T>(event, handler)`: 监听事件
- `off<T>(event, handler)`: 取消监听事件
- `emit<T>(event, data)`: 触发事件
- `removeAllListeners(event?)`: 移除所有事件监听器
- `listenerCount(event)`: 获取事件监听器数量
- `eventNames()`: 获取所有事件类型

### 便捷函数

- `onRequestStart(handler)`: 监听请求开始事件
- `onRequestSuccess(handler)`: 监听请求成功事件
- `onRequestError(handler)`: 监听请求错误事件
- `onRequestComplete(handler)`: 监听请求完成事件
- `offRequestStart(handler)`: 取消监听请求开始事件
- `offRequestSuccess(handler)`: 取消监听请求成功事件
- `offRequestError(handler)`: 取消监听请求错误事件
- `offRequestComplete(handler)`: 取消监听请求完成事件
- `removeAllEventListeners(event?)`: 移除所有事件监听器

## 🎯 事件类型

### 1. request:start（请求开始）

请求开始时触发。

```typescript
onRequestStart(data => {
  console.log('Request started:', data.config.url);
  console.log('Timestamp:', data.timestamp);
});
```

事件数据：

```typescript
interface RequestStartEventData {
  config: NormalizedRequestConfig;
  timestamp: number;
}
```

### 2. request:success（请求成功）

请求成功时触发。

```typescript
onRequestSuccess(data => {
  console.log('Request succeeded:', data.config.url);
  console.log('Result:', data.result);
  console.log('Duration:', data.duration, 'ms');
});
```

事件数据：

```typescript
interface RequestSuccessEventData<T = unknown> {
  config: NormalizedRequestConfig;
  result: T;
  timestamp: number;
  duration: number;
}
```

### 3. request:error（请求错误）

请求失败时触发。

```typescript
onRequestError(data => {
  console.error('Request failed:', data.config.url);
  console.error('Error:', data.error);
  console.error('Duration:', data.duration, 'ms');
});
```

事件数据：

```typescript
interface RequestErrorEventData {
  config: NormalizedRequestConfig;
  error: unknown;
  timestamp: number;
  duration: number;
}
```

### 4. request:complete（请求完成）

请求完成时触发（无论成功或失败）。

```typescript
onRequestComplete(data => {
  console.log('Request completed:', data.config.url);
  console.log('Success:', data.success);
  console.log('Duration:', data.duration, 'ms');
});
```

事件数据：

```typescript
interface RequestCompleteEventData {
  config: NormalizedRequestConfig;
  timestamp: number;
  duration: number;
  success: boolean;
}
```

## 📝 使用示例

### 示例 1：性能监控

```typescript
import { onRequestStart, onRequestComplete } from '@suga/request-events';

const performanceData: Array<{ url: string; duration: number }> = [];

onRequestStart(data => {
  // 记录请求开始时间
});

onRequestComplete(data => {
  performanceData.push({
    url: data.config.url || '',
    duration: data.duration
  });

  if (data.duration > 1000) {
    console.warn(`Slow request detected: ${data.config.url} (${data.duration}ms)`);
  }
});
```

### 示例 2：错误追踪

```typescript
import { onRequestError } from '@suga/request-events';

onRequestError(data => {
  // 发送错误到错误追踪服务
  errorTrackingService.track({
    url: data.config.url,
    error: data.error,
    timestamp: data.timestamp
  });
});
```

### 示例 3：请求日志

```typescript
import { onRequestStart, onRequestSuccess, onRequestError } from '@suga/request-events';

onRequestStart(data => {
  console.log(
    `[${new Date(data.timestamp).toISOString()}] START ${data.config.method || 'GET'} ${data.config.url}`
  );
});

onRequestSuccess(data => {
  console.log(
    `[${new Date(data.timestamp).toISOString()}] SUCCESS ${data.config.method || 'GET'} ${data.config.url} (${data.duration}ms)`
  );
});

onRequestError(data => {
  console.error(
    `[${new Date(data.timestamp).toISOString()}] ERROR ${data.config.method || 'GET'} ${data.config.url} (${data.duration}ms)`,
    data.error
  );
});
```

### 示例 4：多个监听器

```typescript
import { eventManager } from '@suga/request-events';

// 监听器 1
eventManager.on('request:start', data => {
  console.log('Listener 1:', data.config.url);
});

// 监听器 2
eventManager.on('request:start', data => {
  console.log('Listener 2:', data.config.url);
});

// 两个监听器都会触发
```

### 示例 5：取消监听

```typescript
import { onRequestStart, offRequestStart, type RequestStartEventData } from '@suga/request-events';

const handler = (data: RequestStartEventData) => {
  console.log('Request started:', data.config.url);
};

// 监听
onRequestStart(handler);

// 取消监听
offRequestStart(handler);
```

## 🏗️ 架构

```
request-events/
├── src/
│   ├── types.ts              # 类型定义
│   ├── managers/
│   │   └── EventManager.ts   # 事件管理器
│   ├── steps/
│   │   └── EventStep.ts     # 事件步骤
│   └── index.ts              # 入口文件
```

## 🔧 实现细节

1. **事件触发**：EventStep 在请求生命周期的关键节点触发事件
2. **事件管理**：EventManager 使用 Map 和 Set 管理事件监听器
3. **错误处理**：事件处理器中的错误不会影响请求流程
4. **性能追踪**：自动计算请求持续时间

## 📄 License

MIT
