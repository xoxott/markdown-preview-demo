/**
 * 真实场景示例
 * 展示在实际项目中的常见使用场景
 */

import { createRequest } from '../request';
import { configureTokenRefresh, loadingManager, errorMessageManager } from '../index';
import type { RequestConfig } from '../types';

// ========== 场景 1: 完整的应用初始化 ==========

/**
 * 应用初始化配置
 * 在应用启动时调用
 */
export function initializeApp() {
  // 1. 创建请求实例
  const requestInstance = createRequest(undefined, {
    baseURL: (import.meta as any).env?.VITE_API_BASE_URL || '/api',
    timeout: 10000,
    queueConfig: {
      maxConcurrent: 10,
      queueStrategy: 'priority',
    },
  });

  // 2. 配置 Loading
  loadingManager.setHandlers({
    show: () => {
      // 使用你的 UI 库显示 Loading
      console.log('显示 Loading');
    },
    hide: () => {
      // 使用你的 UI 库隐藏 Loading
      console.log('隐藏 Loading');
    },
    delay: 200, // 200ms 后才显示 Loading，避免闪烁
  });

  // 3. 配置错误提示
  errorMessageManager.setHandler((message: string) => {
    // 使用你的 UI 库显示错误提示
    console.error('错误提示:', message);
  });

  // 4. 配置 Token 刷新
  configureTokenRefresh({
    refreshTokenUrl: '/api/auth/refresh',
    refreshTokenMethod: 'POST',
    refreshTokenParamKey: 'refreshToken',
    tokenKeyInResponse: 'token',
    refreshTokenKeyInResponse: 'refreshToken',
    onRefreshFailed: () => {
      // Token 刷新失败，跳转到登录页
      window.location.href = '/login';
    },
  });

  // 5. 设置全局错误处理
  // ... (参考 error-handling.ts)

  return requestInstance;
}

// ========== 场景 2: 分页列表 ==========

interface PaginationParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

interface PaginationResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 分页列表请求
 */
export async function fetchPaginationList<T>(
  url: string,
  params: PaginationParams,
  options?: RequestConfig,
): Promise<PaginationResponse<T>> {
  const requestInstance = createRequest();
  const response = await requestInstance.get<PaginationResponse<T>>(url, params, {
    cache: true, // 启用缓存
    cacheExpireTime: 2 * 60 * 1000, // 缓存 2 分钟
    ...options,
  });
  return response;
}

// ========== 场景 3: 搜索功能 ==========

/**
 * 搜索请求（带防抖和去重）
 */
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

export function search(keyword: string, onResult: (results: any[]) => void) {
  // 清除之前的定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // 防抖：500ms 后才发送请求
  searchTimeout = setTimeout(async () => {
    if (!keyword.trim()) {
      onResult([]);
      return;
    }

    try {
      const requestInstance = createRequest();
      const results = await requestInstance.get<any[]>(
        '/search',
        { keyword },
        {
          dedupe: true, // 去重：相同搜索词只发送一次请求
          loading: false, // 搜索不显示 Loading
        },
      );
      onResult(results);
    } catch (error) {
      console.error('搜索失败:', error);
      onResult([]);
    }
  }, 500);
}

// ========== 场景 4: 表单提交 ==========

/**
 * 表单提交（带 Loading 和错误处理）
 */
export async function submitForm(formData: Record<string, any>): Promise<boolean> {
  const request = createRequest();

  try {
    await request.post('/form/submit', formData, {
      loading: true, // 显示 Loading
      showError: true, // 显示错误提示
    });
    return true;
  } catch (error) {
    console.error('表单提交失败:', error);
    return false;
  }
}

/**
 * 表单提交（带验证和重试）
 */
export async function submitFormWithRetry(formData: Record<string, any>): Promise<boolean> {
  const request = createRequest();

  try {
    await request.post('/form/submit', formData, {
      loading: true,
      retry: true,
      retryCount: 2, // 失败后重试 2 次
      retryOnTimeout: true,
    });
    return true;
  } catch (error) {
    console.error('表单提交失败:', error);
    return false;
  }
}

// ========== 场景 5: 数据同步 ==========

