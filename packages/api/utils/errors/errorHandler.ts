/**
 * 错误处理工具
 */

import type { AxiosError } from 'axios';
import {
  HttpStatus,
  ERROR_MESSAGE_MAP,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  BusinessErrorCode,
} from '../../constants';
import { storageManager } from '../storage/storage';
import { internalError, internalWarn } from '../common/internalLogger';
import type { ErrorResponse } from '../../types';

/**
 * 错误消息显示函数类型
 */
export type ErrorMessageHandler = (message: string) => void;

/**
 * 自定义错误处理函数类型
 * @param error 错误对象
 * @param errorResponse 错误响应
 * @returns 是否已处理（返回 true 表示已处理，不再执行默认处理）
 */
export type CustomErrorHandler = (
  error: AxiosError<ErrorResponse>,
  errorResponse: ErrorResponse,
) => boolean | void | Promise<boolean | void>;

/**
 * 错误消息管理器
 */
class ErrorMessageManager {
  private handler: ErrorMessageHandler | null = null;

  /**
   * 设置错误消息处理器
   */
  setHandler(handler: ErrorMessageHandler): void {
    this.handler = handler;
  }

  /**
   * 显示错误消息
   */
  show(message: string): void {
    if (this.handler) {
      this.handler(message);
    } else {
      // 默认只输出到控制台
      console.error('Error:', message);
    }
  }

  /**
   * 清除处理器
   */
  clear(): void {
    this.handler = null;
  }
}

/**
 * 全局错误处理器管理器
 */
class GlobalErrorHandlerManager {
  private globalHandler: CustomErrorHandler | null = null;
  private errorLogHandler: ((error: ErrorResponse, errorObj: AxiosError) => void) | null = null;

  /**
   * 设置全局错误处理器
   */
  setGlobalHandler(handler: CustomErrorHandler): void {
    this.globalHandler = handler;
  }

  /**
   * 设置错误日志上报处理器
   */
  setErrorLogHandler(handler: (error: ErrorResponse, errorObj: AxiosError) => void): void {
    this.errorLogHandler = handler;
  }

  /**
   * 执行全局错误处理
   */
  async handle(error: AxiosError<ErrorResponse>, errorResponse: ErrorResponse): Promise<boolean> {
    // 错误日志上报
    if (this.errorLogHandler) {
      try {
        this.errorLogHandler(errorResponse, error);
      } catch (logError) {
        internalError('错误日志上报失败:', logError);
      }
    }

    // 全局错误处理
    if (this.globalHandler) {
      try {
        const result = await this.globalHandler(error, errorResponse);
        // 如果返回 true，表示已处理，不再执行默认处理
        return result === true;
      } catch (handlerError) {
        internalError('全局错误处理器执行失败:', handlerError);
      }
    }

    return false;
  }

  /**
   * 清除全局处理器
   */
  clear(): void {
    this.globalHandler = null;
    this.errorLogHandler = null;
  }
}

// 创建全局错误处理器管理器实例
export const globalErrorHandlerManager = new GlobalErrorHandlerManager();

// 创建全局错误消息管理器实例
export const errorMessageManager = new ErrorMessageManager();

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否显示错误提示 */
  showError?: boolean;
  /** 自定义错误消息 */
  customMessage?: string;
  /** 是否跳转到登录页 */
  redirectToLogin?: boolean;
}

/**
 * 处理HTTP错误
 * @param error Axios错误对象
 * @param options 处理选项
 * @returns 是否已处理
 */
export async function handleHttpError(
  error: AxiosError<ErrorResponse>,
  options: ErrorHandlerOptions = {},
): Promise<boolean> {
  const { showError = true, customMessage, redirectToLogin = true } = options;

  // 早期返回：处理网络错误
  if (!error.response) {
    handleNetworkError(error, showError, customMessage);
    return false;
  }

  const status = error.response.status;
  const errorData = error.response.data;

  // 构造错误响应
  const errorResponse: ErrorResponse = {
    code: errorData?.code || status,
    message: errorData?.message || customMessage || ERROR_MESSAGE_MAP[status] || '请求失败',
    details: errorData?.details,
    path: error.config?.url,
    timestamp: Date.now(),
  };

  // 尝试全局错误处理（早期返回模式）
  const handled = await globalErrorHandlerManager.handle(error, errorResponse);
  if (handled) {
    return true; // 已由全局处理器处理，不再执行默认处理
  }

  const message = customMessage || errorResponse.message;

  // 显示错误提示
  if (showError) {
    showErrorMessage(message);
  }

  // 处理特定状态码（使用策略模式）
  handleHttpStatusError(status, redirectToLogin);

  return false;
}

/**
 * 处理 HTTP 状态码错误（策略模式）
 */
function handleHttpStatusError(status: number, redirectToLogin: boolean): void {
  const statusHandlers: Record<number, () => void> = {
    [HttpStatus.UNAUTHORIZED]: () => handleUnauthorized(redirectToLogin),
    [HttpStatus.FORBIDDEN]: () => handleForbidden(),
    [HttpStatus.NOT_FOUND]: () => handleNotFound(),
    [HttpStatus.INTERNAL_SERVER_ERROR]: () => handleServerError(),
  };

  const handler = statusHandlers[status];
  if (handler) {
    handler();
  }
}

