# @suga/request-axios 拆分方案

## 目标

将 `@suga/request-axios` 中的**通用基础设施**拆分成独立的 `@suga` 包，实现更好的解耦和维护性，类似于 `@suga/request-core` 的设计。

## 拆分原则

1. **单一职责**：每个包只负责一个核心功能
2. **依赖最小化**：只依赖 `@suga/request-core`，不依赖其他业务包
3. **可独立使用**：每个包可以独立使用，也可以组合使用
4. **通用优先**：只保留通用基础设施，移除所有业务逻辑
5. **不向后兼容**：可以破坏性更新，专注于通用性

## 拆分方案

### 1. @suga/request-cache
**功能**：请求缓存管理
**包含文件**：
- `utils/cache/` - 缓存策略和实现
- `core/CacheManager.ts` - 缓存管理器
- `core/policies/CachePolicy.ts` - 缓存策略
- `core/steps/CacheReadStep.ts` - 缓存读取步骤
- `core/steps/CacheWriteStep.ts` - 缓存写入步骤
- `utils/request/requestCache.ts` - 请求缓存工具

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `CacheManager`
- `CachePolicy`, `DefaultCachePolicy`, `NoCachePolicy`
- `CacheReadStep`, `CacheWriteStep`
- `MemoryCache`, `StorageCache`
- `CacheStrategy`, `CustomCacheStrategy`

---

### 2. @suga/request-retry
**功能**：请求重试机制
**包含文件**：
- `utils/request/retry.ts` - 重试策略和工具
- `core/steps/RetryStep.ts` - 重试步骤

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `RetryStep`
- `retryRequest`, `shouldRetry`, `calculateRetryDelay`
- `RetryStrategy`

---

### 3. @suga/request-circuit-breaker
**功能**：熔断器模式实现
**包含文件**：
- `utils/request/circuitBreaker.ts` - 熔断器实现
- `core/steps/CircuitBreakerStep.ts` - 熔断器步骤

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `CircuitBreaker`, `CircuitBreakerManager`
- `CircuitBreakerStep`
- `CircuitBreakerOptions`, `CircuitBreakerMetrics`
- `CircuitBreakerState`
- 各种策略接口和默认实现

---

### 4. @suga/request-dedupe
**功能**：请求去重（防止重复请求）
**包含文件**：
- `utils/request/requestDedupe.ts` - 请求去重管理器

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `requestDedupeManager`
- `configureRequestDedupe`
- `RequestDedupeOptions`, `DedupeStrategy`

---

### 5. @suga/request-queue
**功能**：请求队列和并发控制
**包含文件**：
- `utils/request/requestQueue.ts` - 请求队列实现

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `createRequestQueue`
- `QueueConfig`, `RequestPriority`, `QueueStrategy`

---

### 6. @suga/request-errors
**功能**：错误处理和增强（通用部分，不包含 UI 提示）
**包含文件**：
- `utils/errors/errorContext.ts` - 错误上下文（通用）
- `utils/errors/errorEnhancer.ts` - 错误增强器（通用）
- `utils/errors/errorHandler.ts` - 错误处理器（通用部分，移除 UI 相关）

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `createErrorContext`, `enhanceErrorResponse`, `errorToJSON`
- `ErrorContext`, `EnhancedAxiosError`
- **不导出**：`errorMessageManager`（业务逻辑，依赖 UI 库）

---

### 7. @suga/storage
**功能**：通用存储工具（不限于请求，完全通用）
**包含文件**：
- `utils/storage/storage.ts` - 存储适配器和管理器

**依赖**：
- 无（完全独立）

**导出**：
- `storageManager`
- `StorageAdapter`, `LocalStorageAdapter`, `SessionStorageAdapter`, `MemoryStorageAdapter`
- `configureStorage`

**不包含**：
- `tokenRefresh.ts` - Token 刷新是业务逻辑，不包含在此包中

---

### 8. @suga/request-logger
**功能**：请求日志记录（通用）
**包含文件**：
- `utils/features/logger.ts` - 日志记录器

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `loggerManager`, `configureLogger`
- `logRequest`, `logResponse`, `logError`
- `LoggerOptions`

---

### 9. @suga/request-events
**功能**：请求事件系统（通用）
**包含文件**：
- `utils/features/events.ts` - 事件管理器

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `eventManager`
- `onRequestStart`, `onRequestSuccess`, `onRequestError`, `onRequestComplete`
- `RequestEventType`, `RequestStartEventData`, `RequestSuccessEventData` 等类型

---

### 10. @suga/request-performance
**功能**：性能监控（通用）
**包含文件**：
- `utils/features/performance.ts` - 性能监控器

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `performanceMonitor`
- `PerformanceMonitor`, `PerformanceMetrics`

---

### 11. @suga/request-progress
**功能**：进度跟踪（通用）
**包含文件**：
- `utils/features/progress.ts` - 进度跟踪工具

**依赖**：
- `@suga/request-core` - 核心基础设施

**导出**：
- `calculateProgress`, `formatFileSize`, `formatSpeed`
- `createProgressTracker`

---

