/**
 * 错误处理示例
 * 展示各种错误处理场景和最佳实践
 */

import { createRequest } from '../request';
import { globalErrorHandlerManager } from '../utils/errors/errorHandler';
import { createErrorContextFromError, type ErrorContext } from '../utils/errors/errorContext';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../types';

const request = createRequest(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

// ========== 全局错误处理 ==========

/**
 * 设置全局错误处理器
 * 适用于统一处理所有请求错误
 */
export function setupGlobalErrorHandler() {
  globalErrorHandlerManager.setGlobalHandler(
    async (error: AxiosError<ErrorResponse>, errorResponse: ErrorResponse) => {
      // 自定义错误处理逻辑
      console.error('全局错误处理:', errorResponse);

      // 根据错误码进行不同处理
      if (errorResponse.code === 401) {
        // 未授权，跳转到登录页
        window.location.href = '/login';
        return true; // 返回 true 表示已处理，不再执行默认处理
      }

      if (errorResponse.code === 403) {
        // 无权限，显示提示
        console.warn('无权限访问');
        return true;
      }

      // 返回 false 或 undefined，继续执行默认处理
      return false;
    },
  );
}

/**
 * 设置错误日志上报
 */
export function setupErrorLogging() {
  globalErrorHandlerManager.setErrorLogHandler(
    (errorResponse: ErrorResponse, error: AxiosError) => {
      // 上报错误到监控系统
      console.log('上报错误:', {
        code: errorResponse.code,
        message: errorResponse.message,
        url: error.config?.url,
        method: error.config?.method,
        timestamp: new Date().toISOString(),
      });

      // 实际项目中可以发送到错误监控服务
      // fetch('/api/error-log', {
      //   method: 'POST',
      //   body: JSON.stringify({ errorResponse, error }),
      // });
    },
  );
}

// ========== 单次请求错误处理 ==========

/**
 * 使用 onError 处理单个请求的错误
 */
export async function fetchDataWithCustomErrorHandler() {
  try {
    const data = await request.get(
      '/data',
      {},
      {
        onError: (error, errorResponse) => {
          // 自定义错误处理
          console.error('请求错误:', errorResponse);

          // 根据错误码进行不同处理
          if (errorResponse.code === 404) {
            console.log('资源不存在');
            return true; // 已处理，不显示默认错误提示
          }

          return false; // 继续执行默认处理
        },
      },
    );
    return data;
  } catch (error) {
    // 如果 onError 返回 false，错误会继续抛出
    console.error('请求失败:', error);
    throw error;
  }
}

/**
 * 跳过错误处理
 * 适用于需要完全自定义错误处理的场景
 */
export async function fetchDataSkipErrorHandler() {
  try {
    const data = await request.get(
      '/data',
      {},
      {
        skipErrorHandler: true, // 跳过所有错误处理
      },
    );
    return data;
  } catch (error) {
    // 完全自定义错误处理
    const axiosError = error as AxiosError<ErrorResponse>;
    if (axiosError.response) {
      const status = axiosError.response.status;
      if (status === 404) {
        console.log('资源不存在');
      } else if (status >= 500) {
        console.error('服务器错误');
      }
    } else {
      console.error('网络错误');
    }
    throw error;
  }
}

// ========== 业务错误处理 ==========

/**
 * 处理业务错误
 */
export async function handleBusinessError() {
  try {
    const data = await request.post('/user', { name: 'John' });
    return data;
  } catch (error: any) {
    // 检查是否是业务错误
    if (error.response?.data?.code && error.response.data.code !== 0) {
      const businessError = error.response.data;
      console.error('业务错误:', businessError.message);

      // 根据业务错误码进行处理
      switch (businessError.code) {
        case 1001:
          console.log('Token 已过期');
          break;
        case 1002:
          console.log('Token 无效');
          break;
        case 1003:
          console.log('参数错误');
          break;
        default:
          console.log('业务错误:', businessError.message);
      }
    }
    throw error;
  }
}

// ========== 网络错误处理 ==========

/**
 * 处理网络错误
 */
export async function handleNetworkError() {
  try {
    const data = await request.get('/data');
    return data;
  } catch (error: any) {
    if (!error.response) {
      // 网络错误（无响应）
      console.error('网络错误，请检查网络连接');

      // 可以提示用户检查网络
      // errorMessageManager.show('网络错误，请检查网络连接');

      throw error;
    }
    throw error;
  }
}

// ========== 超时错误处理 ==========

/**
 * 处理超时错误
 */
export async function handleTimeoutError() {
  try {
    const data = await request.get(
      '/slow-api',
      {},
      {
        timeout: 5000,
        retryOnTimeout: true, // 超时时重试
      },
    );
    return data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('请求超时');
      // 可以提示用户稍后重试
    }
    throw error;
  }
}

