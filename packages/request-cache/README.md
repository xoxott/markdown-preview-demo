# @suga/request-cache

为 `@suga/request-core` 提供的请求缓存管理包。

## 特性

- ✅ 内存缓存和持久化存储缓存支持
- ✅ 多种缓存策略（基于时间、LRU、FIFO、自定义）
- ✅ 缓存策略模式（可扩展、可替换）
- ✅ RequestStep 集成（CacheReadStep、CacheWriteStep）
- ✅ 存储适配器抽象（支持自定义存储实现）
- ✅ TypeScript 完整支持
- ✅ 框架无关和传输层无关

## 安装

```bash
npm install @suga/request-cache
```

## 使用方法

### 基础用法

```typescript
import { CacheReadStep, CacheWriteStep } from '@suga/request-cache';
import { RequestClient } from '@suga/request-core';

// 创建带缓存步骤的请求客户端
const client = new RequestClient(transport, [
  new CacheReadStep(),
  // ... 其他步骤
  new CacheWriteStep(),
]);

// 在请求中使用缓存
const result = await client.request({
  url: '/api/users',
  method: 'GET',
}, {
  cache: true, // 启用缓存
});
```

### 自定义缓存策略

```typescript
import { CachePolicy, CacheMeta } from '@suga/request-cache';
import type { NormalizedRequestConfig } from '@suga/request-core';

class CustomCachePolicy implements CachePolicy {
  shouldRead(config: NormalizedRequestConfig, meta?: CacheMeta): boolean {
    // 自定义逻辑
    return true;
  }

  shouldWrite(config: NormalizedRequestConfig, data: unknown, meta?: CacheMeta): boolean {
    // 自定义逻辑
    return data !== null;
  }

  getKey(config: NormalizedRequestConfig, meta?: CacheMeta): string {
    // 自定义键生成
    return `${config.method}:${config.url}`;
  }

  getTTL(config: NormalizedRequestConfig, meta?: CacheMeta): number | undefined {
    // 自定义 TTL
    return 10 * 60 * 1000; // 10 分钟
  }
}

// 使用自定义策略
const result = await client.request({
  url: '/api/users',
  method: 'GET',
}, {
  cache: new CustomCachePolicy(),
});
```

### 缓存策略配置

```typescript
import { RequestCacheManager } from '@suga/request-cache';

// 基于时间的策略（默认）
const cacheManager = new RequestCacheManager({
  strategy: 'time',
  defaultExpireTime: 5 * 60 * 1000, // 5 分钟
});

// LRU 策略
const lruCacheManager = new RequestCacheManager({
  strategy: 'lru',
  maxSize: 100,
});

// FIFO 策略
const fifoCacheManager = new RequestCacheManager({
  strategy: 'fifo',
  maxSize: 100,
});

// 自定义策略
const customCacheManager = new RequestCacheManager({
  strategy: 'custom',
  customStrategy: (key, item) => {
    // 返回 true 保留，false 删除
    return item.data.important === true;
  },
});
```

### 自定义存储适配器

```typescript
import { StorageAdapter, RequestCacheManager } from '@suga/request-cache';

class CustomStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    // 自定义实现
    return null;
  }

  setItem(key: string, value: string): void {
    // 自定义实现
  }

  removeItem(key: string): void {
    // 自定义实现
  }

  clear(): void {
    // 自定义实现
  }

  getAllKeys(): string[] {
    // 自定义实现
    return [];
  }
}

// 使用自定义存储适配器
const cacheManager = new RequestCacheManager({
  useStorage: true,
  storageAdapter: new CustomStorageAdapter(),
});
```

### 缓存元数据

```typescript
import { CacheMeta } from '@suga/request-cache';

// 使用缓存元数据
const meta: CacheMeta = {
  cache: true, // 启用缓存
  cacheExpireTime: 10 * 60 * 1000, // 10 分钟过期
};

const result = await client.request({
  url: '/api/users',
  method: 'GET',
}, meta);
```

## API

### CacheManager

主要的缓存管理器类。

```typescript
class CacheManager {
  /**
   * 获取缓存数据
   */
  getCachedData<T>(config: NormalizedRequestConfig, meta?: CacheMeta): T | null;

  /**
   * 设置缓存数据
   */
  setCacheData<T>(config: NormalizedRequestConfig, data: T, meta?: CacheMeta): void;

  /**
   * 清除缓存
   * @param config 可选，不传则清除所有缓存
   */
  clearCache(config?: NormalizedRequestConfig): void;

  /**
   * 清理过期缓存
   */
  cleanupCache(): void;

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { memoryCount: number; storageCount: number };
}
```