### 12. @suga/request-axios（精简版）
**功能**：Axios 传输层适配器和基础集成（移除所有业务逻辑）
**包含文件**：
- `adapters/` - Axios 适配器
- `core/transport/` - 传输层适配器
- `core/steps/TransportStep.ts` - 传输步骤
- `core/steps/AbortStep.ts` - 取消步骤
- `core/client/` - 客户端封装
- `core/ConfigManager.ts` - 配置管理
- `core/TimeoutManager.ts` - 超时管理
- `core/InterceptorManager.ts` - 拦截器管理（通用部分）
- `core/PluginManager.ts` - 插件管理
- `core/RequestExecutor.ts` - 请求执行器
- `types/` - 类型定义（通用部分）
- `utils/common/` - 通用工具（env, helpers, validators, typeGuards, serialization）
- `middleware/` - 中间件系统
- `plugins/` - 插件系统

**依赖**：
- `@suga/request-core` - 核心基础设施
- `@suga/request-cache` - 缓存功能
- `@suga/request-retry` - 重试功能
- `@suga/request-circuit-breaker` - 熔断器
- `@suga/request-dedupe` - 请求去重
- `@suga/request-queue` - 请求队列
- `@suga/request-errors` - 错误处理
- `@suga/storage` - 存储工具
- `@suga/request-logger` - 日志记录
- `@suga/request-events` - 事件系统
- `@suga/request-performance` - 性能监控
- `@suga/request-progress` - 进度跟踪
- `axios` - Axios 库

**不包含（业务逻辑，由应用层实现）**：
- ❌ `request.ts` - 旧版请求类（业务封装）
- ❌ `methods/FileOperations.ts` - 文件操作（业务逻辑）
- ❌ `interceptors/` - 拦截器中的业务逻辑（Token 刷新、错误提示等）
- ❌ `utils/features/loading.ts` - Loading 提示（依赖 UI 库）
- ❌ `utils/storage/tokenRefresh.ts` - Token 刷新（业务逻辑）
- ❌ `constants/` - 业务相关常量（如 TOKEN_KEY, BusinessErrorCode 等）
- ❌ `types/response.ts` - 业务响应类型（如 ApiResponse, PageResponse 等）

## 实施步骤

1. **第一阶段：创建最基础的包（无依赖或只依赖 request-core）**
   - 创建 `@suga/storage`（无依赖）
   - 创建 `@suga/request-errors`（只依赖 request-core）
   - 创建 `@suga/request-retry`（只依赖 request-core）
   - 创建 `@suga/request-logger`（只依赖 request-core）
   - 创建 `@suga/request-events`（只依赖 request-core）
   - 创建 `@suga/request-performance`（只依赖 request-core）
   - 创建 `@suga/request-progress`（只依赖 request-core）

2. **第二阶段：创建功能包（依赖 request-core 和基础包）**
   - 创建 `@suga/request-cache`（依赖 request-core + storage）
   - 创建 `@suga/request-circuit-breaker`（依赖 request-core）
   - 创建 `@suga/request-dedupe`（依赖 request-core）
   - 创建 `@suga/request-queue`（依赖 request-core）

3. **第三阶段：精简主包**
   - 更新 `@suga/request-axios`，移除所有业务逻辑
   - 使用新的拆分包
   - 只保留 Axios 传输层适配和基础集成
   - 更新文档，明确说明业务逻辑由应用层实现

## 包结构示例

每个新包的基本结构：

```
packages/request-cache/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts          # 导出入口
    ├── CacheManager.ts
    ├── CachePolicy.ts
    └── steps/
        ├── CacheReadStep.ts
        └── CacheWriteStep.ts
```

## 优势

1. **更好的维护性**：每个包职责单一，易于维护和测试
2. **更好的复用性**：其他项目可以只使用需要的功能
3. **更小的包体积**：按需引入，减少打包体积
4. **更清晰的依赖关系**：依赖关系更明确
5. **更灵活的版本管理**：每个包可以独立版本管理

## 业务逻辑处理

以下功能属于业务逻辑，**不包含在任何包中**，由应用层自行实现：

1. **Loading 提示**：依赖 UI 库（如 TDesign、Element Plus 等），由应用层配置
2. **错误消息提示**：依赖 UI 库，由应用层配置
3. **Token 刷新**：业务逻辑，由应用层实现
4. **文件上传/下载**：业务逻辑，由应用层实现
5. **业务响应类型**：如 `ApiResponse<T>`, `PageResponse<T>` 等，由应用层定义
6. **业务错误码**：如 `BusinessErrorCode`，由应用层定义
7. **拦截器中的业务逻辑**：如 Token 注入、错误处理等，由应用层实现

## 注意事项

1. **不向后兼容**：可以破坏性更新，专注于通用性
2. **类型导出**：确保所有类型都正确导出
3. **文档更新**：更新所有相关文档，明确说明业务逻辑的处理方式
4. **测试覆盖**：确保拆分后功能正常
5. **版本管理**：统一版本号或独立版本管理
6. **业务逻辑分离**：严格区分通用基础设施和业务逻辑