/**
 * 批量数据同步
 */
export async function syncData(items: Array<{ id: number; data: any }>): Promise<void> {
  // 使用队列控制并发
  const requestWithQueue = createRequest(undefined, {
    baseURL: '/api',
    queueConfig: {
      maxConcurrent: 3, // 最多 3 个并发请求
      queueStrategy: 'fifo',
    },
  });

  // 批量同步
  const promises = items.map(item =>
    requestWithQueue.put(`/data/${item.id}`, item.data, {
      priority: 'normal' as const,
      loading: false, // 批量操作不显示 Loading
    }),
  );

  await Promise.all(promises);
}

// ========== 场景 6: 实时数据更新 ==========

/**
 * 轮询数据
 */
export function pollData(
  url: string,
  interval: number,
  onUpdate: (data: any) => void,
  onError?: (error: any) => void,
): () => void {
  const request = createRequest();
  let polling = true;

  const fetchData = async () => {
    if (!polling) return;

    try {
      const data = await request.get(
        url,
        {},
        {
          cache: false, // 轮询不使用缓存
          loading: false, // 轮询不显示 Loading
          dedupe: false, // 轮询不去重
        },
      );
      onUpdate(data);
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error('轮询失败:', error);
      }
    }

    if (polling) {
      setTimeout(fetchData, interval);
    }
  };

  fetchData();

  // 返回停止函数
  return () => {
    polling = false;
  };
}

// ========== 场景 7: 文件上传进度 ==========

/**
 * 文件上传（带进度显示）
 */
export async function uploadFileWithProgress(
  file: File,
  onProgress: (percent: number) => void,
): Promise<{ url: string }> {
  const request = createRequest();

  const formData = new FormData();
  formData.append('file', file);

  const result = await request.upload<{ url: string }>('/upload', formData, {
    onUploadProgress: progressEvent => {
      const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
      onProgress(percent);
    },
    timeout: 60000, // 文件上传需要更长的超时时间
  });

  return result;
}

// ========== 场景 8: 请求取消 ==========

/**
 * 可取消的请求
 */
export function fetchCancellableData(requestId: string): Promise<any> {
  const request = createRequest();

  return request.get(
    '/data',
    {},
    {
      cancelable: true,
      requestId,
    },
  );
}

/**
 * 取消请求
 */
import { cancelTokenManager } from '../utils/request/cancel';

export function cancelDataRequest(requestId: string): void {
  cancelTokenManager.cancel(requestId);
}

// ========== 场景 9: 条件请求 ==========

/**
 * 条件请求（根据条件决定是否发送）
 */
export async function conditionalRequest(condition: boolean): Promise<any | null> {
  if (!condition) {
    return null;
  }

  const request = createRequest();
  return request.get('/data');
}

/**
 * 条件请求（根据缓存决定是否发送）
 */
export async function conditionalRequestWithCache(): Promise<any> {
  const request = createRequest();

  // 先尝试从缓存获取
  try {
    const cached = await request.get(
      '/data',
      {},
      {
        cache: true,
      },
    );
    return cached;
  } catch {
    // 缓存不存在或已过期，发送请求
    return request.get(
      '/data',
      {},
      {
        cache: true,
        cacheExpireTime: 5 * 60 * 1000,
      },
    );
  }
}

// ========== 场景 10: 请求优先级 ==========

/**
 * 高优先级请求（重要数据）
 */
export async function fetchImportantData(): Promise<any> {
  const request = createRequest(undefined, {
    baseURL: '/api',
    queueConfig: {
      maxConcurrent: 5,
      queueStrategy: 'priority',
    },
  });

  return request.get(
    '/important-data',
    {},
    {
      priority: 'high', // 高优先级
    },
  );
}

/**
 * 低优先级请求（非关键数据）
 */
export async function fetchLowPriorityData(): Promise<any> {
  const request = createRequest(undefined, {
    baseURL: '/api',
    queueConfig: {
      maxConcurrent: 5,
      queueStrategy: 'priority',
    },
  });

  return request.get(
    '/low-priority-data',
    {},
    {
      priority: 'low', // 低优先级
    },
  );
}

// 函数已在上面导出，这里不需要重复导出