/**
 * 处理业务错误
 * @param errorResponse 错误响应
 * @param options 处理选项
 * @param error 原始错误对象（可选，用于自定义处理）
 * @returns 是否已处理
 */
export async function handleBusinessError(
  errorResponse: ErrorResponse,
  options: ErrorHandlerOptions = {},
  error?: AxiosError<ErrorResponse>,
): Promise<boolean> {
  // 如果有原始错误对象，尝试全局错误处理（早期返回模式）
  if (error) {
    const handled = await globalErrorHandlerManager.handle(error, errorResponse);
    if (handled) {
      return true; // 已由全局处理器处理，不再执行默认处理
    }
  }

  const { showError = true, customMessage } = options;
  const message = customMessage || errorResponse.message || '操作失败';

  if (showError) {
    showErrorMessage(message);
  }

  // 处理特定业务错误码（使用策略模式）
  handleBusinessErrorCode(errorResponse.code, options.redirectToLogin, message);

  return false;
}

/**
 * 处理业务错误码（策略模式）
 */
function handleBusinessErrorCode(
  code: number | string,
  redirectToLogin: boolean | undefined,
  message: string,
): void {
  const errorCodeHandlers: Record<number, () => void> = {
    [BusinessErrorCode.TOKEN_EXPIRED]: () => handleTokenError(redirectToLogin),
    [BusinessErrorCode.TOKEN_INVALID]: () => handleTokenError(redirectToLogin),
    [BusinessErrorCode.PARAM_ERROR]: () => handleParamError(message),
  };

  const handler = errorCodeHandlers[typeof code === 'number' ? code : Number(code)];
  if (handler) {
    handler();
  }
}

/**
 * 处理网络错误
 * @param error 错误对象
 * @param showError 是否显示错误
 * @param customMessage 自定义消息
 */
function handleNetworkError(error: AxiosError, showError: boolean, customMessage?: string): void {
  let message = customMessage;

  if (!message) {
    if (error.code === 'ECONNABORTED') {
      message = '请求超时，请稍后重试';
    } else if (error.message.includes('Network Error')) {
      message = '网络连接失败，请检查网络设置';
    } else {
      message = '网络错误，请稍后重试';
    }
  }

  if (showError) {
    showErrorMessage(message);
  }
}

/**
 * 处理未授权错误
 * @param redirectToLogin 是否跳转到登录页
 */
function handleUnauthorized(redirectToLogin: boolean): void {
  // 清除Token
  clearAuthToken();

  if (redirectToLogin && typeof window !== 'undefined') {
    // 延迟跳转，避免在拦截器中直接跳转
    setTimeout(() => {
      try {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      } catch (error) {
        internalError('跳转登录页失败:', error);
      }
    }, 100);
  }
}

/**
 * 处理禁止访问错误
 */
function handleForbidden(): void {
  // 可以在这里添加权限不足的提示或跳转
  internalWarn('权限不足');
}

/**
 * 处理资源不存在错误
 */
function handleNotFound(): void {
  // 可以在这里添加404页面跳转
  internalWarn('资源不存在');
}

/**
 * 处理服务器错误
 */
function handleServerError(): void {
  // 可以在这里添加服务器错误的特殊处理
  internalError('服务器内部错误');
}

/**
 * 处理Token错误
 * @param redirectToLogin 是否跳转到登录页
 */
function handleTokenError(redirectToLogin: boolean = true): void {
  clearAuthToken();

  if (redirectToLogin && typeof window !== 'undefined') {
    setTimeout(() => {
      try {
        window.location.href = '/login';
      } catch (error) {
        internalError('跳转登录页失败:', error);
      }
    }, 100);
  }
}

/**
 * 处理参数错误
 * @param message 错误消息
 */
function handleParamError(message: string): void {
  // 参数错误通常已经在showErrorMessage中显示了
  internalWarn('参数错误:', message);
}

/**
 * 显示错误消息
 * @param message 错误消息
 */
function showErrorMessage(message: string): void {
  errorMessageManager.show(message);
}

/**
 * 清除认证Token
 */
function clearAuthToken(): void {
  storageManager.removeItem(TOKEN_KEY);
  storageManager.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * 类型守卫：检查是否为包含 response.data.message 的错误对象
 */
function hasResponseDataMessage(error: unknown): error is {
  response: { data: { message: string } };
} {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    error.response !== null &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data !== null &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  );
}

/**
 * 类型守卫：检查是否为包含 message 的错误对象
 */
function hasMessage(error: unknown): error is { message: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

/**
 * 类型守卫：检查是否为包含 response.status 的错误对象
 */
function hasResponseStatus(error: unknown): error is {
  response: { status: number };
} {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    error.response !== null &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  );
}

/**
 * 获取错误消息
 * @param error 错误对象
 * @returns 错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (hasResponseDataMessage(error)) {
    return error.response.data.message;
  }

  if (hasMessage(error)) {
    return error.message;
  }

  if (hasResponseStatus(error)) {
    return ERROR_MESSAGE_MAP[error.response.status] || '请求失败';
  }

  return '未知错误';
}
