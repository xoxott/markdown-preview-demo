# @suga/request-circuit-breaker

为 `@suga/request-core` 提供的熔断器模式实现包。

## 特性

- ✅ 三种状态：CLOSED（关闭）、OPEN（开启）、HALF_OPEN（半开）
- ✅ 可配置的失败阈值和成功阈值
- ✅ 支持降级函数（fallback）
- ✅ 可自定义状态转换策略
- ✅ 可自定义错误分类策略
- ✅ RequestStep 集成（CircuitBreakerStep）
- ✅ TypeScript 完整支持
- ✅ 框架无关和传输层无关

## 安装

```bash
npm install @suga/request-circuit-breaker
```

## 使用方法

### 基础用法

```typescript
import { CircuitBreakerStep } from '@suga/request-circuit-breaker';
import { RequestClient } from '@suga/request-core';

// 创建带熔断步骤的请求客户端
const client = new RequestClient(transport, [
  new CircuitBreakerStep(),
  // ... 其他步骤
]);

// 在请求中使用熔断器
const result = await client.request({
  url: '/api/users',
  method: 'GET',
}, {
  circuitBreaker: {
    failureThreshold: 5,
    timeout: 60000,
    fallback: () => ({ id: 0, name: '默认用户' }),
  },
});
```

### 使用 CircuitBreaker 类

```typescript
import { createCircuitBreaker } from '@suga/request-circuit-breaker';

// 创建熔断器实例
const breaker = createCircuitBreaker<User>({
  failureThreshold: 5,
  timeout: 60000,
  successThreshold: 2,
  fallback: () => ({ id: 0, name: '默认用户' }),
});

// 使用熔断器执行请求
const user = await breaker.execute(async () => {
  return await fetch('/api/users/1').then((res) => res.json());
});
```

### 使用 CircuitBreakerManager

```typescript
import { CircuitBreakerManager } from '@suga/request-circuit-breaker';

const manager = new CircuitBreakerManager();

// 获取或创建熔断器（按 key 区分）
const breaker1 = manager.getOrCreateBreaker('api-users', {
  failureThreshold: 5,
  timeout: 60000,
});

const breaker2 = manager.getOrCreateBreaker('api-orders', {
  failureThreshold: 3,
  timeout: 30000,
});
```

### 自定义策略

```typescript
import {
  CircuitBreaker,
  DefaultStateTransitionStrategy,
  DefaultErrorClassificationStrategy,
} from '@suga/request-circuit-breaker';

// 自定义状态转换策略
class CustomStateTransitionStrategy extends DefaultStateTransitionStrategy {
  shouldOpen(failures: number, failureThreshold: number): boolean {
    // 自定义开启熔断的逻辑
    return failures >= failureThreshold * 2; // 更保守的策略
  }
}

// 自定义错误分类策略
class CustomErrorClassificationStrategy extends DefaultErrorClassificationStrategy {
  shouldCountAsFailure(error: unknown): boolean {
    // 自定义哪些错误应该计入失败
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: number }).status;
      return status === 429; // 只统计 429 错误
    }
    return false;
  }
}

const breaker = new CircuitBreaker({
  stateTransitionStrategy: new CustomStateTransitionStrategy(),
  errorClassificationStrategy: new CustomErrorClassificationStrategy(),
});
```

## API

### CircuitBreaker

熔断器核心类。

```typescript
class CircuitBreaker<T = unknown> {
  constructor(options?: CircuitBreakerOptions<T>);
  execute(requestFn: () => Promise<T>): Promise<T>;
  getState(): CircuitBreakerState;
  getMetrics(): CircuitBreakerMetrics;
  reset(): void;
  advanceState(): CircuitBreakerState;
}
```

### CircuitBreakerManager

熔断器管理器。

```typescript
class CircuitBreakerManager {
  getOrCreateBreaker<T>(key: string, options?: CircuitBreakerOptions<T>): CircuitBreaker<T>;
  removeBreaker(key: string): void;
  clear(): void;
  getAllBreakers(): ReadonlyMap<string, CircuitBreaker<unknown>>;
}
```

### CircuitBreakerStep

熔断步骤类，用于请求管道。

```typescript
class CircuitBreakerStep implements RequestStep {
  constructor(options?: CircuitBreakerStepOptions);
  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void>;
}
```

### CircuitBreakerState

熔断器状态枚举。

```typescript
enum CircuitBreakerState {
  CLOSED = 'closed',      // 关闭状态：正常处理请求
  OPEN = 'open',          // 开启状态：拒绝所有请求
  HALF_OPEN = 'half-open', // 半开状态：允许少量请求通过
}
```

### CircuitBreakerOptions

熔断器配置选项。

```typescript
interface CircuitBreakerOptions<T = unknown> {
  failureThreshold?: number;                    // 失败阈值，默认 5
  timeout?: number;                             // 超时时间（毫秒），默认 60000
  successThreshold?: number;                    // 成功阈值，默认 2
  enabled?: boolean;                            // 是否启用，默认 true
  fallback?: (error?: unknown) => T | Promise<T>; // 降级函数
  errorClassificationStrategy?: ErrorClassificationStrategy;
  stateTransitionStrategy?: StateTransitionStrategy;
  successEvaluationStrategy?: SuccessEvaluationStrategy;
}
```

## 架构

包的组织结构如下：

```
src/
├── index.ts                    # 主导出文件
├── constants.ts                # 常量定义
├── types.ts                    # 类型定义
├── core/                       # 核心类
│   ├── Metrics.ts             # 指标管理
│   ├── StateController.ts     # 状态控制器
│   ├── ExecutionGuard.ts      # 执行守卫
│   └── CircuitBreaker.ts      # 熔断器核心类
├── strategies/                 # 策略实现
│   ├── state-transition.ts    # 状态转换策略
│   ├── error-classification.ts # 错误分类策略
│   └── success-evaluation.ts  # 成功判断策略
├── managers/                   # 管理器
│   └── CircuitBreakerManager.ts
└── steps/                      # 请求步骤
    └── CircuitBreakerStep.ts
```

## 设计原则

1. **通用性**：不依赖特定的错误库，使用通用错误接口
2. **可扩展性**：通过策略模式支持自定义逻辑
3. **类型安全**：完整的 TypeScript 类型定义
4. **框架无关**：可以与任何请求库配合使用

## 默认行为

- **失败阈值**：5 次连续失败后开启熔断
- **超时时间**：60000 毫秒（60 秒）后进入半开状态
- **成功阈值**：半开状态下成功 2 次后关闭熔断
- **错误分类**：只统计服务器错误（5xx）和网络错误
- **状态转换**：标准的熔断器状态转换逻辑

## 许可证

MIT

