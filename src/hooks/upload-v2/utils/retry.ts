/**
 * 重试工具函数
 */

/** 错误类型枚举 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  ABORT_ERROR = 'ABORT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/** 错误信息接口 */
export interface ErrorInfo {
  type: ErrorType;
  code?: string | number;
  message: string;
  originalError?: Error;
  retryable: boolean;
}

/**
 * 判断错误类型
 */
export function classifyError(error: unknown): ErrorInfo {
  // 类型守卫：检查是否为 Error 对象
  const isError = (err: unknown): err is Error => {
    return err instanceof Error;
  };

  // 类型守卫：检查是否为包含 status/code 的对象
  const isErrorWithStatus = (err: unknown): err is { status?: number; code?: string | number; message?: string } => {
    return typeof err === 'object' && err !== null;
  };

  const err = isErrorWithStatus(error) ? error : null;
  const errorMessage = isError(error) ? error.message : err?.message || '';
  const errorName = isError(error) ? error.name : err?.status?.toString() || '';

  // 中止错误
  if (errorName === 'AbortError' || err?.code === 'ABORT_ERR' || errorMessage.includes('aborted')) {
    return {
      type: ErrorType.ABORT_ERROR,
      message: '请求已取消',
      retryable: false,
      originalError: isError(error) ? error : undefined
    };
  }

  // 超时错误
  if (errorName === 'TimeoutError' || errorMessage.includes('timeout') || errorMessage.includes('超时')) {
    return {
      type: ErrorType.TIMEOUT_ERROR,
      message: '请求超时',
      retryable: true,
      originalError: isError(error) ? error : undefined
    };
  }

  // 网络错误
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('网络')
  ) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: '网络错误',
      retryable: true,
      originalError: isError(error) ? error : undefined
    };
  }

  // 服务器错误（5xx）
  if (err?.status && err.status >= 500) {
    return {
      type: ErrorType.SERVER_ERROR,
      code: err.status,
      message: `服务器错误: ${err.status}`,
      retryable: true,
      originalError: isError(error) ? error : undefined
    };
  }

  // 其他错误
  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: errorMessage || '未知错误',
    retryable: false,
    originalError: isError(error) ? error : undefined
  };
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  const errorInfo = classifyError(error);
  return errorInfo.retryable;
}

/**
 * 计算重试延迟（指数退避）
 */
export function calculateRetryDelay(
  retryCount: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  backoffMultiplier: number = 1.5
): number {
  const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, retryCount), maxDelay);
  // 添加随机抖动，避免雷群效应
  const jitter = delay * 0.1 * Math.random();
  return Math.floor(delay + jitter);
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的函数执行器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryable?: (error: unknown) => boolean;
    onRetry?: (error: unknown, retryCount: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 1.5,
    retryable = isRetryableError,
    onRetry
  } = options;

  let lastError: any;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果不可重试或已达到最大重试次数，抛出错误
      if (!retryable(error) || retryCount >= maxRetries) {
        throw error;
      }

      // 计算延迟并等待
      const delayMs = calculateRetryDelay(retryCount, baseDelay, maxDelay, backoffMultiplier);
      
      if (onRetry) {
        onRetry(error, retryCount + 1);
      }

      await delay(delayMs);
      retryCount++;
    }
  }

  throw lastError;
}

