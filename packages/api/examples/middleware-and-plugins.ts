/**
 * 中间件和插件示例
 * 展示如何使用中间件和插件扩展功能
 */

import { createRequest } from '../request';
import type { Middleware } from '../middleware/types';
import type { Plugin } from '../plugins/types';
import type { RequestConfig } from '../types';

const request = createRequest(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

// ========== 中间件示例 ==========

/**
 * 请求日志中间件
 */
const loggingMiddleware: Middleware = async (config, next) => {
  console.log('请求开始:', {
    url: config.url,
    method: config.method,
    timestamp: new Date().toISOString(),
  });

  const startTime = Date.now();
  try {
    const response = await next();
    const duration = Date.now() - startTime;

    console.log('请求成功:', {
      url: config.url,
      method: config.method,
      duration: `${duration}ms`,
      status: response.status,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('请求失败:', {
      url: config.url,
      method: config.method,
      duration: `${duration}ms`,
      error,
    });
    throw error;
  }
};

/**
 * 请求签名中间件
 */
const signatureMiddleware: Middleware = async (config, next) => {
  // 添加请求签名
  const timestamp = Date.now();
  const signature = generateSignature(config, timestamp);

  config.headers = config.headers || {};
  config.headers['X-Timestamp'] = String(timestamp);
  config.headers['X-Signature'] = signature;

  return next();
};

function generateSignature(config: RequestConfig, timestamp: number): string {
  // 简单的签名生成示例
  const secret = 'your-secret-key';
  const data = `${config.url}${config.method}${timestamp}${secret}`;
  // 实际项目中应使用更安全的签名算法
  return btoa(data);
}

/**
 * 请求重试中间件
 */
const retryMiddleware: Middleware = async (config, next) => {
  const maxRetries = 3;
  let lastError: any;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await next();
    } catch (error: any) {
      lastError = error;

      // 只在网络错误或服务器错误时重试
      if (i < maxRetries && (!error.response || error.response.status >= 500)) {
        const delay = Math.pow(2, i) * 1000; // 指数退避
        console.log(`请求失败，${delay}ms 后重试 (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

// ========== 插件示例 ==========

/**
 * 性能监控插件
 */
const performancePlugin: Plugin = {
  name: 'performance-monitor',
  version: '1.0.0',
  install(requestInstance: any) {
    // 监听请求开始事件
    requestInstance.on?.('request:start', (data: any) => {
      console.log('请求开始:', data);
    });

    // 监听请求成功事件
    requestInstance.on?.('request:success', (data: any) => {
      console.log('请求成功:', {
        url: data.config.url,
        duration: data.duration,
        status: data.response?.status,
      });
    });

    // 监听请求错误事件
    requestInstance.on?.('request:error', (data: any) => {
      console.error('请求错误:', {
        url: data.config.url,
        duration: data.duration,
        error: data.error,
      });
    });
  },
};

/**
 * 请求统计插件
 */
const statisticsPlugin: Plugin = {
  name: 'request-statistics',
  version: '1.0.0',
  install(requestInstance: any) {
    const stats = {
      total: 0,
      success: 0,
      error: 0,
      totalDuration: 0,
    };

    requestInstance.on?.('request:start', (_data: any) => {
      stats.total++;
    });

    requestInstance.on?.('request:success', (data: any) => {
      stats.success++;
      stats.totalDuration += data.duration || 0;
    });

    requestInstance.on?.('request:error', () => {
      stats.error++;
    });

    // 提供获取统计信息的方法
    (requestInstance as any).getStatistics = () => ({
      ...stats,
      averageDuration: stats.total > 0 ? stats.totalDuration / stats.total : 0,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
    });
  },
};

/**
 * 缓存插件
 */
const cachePlugin: Plugin = {
  name: 'cache-plugin',
  version: '1.0.0',
  install(requestInstance: any) {
    const cache = new Map<string, { data: any; timestamp: number; expireTime: number }>();

    // 拦截 GET 请求，检查缓存
    const originalGet = requestInstance.get.bind(requestInstance);
    requestInstance.get = async function (url: string, params?: any, config?: any) {
      const cacheKey = `${url}${JSON.stringify(params)}`;

      // 检查缓存
      const cached = cache.get(cacheKey);
      if (cached && Date.now() < cached.expireTime) {
        console.log('使用缓存:', url);
        return cached.data;
      }

      // 请求数据
      const data = await originalGet(url, params, config);

      // 保存到缓存
      const expireTime = Date.now() + (config?.cacheExpireTime || 5 * 60 * 1000);
      cache.set(cacheKey, { data, timestamp: Date.now(), expireTime });

      return data;
    };
  },
};

// ========== 使用示例 ==========

/**
 * 使用中间件
 */
export function useMiddlewareExample() {
  // 添加中间件（使用 useMiddleware 方法）
  request.useMiddleware(loggingMiddleware);
  request.useMiddleware(signatureMiddleware);
  // request.useMiddleware(retryMiddleware); // 可选：如果需要自定义重试逻辑

  // 使用请求
  request.get('/data').then(data => {
    console.log('数据:', data);
  });
}

/**
 * 使用插件
 */
export function usePluginExample() {
  // 安装插件
  request.use(performancePlugin);
  request.use(statisticsPlugin);
  request.use(cachePlugin);

  // 使用请求
  request.get('/data').then(data => {
    console.log('数据:', data);

    // 获取统计信息
    const stats = (request as any).getStatistics();
    console.log('请求统计:', stats);
  });
}

/**
 * 组合使用中间件和插件
 */
export function combinedExample() {
  // 添加中间件（使用 useMiddleware 方法）
  request.useMiddleware(loggingMiddleware);
  request.useMiddleware(signatureMiddleware);

  // 安装插件（使用 use 方法）
  request.use(performancePlugin);
  request.use(statisticsPlugin);

  // 使用请求
  request.get('/data').then(data => {
    console.log('数据:', data);
  });
}

export {
  loggingMiddleware,
  signatureMiddleware,
  retryMiddleware,
  performancePlugin,
  statisticsPlugin,
  cachePlugin,
};
