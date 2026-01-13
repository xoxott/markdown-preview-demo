# @suga/request-client 目录结构规范

## 当前目录结构

```
packages/request-client/
├── src/               # 源代码目录（符合 @suga 包规范）
│   ├── constants/     # 常量定义
│   │   └── index.ts
│   ├── core/          # 核心功能（基于 @suga/request-core）
│   │   ├── ARCHITECTURE.md
│   │   ├── client/    # 客户端实现
│   │   │   ├── ApiRequestClient.ts
│   │   │   └── createRequestClient.ts
│   │   ├── index.ts   # 核心模块导出
│   │   ├── steps/     # 请求步骤
│   │   │   ├── AbortStep.ts
│   │   │   └── TransportStep.ts
│   │   ├── transport/ # 传输层适配
│   │   │   └── AxiosTransport.ts
│   │   ├── types.ts   # 核心类型
│   │   └── utils/     # 核心工具
│   │       └── configAdapter.ts
│   ├── types/         # 类型定义
│   │   └── index.ts
│   ├── utils/         # 工具函数
│   │   ├── common/    # 通用工具
│   │   │   ├── env.ts
│   │   │   ├── helpers.ts
│   │   │   ├── internalLogger.ts
│   │   │   └── serialization.ts
│   │   ├── errors/    # 错误处理工具
│   │   │   ├── errorContext.ts
│   │   │   └── errorEnhancer.ts
│   │   ├── request/   # 请求相关工具
│   │   │   └── cancel.ts
│   │   └── storage/   # 存储工具
│   │       └── storage.ts
│   └── index.ts       # 主入口文件
├── index.ts           # 重新导出 src/index.ts
├── package.json
└── README.md
```

## 需要手动删除的空目录

以下目录为空，需要手动删除：

1. `interceptors/` - 已移除拦截器相关业务逻辑
2. `methods/` - 已移除文件操作业务逻辑
3. `middleware/` - 空目录
4. `utils/features/` - 已移除重复的事件和日志实现（使用 @suga/request-events 和 @suga/request-logger）

## 目录职责说明

### `src/core/` - 核心功能
- **职责**：基于 `@suga/request-core` 的核心实现
- **包含**：
  - `client/` - 客户端封装
  - `steps/` - 请求步骤（TransportStep、AbortStep）
  - `transport/` - Axios 传输层适配
  - `utils/` - 配置适配器

### `src/types/` - 类型定义
- **职责**：定义 `RequestConfig` 等类型
- **不包含**：业务响应类型（如 `ApiResponse`、`ErrorResponse`），这些应由应用层定义

### `src/utils/` - 工具函数
- **common/** - 通用工具（环境检测、辅助函数、内部日志、序列化）
- **errors/** - 错误处理工具（错误上下文、错误增强）
- **request/** - 请求相关工具（取消 Token 管理）
- **storage/** - 存储适配器（localStorage、sessionStorage、内存存储）

### `src/constants/` - 常量
- **职责**：定义通用常量（如 `DEFAULT_TIMEOUT`）
- **不包含**：业务常量（如 `TOKEN_KEY`、`HttpStatus`、`BusinessErrorCode`），这些应由应用层定义

## 已移除的业务逻辑

以下功能已移除，应由应用层实现：

1. **拦截器** (`interceptors/`) - Token 管理、Loading、响应格式处理
2. **文件操作** (`methods/FileOperations.ts`) - 文件上传/下载
3. **事件管理** (`utils/features/events.ts`) - 使用 `@suga/request-events` 替代
4. **日志管理** (`utils/features/logger.ts`) - 使用 `@suga/request-logger` 替代
5. **Token 刷新** (`utils/storage/tokenRefresh.ts`) - 业务逻辑
6. **Loading 管理** (`utils/features/loading.ts`) - UI 相关
7. **错误消息处理** (`utils/errors/errorHandler.ts`) - UI 相关
8. **业务响应类型** (`types/response.ts`) - `ApiResponse`、`ErrorResponse` 等

## 规范原则

1. **单一职责**：每个目录和文件只负责一个功能
2. **通用优先**：只保留通用基础设施，移除所有业务逻辑
3. **依赖最小化**：优先使用 `@suga/request-*` 包，避免重复实现
4. **清晰分层**：
   - `src/core/` - 核心功能（基于 request-core）
   - `src/types/` - 类型定义
   - `src/utils/` - 工具函数
   - `src/constants/` - 常量定义
5. **符合 @suga 包规范**：所有源代码放在 `src/` 目录下

## 导出规范

- **主入口** (`src/index.ts`)：导出所有公共 API
- **根入口** (`index.ts`)：重新导出 `src/index.ts` 的所有内容
- **核心入口** (`src/core/index.ts`)：导出核心功能
- **类型入口** (`src/types/index.ts`)：导出所有类型

## package.json 配置

```json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "typesVersions": {
    "*": {
      "*": ["./src/*"]
    }
  }
}
```

