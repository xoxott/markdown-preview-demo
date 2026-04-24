# @suga/request-performance

请求性能监控工具，提供请求性能统计和监控功能。

## 📦 安装

```bash
pnpm add @suga/request-performance
```

## 🚀 快速开始

### 基本使用

```typescript
import { RequestClient } from '@suga/request-core';
import { EventStep } from '@suga/request-events';
import { performanceMonitor } from '@suga/request-performance';

// 创建请求客户端（需要提供 transport）
const client = new RequestClient(transport).with(new EventStep());

// 监听事件并记录性能
import { onRequestStart, onRequestSuccess, onRequestError } from '@suga/request-events';

onRequestStart(data => {
  performanceMonitor.onRequestStart(data.config);
});

onRequestSuccess(data => {
  performanceMonitor.onRequestSuccess(data.config, data.duration);
});

onRequestError(data => {
  performanceMonitor.onRequestError(data.config, data.error, data.duration);
});

// 发送请求
await client.request({
  url: '/api/users',
  method: 'GET'
});

// 获取性能指标
const metrics = performanceMonitor.getMetrics();
console.log('Total requests:', metrics.totalRequests);
console.log('Success rate:', metrics.successRate, '%');
console.log('Average response time:', metrics.averageResponseTime, 'ms');
```

### 使用自定义性能监控器

```typescript
import { PerformanceMonitorManager } from '@suga/request-performance';
import type { NormalizedRequestConfig } from '@suga/request-core';

const customMonitor = new PerformanceMonitorManager();

// 使用自定义监控器
const config: NormalizedRequestConfig = {
  url: '/api/users',
  method: 'GET'
};

customMonitor.onRequestStart(config);
customMonitor.onRequestSuccess(config, 150); // duration in ms
customMonitor.onRequestError(config, new Error('Request failed'), 200); // error, duration

// 获取指标
const metrics = customMonitor.getMetrics();
```

## 📚 API

### PerformanceMonitorManager

性能监控管理器类。

#### 方法

- `onRequestStart(config)`: 记录请求开始
- `onRequestSuccess(config, duration)`: 记录请求成功
- `onRequestError(config, error, duration)`: 记录请求失败
- `getMetrics()`: 获取性能指标
- `reset()`: 重置统计

### PerformanceMetrics

性能指标接口。

```typescript
interface PerformanceMetrics {
  /** 请求总数 */
  totalRequests: number;
  /** 成功请求数 */
  successRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 平均响应时间（毫秒） */
  averageResponseTime: number;
  /** 最小响应时间（毫秒） */
  minResponseTime: number;
  /** 最大响应时间（毫秒） */
  maxResponseTime: number;
  /** 成功率（百分比） */
  successRate: number;
  /** 按 URL 分组的统计 */
  urlStats: Record<string, UrlStats>;
}
```

### performanceMonitor

全局性能监控器实例。

## 📝 使用示例

### 示例 1：基本性能监控

```typescript
import { performanceMonitor } from '@suga/request-performance';
import { onRequestStart, onRequestSuccess, onRequestError } from '@suga/request-events';

// 集成到事件系统
onRequestStart(data => {
  performanceMonitor.onRequestStart(data.config);
});

onRequestSuccess(data => {
  performanceMonitor.onRequestSuccess(data.config, data.duration);
});

onRequestError(data => {
  performanceMonitor.onRequestError(data.config, data.error, data.duration);
});

// 获取性能指标
const metrics = performanceMonitor.getMetrics();
console.log('Performance Metrics:', metrics);
```

### 示例 2：监控特定 URL

```typescript
import { performanceMonitor } from '@suga/request-performance';

// 发送请求后获取特定 URL 的统计
const metrics = performanceMonitor.getMetrics();
const urlStats = metrics.urlStats['/api/users'];

if (urlStats) {
  console.log(`URL: /api/users`);
  console.log(`Total requests: ${urlStats.count}`);
  console.log(`Success count: ${urlStats.successCount}`);
  console.log(`Average time: ${urlStats.averageTime}ms`);
}
```

### 示例 3：性能报告

```typescript
import { performanceMonitor } from '@suga/request-performance';

function generatePerformanceReport() {
  const metrics = performanceMonitor.getMetrics();

  console.log('=== Performance Report ===');
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Success Requests: ${metrics.successRequests}`);
  console.log(`Failed Requests: ${metrics.failedRequests}`);
  console.log(`Success Rate: ${metrics.successRate.toFixed(2)}%`);
  console.log(`Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
  console.log(`Min Response Time: ${metrics.minResponseTime}ms`);
  console.log(`Max Response Time: ${metrics.maxResponseTime}ms`);

  console.log('\n=== URL Statistics ===');
  Object.entries(metrics.urlStats).forEach(([url, stats]) => {
    console.log(`${url}:`);
    console.log(`  Count: ${stats.count}`);
    console.log(`  Success: ${stats.successCount}`);
    console.log(`  Average Time: ${stats.averageTime.toFixed(2)}ms`);
  });
}

// 生成报告
generatePerformanceReport();
```

### 示例 4：重置统计

```typescript
import { performanceMonitor } from '@suga/request-performance';

// 重置所有统计
performanceMonitor.reset();

// 重新开始监控
const metrics = performanceMonitor.getMetrics();
console.log('All metrics reset:', metrics.totalRequests === 0);
```

### 示例 5：检测慢请求

```typescript
import { performanceMonitor } from '@suga/request-performance';
import { onRequestComplete } from '@suga/request-events';

onRequestComplete(data => {
  if (data.duration > 1000) {
    const metrics = performanceMonitor.getMetrics();
    console.warn(`Slow request detected: ${data.config.url} (${data.duration}ms)`);
    console.warn(`Current average: ${metrics.averageResponseTime.toFixed(2)}ms`);
  }
});
```

## 🏗️ 架构

```
request-performance/
├── src/
│   ├── types.ts                  # 类型定义
│   ├── PerformanceMonitor.ts    # 性能监控器
│   └── index.ts                  # 入口文件
```

## 🔧 实现细节

1. **统计收集**：自动收集请求总数、成功数、失败数、响应时间等指标
2. **URL 分组**：按 URL 分组统计，便于分析特定接口的性能
3. **性能计算**：自动计算平均响应时间、最小/最大响应时间、成功率等
4. **内存管理**：使用 Map 存储 URL 统计，避免内存泄漏

## 📄 License

MIT
