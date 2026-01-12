# API 包常见问题解答（FAQ）

## 目录

- [基础使用](#基础使用)
- [配置相关](#配置相关)
- [错误处理](#错误处理)
- [性能优化](#性能优化)
- [故障排查](#故障排查)

## 基础使用

### Q1: 如何创建请求实例？

**A**: 使用 `createRequest` 函数：

```typescript
import { createRequest } from '@ellwood/shared/api';

const request = createRequest(undefined, {
  baseURL: '/api',
  timeout: 10000,
});
```

### Q2: 如何发送 GET 请求？

**A**: 使用 `get` 方法：

```typescript
const data = await request.get<User>('/user/1');
```

### Q3: 如何发送 POST 请求？

**A**: 使用 `post` 方法：

```typescript
const result = await request.post('/user', { name: 'John' });
```

### Q4: 如何上传文件？

**A**: 使用 `upload` 方法：

```typescript
const result = await request.upload('/upload', file, {
  onUploadProgress: progress => {
    console.log('上传进度:', progress.loaded / progress.total);
  },
});
```

### Q5: 如何下载文件？

**A**: 使用 `download` 方法：

```typescript
await request.download('/export', { id: 1 }, 'report.xlsx', {
  onDownloadProgress: progress => {
    console.log('下载进度:', progress.loaded / progress.total);
  },
});
```

## 配置相关

### Q6: 如何配置全局默认选项？

**A**: 使用 `setDefaultOptions` 方法：

```typescript
const request = createRequest();

request.setDefaultOptions({
  baseURL: '/api',
  timeout: 10000,
  loading: true,
});
```

### Q7: 如何配置请求超时策略？

**A**: 使用 `setTimeoutStrategy` 方法：

```typescript
request.setTimeoutStrategy({
  default: 10000,
  byMethod: {
    GET: 5000,
    POST: 30000,
  },
  byUrlPattern: [{ pattern: /\/api\/upload/, timeout: 60000 }],
});
```

### Q8: 如何配置请求缓存？

**A**: 使用 `configureRequestCache` 函数：

```typescript
import { configureRequestCache } from '@ellwood/shared/api';

configureRequestCache({
  strategy: 'lru',
  maxSize: 100,
  defaultExpireTime: 5 * 60 * 1000,
});
```

### Q9: 如何配置请求去重？

**A**: 使用 `configureRequestDedupe` 函数：

```typescript
import { configureRequestDedupe } from '@ellwood/shared/api';

configureRequestDedupe({
  strategy: 'exact',
  dedupeWindow: 2000,
});
```

## 错误处理

### Q10: 如何自定义错误处理？

**A**: 有多种方式：

**方式1：单次请求自定义处理**

```typescript
await request.get(
  '/api/data',
  {},
  {
    onError: (error, errorResponse) => {
      console.error('请求失败:', errorResponse.message);
      return true; // 返回 true 表示已处理，不再执行默认处理
    },
  },
);
```

**方式2：全局错误处理**

```typescript
import { globalErrorHandlerManager } from '@ellwood/shared/api';

globalErrorHandlerManager.register((error, errorResponse) => {
  console.error('全局错误:', errorResponse.message);
  return true;
});
```

### Q11: 如何跳过错误处理？

**A**: 使用 `skipErrorHandler` 选项：

```typescript
try {
  await request.get('/api/data', {}, { skipErrorHandler: true });
} catch (error) {
  // 自定义错误处理
}
```

### Q12: Token 刷新失败后如何处理？

**A**: 默认会自动跳转到登录页，也可以自定义：

```typescript
import { configureTokenRefresh } from '@ellwood/shared/api';

configureTokenRefresh({
  onRefreshFailed: () => {
    // 自定义处理逻辑
    router.push('/login');
  },
});
```

## 性能优化

### Q13: 如何启用请求缓存？

**A**: 在请求配置中设置 `cache: true`：

```typescript
await request.get(
  '/api/data',
  {},
  {
    cache: true,
    cacheExpireTime: 5 * 60 * 1000, // 5分钟
  },
);
```

### Q14: 如何启用请求去重？

**A**: 默认已启用，如需禁用：

```typescript
await request.get(
  '/api/data',
  {},
  {
    dedupe: false, // 禁用去重
  },
);
```

### Q15: 如何启用请求重试？

**A**: 在请求配置中设置 `retry: true`：

```typescript
await request.get(
  '/api/data',
  {},
  {
    retry: true,
    retryCount: 3,
    retryOnTimeout: true, // 超时时也重试
  },
);
```

### Q16: 如何使用请求队列控制并发？

**A**: 在创建请求实例时配置队列：

```typescript
import { createRequest } from '@ellwood/shared/api';

const request = createRequest(undefined, {
  baseURL: '/api',
  queueConfig: {
    maxConcurrent: 5,
    strategy: 'fifo',
  },
});
```

### Q17: 如何使用熔断器？

**A**: 在请求配置中设置 `circuitBreaker`：

```typescript
await request.get(
  '/api/data',
  {},
  {
    circuitBreaker: {
      failureThreshold: 5,
      timeout: 60000,
      fallback: () => cachedData,
    },
  },
);
```

## 故障排查

### Q18: 请求一直超时怎么办？

**A**: 检查以下几点：

1. **检查超时配置**：

```typescript
request.setTimeoutStrategy({
  default: 30000, // 增加超时时间
});
```

2. **检查网络连接**：

```typescript
// 启用日志查看请求详情
await request.get(
  '/api/data',
  {},
  {
    logEnabled: true,
  },
);
```

3. **启用超时重试**：

```typescript
await request.get(
  '/api/data',
  {},
  {
    retry: true,
    retryOnTimeout: true,
  },
);
```

### Q19: SSR 环境报错怎么办？

**A**: 新版本已自动处理 SSR 环境，如果仍有问题：

1. **检查导入方式**：

```typescript
// 正确
import { createRequest } from '@ellwood/shared/api';

// 错误
import createRequest from '@ellwood/shared/api';
```

2. **手动配置存储适配器**：

```typescript
import { configureStorage, MemoryStorageAdapter } from '@ellwood/shared/api';

configureStorage(new MemoryStorageAdapter());
```

### Q20: Token 刷新失败怎么办？

**A**: 检查以下几点：

1. **检查刷新 Token 配置**：

```typescript
import { configureTokenRefresh } from '@ellwood/shared/api';

configureTokenRefresh({
  refreshTokenUrl: '/api/auth/refresh',
  refreshTokenMethod: 'POST',
});
```

2. **检查存储中的 Token**：

```typescript
import { storageManager, REFRESH_TOKEN_KEY } from '@ellwood/shared/api';

const refreshToken = storageManager.getItem(REFRESH_TOKEN_KEY);
console.log('Refresh Token:', refreshToken);
```

3. **自定义失败处理**：

```typescript
configureTokenRefresh({
  onRefreshFailed: () => {
    // 自定义处理逻辑
  },
});
```

### Q21: 请求被取消怎么办？

**A**: 检查以下几点：

1. **检查是否手动取消**：

```typescript
const requestId = 'unique-id';
request.get('/api/data', {}, { requestId });
// ...
request.cancel(requestId); // 检查是否调用了取消
```

2. **检查取消配置**：

```typescript
await request.get(
  '/api/data',
  {},
  {
    cancelable: true, // 确保可取消
  },
);
```

### Q22: 缓存不生效怎么办？

**A**: 检查以下几点：

1. **确认是 GET 请求**（只有 GET 请求支持缓存）：

```typescript
await request.get(
  '/api/data',
  {},
  {
    cache: true, // GET 请求才支持
  },
);
```

2. **检查缓存配置**：

```typescript
import { configureRequestCache } from '@ellwood/shared/api';

configureRequestCache({
  strategy: 'time',
  defaultExpireTime: 5 * 60 * 1000,
});
```

3. **检查缓存键**：

```typescript
// 确保请求参数相同，缓存键才会相同
await request.get('/api/data', { id: 1 }, { cache: true });
await request.get('/api/data', { id: 1 }, { cache: true }); // 会使用缓存
```

### Q23: 如何查看请求性能指标？

**A**: 使用性能监控器：

```typescript
import { performanceMonitor } from '@ellwood/shared/api';

// 获取性能指标
const metrics = performanceMonitor.getMetrics();
console.log('平均响应时间:', metrics.averageResponseTime);
console.log('成功率:', metrics.successRate);
console.log('URL 统计:', metrics.urlStats);
```

### Q24: 如何调试请求问题？

**A**: 启用日志记录：

```typescript
// 全局启用日志
import { configureLogger } from '@ellwood/shared/api';

configureLogger({
  enabled: true,
  logLevel: 'debug',
});

// 单次请求启用日志
await request.get(
  '/api/data',
  {},
  {
    logEnabled: true,
  },
);
```

## 获取更多帮助

如果以上问题无法解决您的问题，请：

1. 查看 [README.md](./README.md) 了解详细用法
2. 查看 [CODE_REVIEW.md](./CODE_REVIEW.md) 了解实现细节
3. 查看 [MIGRATION.md](./MIGRATION.md) 了解迁移指南
4. 提交 Issue 或联系维护团队
