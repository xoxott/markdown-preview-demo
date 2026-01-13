/**
 * 错误处理工具
 */

import type { AxiosError } from 'axios';
import { HttpStatus, ERROR_MESSAGE_MAP } from '../../constants';
import type { ErrorResponse } from '../../types';

/**
 * 错误消息处理器类型
 */
export type ErrorMessageHandler = (errorResponse: ErrorResponse) => string | void;

/**
 * 自定义错误处理器类型
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
   * 获取错误消息
   */
  getMessage(errorResponse: ErrorResponse): string {
    if (this.handler) {
      const customMessage = this.handler(errorResponse);
      if (customMessage) {
        return customMessage;
      }
    }

    // 默认消息
    return errorResponse.message || ERROR_MESSAGE_MAP[errorResponse.code as number] || '请求失败';
  }
}

export const errorMessageManager = new ErrorMessageManager();

/**
 * 全局错误处理器管理器
 */
class GlobalErrorHandlerManager {
  private globalHandler: CustomErrorHandler | null = null;
  private errorLogHandler: ((error: AxiosError<ErrorResponse>, errorResponse: ErrorResponse) => void) | null = null;

  /**
   * 设置全局错误处理器
   */
  setGlobalHandler(handler: CustomErrorHandler): void {
    this.globalHandler = handler;
  }

  /**
   * 设置错误日志处理器
   */
  setErrorLogHandler(
    handler: (error: AxiosError<ErrorResponse>, errorResponse: ErrorResponse) => void,
  ): void {
    this.errorLogHandler = handler;
  }

  /**
   * 处理错误
   */
  async handle(
    error: AxiosError<ErrorResponse>,
    errorResponse: ErrorResponse,
  ): Promise<boolean> {
    // 记录错误日志
    if (this.errorLogHandler) {
      this.errorLogHandler(error, errorResponse);
    }

    // 执行全局错误处理器
    if (this.globalHandler) {
      const handled = await this.globalHandler(error, errorResponse);
      if (handled === true) {
        return true;
      }
    }

    return false;
  }
}

export const globalErrorHandlerManager = new GlobalErrorHandlerManager();

/**
 * 获取错误消息
 */
export function getErrorMessage(error: AxiosError<ErrorResponse>): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return ERROR_MESSAGE_MAP[error.response?.status || 0] || '请求失败';
}

/**
 * 处理 HTTP 错误
 */
export async function handleHttpError(
  error: AxiosError<ErrorResponse>,
  options: { showError?: boolean; redirectToLogin?: boolean } = {},
): Promise<boolean> {
  const { showError = true, redirectToLogin = false } = options;
  const errorResponse: ErrorResponse = {
    code: error.response?.status || 0,
    message: getErrorMessage(error),
    timestamp: Date.now(),
  };

  // 尝试使用全局错误处理器
  const handled = await globalErrorHandlerManager.handle(error, errorResponse);
  if (handled) {
    return true;
  }

  // 默认处理
  if (showError) {
    const message = errorMessageManager.getMessage(errorResponse);
    console.error(message);
  }

  // 重定向到登录页
  if (redirectToLogin && error.response?.status === HttpStatus.UNAUTHORIZED) {
    // 这里应该由应用层实现跳转逻辑
    console.warn('需要跳转到登录页');
  }

  return false;
}

/**
 * 处理业务错误
 */
export async function handleBusinessError(
  errorResponse: ErrorResponse,
  options: { showError?: boolean } = {},
  error?: AxiosError<ErrorResponse>,
): Promise<void> {
  const { showError = true } = options;

  // 尝试使用全局错误处理器
  if (error) {
    const handled = await globalErrorHandlerManager.handle(error, errorResponse);
    if (handled) {
      return;
    }
  }

  // 默认处理
  if (showError) {
    const message = errorMessageManager.getMessage(errorResponse);
    console.error(message);
  }
}

