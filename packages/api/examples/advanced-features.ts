/**
 * 高级功能示例
 * 展示请求重试、缓存、去重、取消等高级功能
 */

import { createRequest } from '../request';
import { performanceMonitor } from '../utils/features/performance';
import type { PerformanceMetrics } from '../utils/features/performance';

const request = createRequest(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

// ========== 请求重试 ==========

/**
 * 带重试的请求
 * 适用于网络不稳定或服务器临时错误的情况
 */
async function fetchDataWithRetry() {
  const data = await request.get(
    '/data',
    {},
    {
      retry: true,
      retryCount: 3, // 最多重试 3 次
      retryOnTimeout: true, // 超时时也重试
    },
  );
  return data;
}

/**
 * 自定义重试策略
 */
async function fetchDataWithCustomRetry() {
  const data = await request.get(
    '/data',
    {},
    {
      retry: true,
      retryCount: 5,
      retryOnTimeout: false, // 超时不重试
    },
  );
  return data;
}

// ========== 请求缓存 ==========

/**
 * 使用缓存的请求
 * 适用于不经常变化的数据，减少服务器压力
 */
async function fetchCachedData() {
  const data = await request.get(
    '/config',
    {},
    {
      cache: true,
      cacheExpireTime: 5 * 60 * 1000, // 缓存 5 分钟
    },
  );
  return data;
}

/**
 * 强制刷新缓存
 */
async function fetchFreshData() {
  // 禁用缓存，强制从服务器获取最新数据
  const data = await request.get(
    '/config',
    {},
    {
      cache: false,
    },
  );
  return data;
}

// ========== 请求去重 ==========

/**
 * 使用去重的请求
 * 防止短时间内重复发送相同请求
 */
async function fetchDataWithDedupe() {
  // 如果同时调用多次，只会发送一次请求
  const data = await request.get(
    '/data',
    {},
    {
      dedupe: true,
    },
  );
  return data;
}

/**
 * 禁用去重（默认启用）
 */
async function fetchDataWithoutDedupe() {
  const data = await request.get(
    '/data',
    {},
    {
      dedupe: false, // 禁用去重
    },
  );
  return data;
}

// ========== 请求取消 ==========

/**
 * 可取消的请求
 */
async function fetchCancellableData() {
  const requestId = 'fetch-data-001';

  try {
    const data = await request.get(
      '/data',
      {},
      {
        cancelable: true,
        requestId, // 设置请求 ID，便于取消
      },
    );
    return data;
  } catch (error: any) {
    if (error.name === 'CanceledError') {
      console.log('请求已取消');
      return null;
    }
    throw error;
  }
}

/**
 * 取消请求
 */
import { cancelTokenManager } from '../utils/request/cancel';

function cancelRequest(requestId: string) {
  cancelTokenManager.cancel(requestId);
}

// ========== Loading 控制 ==========

/**
 * 禁用 Loading
 * 适用于快速请求，避免闪烁
 */
async function fetchDataWithoutLoading() {
  const data = await request.get(
    '/data',
    {},
    {
      loading: false,
    },
  );
  return data;
}

/**
 * 自定义 Loading 延迟
 * 只有请求超过指定时间才显示 Loading
 */
import { loadingManager } from '../utils/features/loading';

loadingManager.setHandlers({
  show: () => console.log('显示 Loading'),
  hide: () => console.log('隐藏 Loading'),
  delay: 300, // 300ms 后才显示 Loading
});

// ========== 错误处理 ==========

/**
 * 禁用错误提示
 * 适用于需要自定义错误处理的场景
 */
async function fetchDataWithoutErrorToast() {
  try {
    const data = await request.get(
      '/data',
      {},
      {
        showError: false, // 禁用默认错误提示
      },
    );
    return data;
  } catch (error) {
    // 自定义错误处理
    console.error('请求失败:', error);
    // 可以显示自定义的错误提示
    return null;
  }
}

/**
 * 自定义错误处理
 */
async function fetchDataWithCustomErrorHandler() {
  const data = await request.get(
    '/data',
    {},
    {
      onError: (error, errorResponse) => {
        // 自定义错误处理逻辑
        console.error('请求错误:', errorResponse);
        // 返回 true 表示已处理，不再执行默认处理
        return true;
      },
    },
  );
  return data;
}

// ========== 请求优先级和队列 ==========

/**
 * 高优先级请求
 * 适用于重要请求，优先处理
 */
async function fetchHighPriorityData() {
  const request = createRequest(undefined, {
    baseURL: '/api',
    timeout: 10000,
    queueConfig: {
      maxConcurrent: 5, // 最大并发数
      queueStrategy: 'priority', // 优先级队列
    },
  });

  const data = await request.get(
    '/important-data',
    {},
    {
      priority: 'high', // 高优先级
    },
  );
  return data;
}

// ========== 熔断器 ==========

/**
 * 使用熔断器的请求
 * 适用于服务不稳定时自动降级
 */
async function fetchDataWithCircuitBreaker() {
  const data = await request.get(
    '/data',
    {},
    {
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5, // 失败 5 次后开启熔断
        timeout: 60000, // 60 秒后尝试恢复
        fallback: () => {
          // 降级数据
          return { data: [], message: '服务暂时不可用' };
        },
      },
    },
  );
  return data;
}