// ========== 错误重试 ==========

/**
 * 带错误重试的请求
 */
export async function fetchDataWithRetry() {
  try {
    const data = await request.get(
      '/data',
      {},
      {
        retry: true,
        retryCount: 3,
        retryOnTimeout: true,
      },
    );
    return data;
  } catch (error) {
    // 重试后仍然失败
    console.error('请求失败，已重试:', error);
    throw error;
  }
}

// ========== 错误分类处理 ==========

/**
 * 根据错误类型进行分类处理
 */
export async function handleErrorByType() {
  try {
    const data = await request.get('/data');
    return data;
  } catch (error: any) {
    const axiosError = error as AxiosError<ErrorResponse>;

    if (!axiosError.response) {
      // 网络错误
      console.error('网络错误');
    } else {
      const status = axiosError.response.status;
      if (status >= 400 && status < 500) {
        // 客户端错误
        console.error('客户端错误:', status);
      } else if (status >= 500) {
        // 服务器错误
        console.error('服务器错误:', status);
      }
    }

    throw error;
  }
}

// ========== 异常捕获和上报 ==========

/**
 * 异常信息接口
 */
interface ErrorReport {
  /** 错误 ID */
  id: string;
  /** 错误类型 */
  type: 'network' | 'http' | 'business' | 'timeout' | 'unknown';
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: number | string;
  /** 错误上下文 */
  context: ErrorContext;
  /** 错误堆栈 */
  stack?: string;
  /** 用户信息（可选） */
  userInfo?: {
    userId?: string;
    userName?: string;
  };
  /** 环境信息 */
  environment: {
    userAgent: string;
    url: string;
    timestamp: number;
  };
  /** 错误响应数据 */
  errorResponse?: ErrorResponse;
}

/**
 * 异常收集器
 */
class ErrorCollector {
  private errors: ErrorReport[] = [];
  private maxSize: number = 100; // 最多保存 100 条错误
  private reportUrl: string | null = null;
  private batchSize: number = 10; // 批量上报大小
  private reportInterval: number = 5000; // 5 秒上报一次

  /**
   * 配置异常收集器
   */
  configure(options: {
    reportUrl?: string;
    maxSize?: number;
    batchSize?: number;
    reportInterval?: number;
  }) {
    if (options.reportUrl) {
      this.reportUrl = options.reportUrl;
    }
    if (options.maxSize) {
      this.maxSize = options.maxSize;
    }
    if (options.batchSize) {
      this.batchSize = options.batchSize;
    }
    if (options.reportInterval) {
      this.reportInterval = options.reportInterval;
    }
  }

  /**
   * 收集异常
   */
  collect(error: AxiosError<ErrorResponse>, errorResponse?: ErrorResponse): void {
    const context = createErrorContextFromError(error);

    // 判断错误类型
    let errorType: ErrorReport['type'] = 'unknown';
    if (!error.response) {
      errorType = 'network';
    } else if (error.response.status >= 500) {
      errorType = 'http';
    } else if (errorResponse && errorResponse.code !== 0) {
      errorType = 'business';
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorType = 'timeout';
    }

    const report: ErrorReport = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: errorType,
      message: errorResponse?.message || error.message || 'Unknown error',
      code: errorResponse?.code || error.response?.status,
      context,
      stack: error.stack,
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        timestamp: Date.now(),
      },
      errorResponse,
    };

    // 添加到错误列表
    this.errors.push(report);

    // 如果超过最大数量，移除最旧的错误
    if (this.errors.length > this.maxSize) {
      this.errors.shift();
    }

    // 立即上报严重错误
    if (errorType === 'network' || (error.response && error.response.status >= 500)) {
      this.reportImmediately([report]);
    }
  }

  /**
   * 立即上报错误
   */
  private async reportImmediately(reports: ErrorReport[]): Promise<void> {
    if (!this.reportUrl || reports.length === 0) {
      return;
    }

    try {
      await fetch(this.reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors: reports }),
      });

      // 上报成功后，从列表中移除
      const reportedIds = new Set(reports.map(r => r.id));
      this.errors = this.errors.filter(e => !reportedIds.has(e.id));
    } catch (error) {
      console.error('错误上报失败:', error);
      // 上报失败，保留错误以便稍后重试
    }
  }

  /**
   * 批量上报错误
   */
  async reportBatch(): Promise<void> {
    if (!this.reportUrl || this.errors.length === 0) {
      return;
    }

    const batch = this.errors.slice(0, this.batchSize);
    await this.reportImmediately(batch);
  }

  /**
   * 获取所有未上报的错误
   */
  getUnreportedErrors(): ErrorReport[] {
    return [...this.errors];
  }

  /**
   * 清空错误列表
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * 启动自动上报（定时上报）
   */
  startAutoReport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    setInterval(() => {
      this.reportBatch();
    }, this.reportInterval);
  }
}