### RequestCacheManager

底层缓存管理器，用于直接操作缓存。

```typescript
class RequestCacheManager {
  /**
   * 获取缓存
   */
  get<T>(config: NormalizedRequestConfig): T | null;

  /**
   * 设置缓存
   */
  set<T>(config: NormalizedRequestConfig, data: T, expireTime?: number): void;

  /**
   * 删除缓存
   */
  delete(config: NormalizedRequestConfig): void;

  /**
   * 清空所有缓存
   */
  clear(): void;

  /**
   * 清理过期缓存
   */
  cleanup(force?: boolean): void;

  /**
   * 获取统计信息
   */
  getStats(): { memoryCount: number; storageCount: number };
}
```

### CachePolicy

缓存策略接口，用于自定义缓存行为。

```typescript
interface CachePolicy {
  /**
   * 判断是否应该从缓存读取
   */
  shouldRead(config: NormalizedRequestConfig, meta?: CacheMeta): boolean;

  /**
   * 判断是否应该写入缓存
   */
  shouldWrite(config: NormalizedRequestConfig, data: unknown, meta?: CacheMeta): boolean;

  /**
   * 生成缓存键
   */
  getKey(config: NormalizedRequestConfig, meta?: CacheMeta): string;

  /**
   * 获取缓存 TTL（过期时间，毫秒）
   */
  getTTL(config: NormalizedRequestConfig, meta?: CacheMeta): number | undefined;
}
```

### CacheMeta

缓存元数据接口，定义缓存相关的元数据字段。

```typescript
interface CacheMeta {
  /**
   * 缓存配置
   * - `true`: 启用缓存（使用默认策略）
   * - `false`: 禁用缓存
   * - `CachePolicy`: 使用自定义策略
   * - `undefined`: 不指定，由策略决定
   */
  cache?: CacheConfig;

  /**
   * 缓存过期时间（毫秒）
   * 如果指定，将覆盖策略中的 TTL 设置
   */
  cacheExpireTime?: number;

  /**
   * 其他扩展字段
   * 允许策略实现添加自定义字段
   */
  [key: string]: unknown;
}
```

### RequestStep

请求管道中的缓存步骤。

- `CacheReadStep` - 在网络请求之前从缓存读取
- `CacheWriteStep` - 请求成功后写入缓存

## 架构

包的组织结构如下：

```
src/
├── index.ts                    # 主导出文件
├── constants.ts                # 常量定义
│
├── types/                      # 全局类型定义
│   ├── index.ts               # 统一导出
│   ├── strategy.ts            # 缓存策略类型
│   ├── manager.ts             # 管理器类型
│   ├── request-cache.ts       # 请求缓存类型
│   └── steps.ts                # 步骤类型
│
├── policies/                   # 缓存策略模块
│   ├── index.ts               # 统一导出
│   ├── types.ts               # 接口和类型定义
│   └── implementations/       # 实现文件夹
│       ├── index.ts
│       ├── DefaultCachePolicy.ts
│       ├── NoCachePolicy.ts
│       └── createCachePolicy.ts
│
├── adapters/                   # 存储适配器模块
│   ├── index.ts               # 统一导出
│   ├── types.ts               # 接口定义
│   └── implementations/       # 实现文件夹
│       ├── index.ts
│       ├── MemoryStorageAdapter.ts
│       ├── LocalStorageAdapter.ts
│       └── DefaultStorageAdapter.ts
│
├── managers/                   # 缓存管理器
│   ├── CacheManager.ts
│   └── RequestCacheManager.ts
│
├── caches/                     # 缓存实现
│   ├── MemoryCache.ts
│   └── StorageCache.ts
│
├── strategies/                 # 缓存策略管理器
│   └── CacheStrategyManager.ts
│
├── steps/                      # 请求步骤
│   ├── CacheReadStep.ts
│   └── CacheWriteStep.ts
│
└── utils/                      # 工具函数
    └── cache-utils.ts
```

## 设计原则

1. **接口与实现分离**：所有接口定义在 `types.ts` 中，实现在 `implementations/` 文件夹中
2. **单一职责**：每个模块和类都有明确的职责
3. **可扩展性**：通过策略模式和适配器模式支持扩展
4. **类型安全**：完整的 TypeScript 类型定义
5. **通用性**：不包含业务逻辑，完全通用的基础设施

## 许可证

MIT