// ========== 超时策略 ==========

/**
 * 自定义超时时间
 */
async function fetchDataWithCustomTimeout() {
  const data = await request.get(
    '/slow-api',
    {},
    {
      timeout: 30000, // 30 秒超时
    },
  );
  return data;
}

/**
 * 设置超时策略
 */
export function setupTimeoutStrategy() {
  const requestWithTimeoutStrategy = createRequest(undefined, {
    baseURL: '/api',
    timeout: 10000,
  });

  // 设置超时策略：POST 请求使用更长的超时时间
  requestWithTimeoutStrategy.setTimeoutStrategy({
    byMethod: {
      POST: 30000, // POST 请求 30 秒超时
      GET: 10000, // GET 请求 10 秒超时
    },
  });

  return requestWithTimeoutStrategy;
}

// ========== 性能监控 ==========

/**
 * 获取性能指标
 * 性能监控会自动记录所有请求的统计信息
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const metrics = performanceMonitor.getMetrics();
  return metrics;
}

/**
 * 查看性能统计信息
 */
export function viewPerformanceStats() {
  const metrics = performanceMonitor.getMetrics();

  console.log('=== 性能统计 ===');
  console.log(`总请求数: ${metrics.totalRequests}`);
  console.log(`成功请求数: ${metrics.successRequests}`);
  console.log(`失败请求数: ${metrics.failedRequests}`);
  console.log(`成功率: ${metrics.successRate.toFixed(2)}%`);
  console.log(`平均响应时间: ${metrics.averageResponseTime.toFixed(2)}ms`);
  console.log(`最小响应时间: ${metrics.minResponseTime}ms`);
  console.log(`最大响应时间: ${metrics.maxResponseTime}ms`);

  if (Object.keys(metrics.urlStats).length > 0) {
    console.log('\n=== 按 URL 统计 ===');
    Object.entries(metrics.urlStats).forEach(([url, stats]) => {
      console.log(`${url}:`);
      console.log(`  请求次数: ${stats.count}`);
      console.log(`  成功次数: ${stats.successCount}`);
      console.log(`  平均响应时间: ${stats.averageTime.toFixed(2)}ms`);
    });
  }
}

/**
 * 重置性能统计
 */
export function resetPerformanceMetrics(): void {
  performanceMonitor.reset();
  console.log('性能统计已重置');
}

/**
 * 监控特定请求的性能
 */
export async function monitorRequestPerformance<T>(
  requestFn: () => Promise<T>,
  url: string,
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await requestFn();
    const duration = Date.now() - startTime;

    // 手动记录成功请求
    performanceMonitor.onRequestSuccess({ url } as any, duration);

    console.log(`请求 ${url} 完成，耗时: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // 手动记录失败请求
    performanceMonitor.onRequestError({ url } as any, error as Error, duration);

    console.error(`请求 ${url} 失败，耗时: ${duration}ms`);
    throw error;
  }
}

/**
 * 性能监控使用示例
 */
export async function performanceMonitoringExample() {
  // 执行一些请求
  await request.get('/api/user');
  await request.get('/api/user');
  await request.post('/api/user', { name: 'John' });

  // 查看性能统计
  viewPerformanceStats();

  // 获取性能指标对象
  const metrics = getPerformanceMetrics();
  console.log('性能指标:', metrics);

  // 监控特定请求
  await monitorRequestPerformance(() => request.get('/api/data'), '/api/data');

  // 重置统计（可选）
  // resetPerformanceMetrics();
}

export {
  fetchDataWithRetry,
  fetchDataWithCustomRetry,
  fetchCachedData,
  fetchFreshData,
  fetchDataWithDedupe,
  fetchDataWithoutDedupe,
  fetchCancellableData,
  cancelRequest,
  fetchDataWithoutLoading,
  fetchDataWithoutErrorToast,
  fetchDataWithCustomErrorHandler,
  fetchHighPriorityData,
  fetchDataWithCircuitBreaker,
  fetchDataWithCustomTimeout,
};
