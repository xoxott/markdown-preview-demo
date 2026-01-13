# @suga/request-logger

请求日志记录工具，提供请求、响应和错误的日志记录功能。

## 📦 安装

```bash
pnpm add @suga/request-logger
```

## 🚀 快速开始

### 基本使用

```typescript
import { RequestClient } from '@suga/request-core';
import { EventStep } from '@suga/request-events';
import { logRequestWithManager, logResponseWithManager, logErrorWithManager } from '@suga/request-logger';
import { AxiosTransport } from '@suga/request-axios';

const transport = new AxiosTransport();
const client = new RequestClient(transport)
  .with(new EventStep());

// 监听事件并记录日志
import { onRequestStart, onRequestSuccess, onRequestError } from '@suga/request-events';

onRequestStart((data) => {
  logRequestWithManager(data.config);
});

onRequestSuccess((data) => {
  logResponseWithManager(data.config, data.result, data.duration);
});

onRequestError((data) => {
  logErrorWithManager(data.config, data.error, data.duration);
});

// 发送请求
await client.get('/api/users');
```

### 配置日志选项

```typescript
import { configureLogger } from '@suga/request-logger';

// 启用日志（需要明确设置）
configureLogger({
  enabled: true, // 必须明确设置为 true 才会启用日志
  logRequest: true, // 记录请求日志
  logResponse: true, // 记录响应日志
  logError: true, // 记录错误日志
});
```

### 使用自定义日志管理器

```typescript
import { LoggerManager, logRequest, logResponse, logError } from '@suga/request-logger';

const customLogger = new LoggerManager({
  enabled: true,
  logRequest: true,
  logResponse: false, // 不记录响应日志
  logError: true,
  output: (message, ...args) => {
    // 自定义日志输出
    console.log(`[CUSTOM] ${message}`, ...args);
  },
});

// 使用自定义管理器
logRequest(config, customLogger);
logResponse(config, result, duration, customLogger);
logError(config, error, duration, customLogger);
```

## 📚 API

### LoggerManager

日志管理器类。

#### 构造函数选项

```typescript
interface LoggerOptions {
  /** 是否启用日志（默认：开发环境启用，生产环境禁用） */
  enabled?: boolean;
  /** 是否记录请求日志 */
  logRequest?: boolean;
  /** 是否记录响应日志 */
  logResponse?: boolean;
  /** 是否记录错误日志 */
  logError?: boolean;
  /** 日志输出函数 */
  output?: (message: string, ...args: unknown[]) => void;
}
```

#### 方法

- `setOptions(options)`: 设置日志配置
- `shouldLog(override?)`: 检查是否应该记录日志
- `shouldLogRequest(override?)`: 检查是否应该记录请求日志
- `shouldLogResponse(override?)`: 检查是否应该记录响应日志
- `shouldLogError(override?)`: 检查是否应该记录错误日志
- `getOutput()`: 获取日志输出函数

### 日志函数

- `logRequest(config, loggerManager, enabled?)`: 记录请求日志
- `logResponse(config, result, duration, loggerManager, enabled?)`: 记录响应日志
- `logError(config, error, duration, loggerManager, enabled?)`: 记录错误日志

### 便捷函数（使用全局 loggerManager）

- `logRequestWithManager(config, enabled?)`: 记录请求日志
- `logResponseWithManager(config, result, duration, enabled?)`: 记录响应日志
- `logErrorWithManager(config, error, duration, enabled?)`: 记录错误日志

### configureLogger

配置全局日志选项。

```typescript
configureLogger({
  enabled: true,
  logRequest: true,
  logResponse: true,
  logError: true,
});
```

## 📝 使用示例

### 示例 1：基本日志记录

```typescript
import { logRequestWithManager, logResponseWithManager, logErrorWithManager } from '@suga/request-logger';
import { onRequestStart, onRequestSuccess, onRequestError } from '@suga/request-events';

onRequestStart((data) => {
  logRequestWithManager(data.config);
});

onRequestSuccess((data) => {
  logResponseWithManager(data.config, data.result, data.duration);
});

onRequestError((data) => {
  logErrorWithManager(data.config, data.error, data.duration);
});
```

### 示例 2：根据环境配置

```typescript
import { configureLogger } from '@suga/request-logger';

// 根据环境变量决定是否启用（使用者自己处理）
const isDev = process.env.NODE_ENV === 'development';

configureLogger({
  enabled: isDev, // 使用者自己判断环境
  logRequest: true,
  logResponse: true,
  logError: true,
});
```

### 示例 3：自定义日志输出

```typescript
import { LoggerManager, logRequest } from '@suga/request-logger';

const logger = new LoggerManager({
  output: (message, ...args) => {
    // 发送到日志服务
    logService.send({
      level: 'info',
      message,
      args,
      timestamp: Date.now(),
    });
  },
});

logRequest(config, logger);
```

### 示例 4：选择性记录

```typescript
import { configureLogger } from '@suga/request-logger';

// 只记录请求和错误，不记录响应
configureLogger({
  logRequest: true,
  logResponse: false,
  logError: true,
});
```

### 示例 5：按请求控制日志

```typescript
import { logRequestWithManager } from '@suga/request-logger';

// 强制记录某个请求的日志
logRequestWithManager(config, true);

// 强制不记录某个请求的日志
logRequestWithManager(config, false);
```

## 🏗️ 架构

```
request-logger/
├── src/
│   ├── types.ts                  # 类型定义
│   ├── managers/
│   │   └── LoggerManager.ts     # 日志管理器
│   ├── logger.ts                 # 日志函数
│   └── index.ts                  # 入口文件
```

## 🔧 实现细节

1. **环境检测**：自动检测开发/生产环境，默认开发环境启用日志
2. **灵活配置**：支持全局配置和单次请求配置
3. **自定义输出**：支持自定义日志输出函数
4. **选择性记录**：可以单独控制请求、响应、错误的日志记录

## 📄 License

MIT