// 全局异常收集器实例
export const errorCollector = new ErrorCollector();

/**
 * 配置异常收集和上报
 */
export function setupErrorCollection(options: {
  reportUrl: string;
  maxSize?: number;
  batchSize?: number;
  reportInterval?: number;
  autoReport?: boolean;
}) {
  errorCollector.configure({
    reportUrl: options.reportUrl,
    maxSize: options.maxSize,
    batchSize: options.batchSize,
    reportInterval: options.reportInterval,
  });

  // 配置全局错误处理器，自动收集异常
  globalErrorHandlerManager.setErrorLogHandler((errorResponse, error) => {
    // 类型转换：errorHandler 中的 error 类型是 AxiosError<unknown>，需要转换为 AxiosError<ErrorResponse>
    const typedError = error as AxiosError<ErrorResponse>;
    errorCollector.collect(typedError, errorResponse);
  });

  // 启动自动上报
  if (options.autoReport !== false) {
    errorCollector.startAutoReport();
  }
}

/**
 * 手动上报所有未上报的错误
 */
export async function reportAllErrors(): Promise<void> {
  await errorCollector.reportBatch();
}

/**
 * 获取错误统计信息
 */
export function getErrorStatistics() {
  const errors = errorCollector.getUnreportedErrors();
  const stats = {
    total: errors.length,
    byType: {} as Record<string, number>,
    byCode: {} as Record<string, number>,
  };

  errors.forEach(error => {
    // 按类型统计
    stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

    // 按代码统计
    if (error.code) {
      const code = String(error.code);
      stats.byCode[code] = (stats.byCode[code] || 0) + 1;
    }
  });

  return stats;
}

/**
 * 捕获并上报 Promise 错误
 */
export function capturePromiseError<T>(
  promise: Promise<T>,
  context?: { url?: string; method?: string },
): Promise<T> {
  return promise.catch(error => {
    // 如果是 AxiosError，使用收集器收集
    if (error.isAxiosError) {
      errorCollector.collect(error);
    } else {
      // 其他错误，创建模拟的 AxiosError 结构
      const mockError = {
        ...error,
        isAxiosError: false,
        config: context ? { url: context.url, method: context.method } : undefined,
      } as any;
      errorCollector.collect(mockError);
    }
    throw error;
  });
}

/**
 * 全局异常捕获（捕获未处理的 Promise 错误）
 */
export function setupGlobalErrorCapture() {
  if (typeof window === 'undefined') {
    return;
  }

  // 捕获未处理的 Promise 错误
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;
    if (error?.isAxiosError) {
      errorCollector.collect(error);
    } else {
      // 创建模拟错误
      const mockError = {
        ...error,
        isAxiosError: false,
        message: error?.message || 'Unhandled promise rejection',
        stack: error?.stack,
      } as any;
      errorCollector.collect(mockError);
    }
  });

  // 捕获全局 JavaScript 错误
  window.addEventListener('error', event => {
    const error = {
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    } as any;
    errorCollector.collect(error);
  });
}

// ========== 使用示例 ==========

/**
 * 完整的错误处理示例
 */
export async function errorHandlingExample() {
  // 1. 设置全局错误处理
  setupGlobalErrorHandler();
  setupErrorLogging();

  // 2. 配置异常收集和上报
  setupErrorCollection({
    reportUrl: '/api/error-report',
    maxSize: 100,
    batchSize: 10,
    reportInterval: 5000,
    autoReport: true,
  });

  // 3. 设置全局异常捕获
  setupGlobalErrorCapture();

  // 4. 尝试请求
  try {
    const data = await fetchDataWithCustomErrorHandler();
    console.log('请求成功:', data);
  } catch (error) {
    console.error('请求失败:', error);
  }

  // 5. 处理业务错误
  try {
    await handleBusinessError();
  } catch (error) {
    console.error('业务错误处理:', error);
  }

  // 6. 查看错误统计
  const stats = getErrorStatistics();
  console.log('错误统计:', stats);

  // 7. 手动上报所有错误
  await reportAllErrors();
}
