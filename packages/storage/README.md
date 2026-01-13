# @suga/storage

存储适配器抽象包，提供统一的存储操作接口，支持不同的存储实现（localStorage、sessionStorage、内存存储等）。

## 特性

- ✅ 统一的存储适配器接口
- ✅ 支持 localStorage（浏览器环境）
- ✅ 支持 sessionStorage（浏览器环境）
- ✅ 支持内存存储（SSR/测试环境）
- ✅ 自动环境检测（默认适配器）
- ✅ TypeScript 完整支持

## 安装

```bash
pnpm add @suga/storage
```

## 使用

### 基础使用

```typescript
import { LocalStorageAdapter, MemoryStorageAdapter } from '@suga/storage';

// 使用 LocalStorage
const localStorage = new LocalStorageAdapter();
localStorage.setItem('key', 'value');
const value = localStorage.getItem('key');

// 使用内存存储
const memoryStorage = new MemoryStorageAdapter();
memoryStorage.setItem('key', 'value');
```

### 使用默认适配器

```typescript
import { defaultStorageAdapter } from '@suga/storage';

// 自动根据环境选择适配器（浏览器使用 localStorage，否则使用内存存储）
defaultStorageAdapter.setItem('key', 'value');
const value = defaultStorageAdapter.getItem('key');
```

### 自定义适配器

```typescript
import type { StorageAdapter } from '@suga/storage';

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
```

## API

### StorageAdapter 接口

```typescript
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  getAllKeys(): string[];
}
```

### 适配器实现

- `LocalStorageAdapter` - localStorage 适配器（浏览器环境）
- `SessionStorageAdapter` - sessionStorage 适配器（浏览器环境）
- `MemoryStorageAdapter` - 内存存储适配器（SSR/测试环境）
- `defaultStorageAdapter` - 默认适配器（自动选择）

## 错误处理

存储适配器在操作失败时会进行错误处理：

- **开发环境**：会在控制台输出警告信息，包含操作类型、键名和错误详情，便于调试
- **生产环境**：静默处理错误，返回默认值或跳过操作，不影响用户体验

常见错误场景：
- 存储已满（QuotaExceededError）
- 存储被禁用（SecurityError）
- 浏览器隐私模式限制
- 跨域访问限制

```typescript
// 开发环境示例
// 当存储操作失败时，控制台会输出：
// [LocalStorageAdapter] Failed to set item to localStorage: myKey [QuotaExceededError: ...]
```

## 设计原则

1. **通用性**：不依赖特定的业务逻辑
2. **环境适配**：自动检测环境并选择合适的适配器
3. **错误处理**：
   - 开发环境输出警告，便于调试
   - 生产环境静默处理，保证稳定性
   - 所有操作都有容错机制
4. **类型安全**：完整的 TypeScript 支持

