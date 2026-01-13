/**
 * 错误处理逻辑
 */

import type { AxiosError } from 'axios';
import { HttpStatus } from '../../constants';
import type { ErrorResponse, RequestConfig } from '../../types';
import { handleHttpError, getErrorMessage } from '../../utils/errors/errorHandler';
import { enhanceError, type EnhancedAxiosError } from '../../utils/errors/errorEnhancer';

/**
 * 处理 HTTP 错误
 */
export async function handleHttpErrorResponse(
  error: AxiosError<ErrorResponse>,
  errorResponse: ErrorResponse,
  config: RequestConfig | undefined,
  status: number,
): Promise<boolean> {
  // 如果跳过错误处理，直接返回
  if (config?.skipErrorHandler) {
    return false;
  }

  // 扩展错误对象
  const enhancedError = enhanceError(error, errorResponse, config);

  // 优先使用单次请求的自定义错误处理
  if (config?.onError) {
    const handled = await config.onError(enhancedError as AxiosError<ErrorResponse>, errorResponse);
    if (handled === true) {
      return true; // 已处理
    }
  }

  // 使用全局错误处理或默认处理
  const handled = await handleHttpError(enhancedError as AxiosError<ErrorResponse>, {
    showError: config?.showError !== false && status !== HttpStatus.UNAUTHORIZED, // 401 错误不显示提示，由刷新逻辑处理
    redirectToLogin: false, // 不自动跳转，由刷新逻辑处理
  });

  return handled;
}

/**
 * 处理网络错误
 */
export async function handleNetworkError(
  error: AxiosError<ErrorResponse>,
  config: RequestConfig | undefined,
): Promise<EnhancedAxiosError> {
  const networkErrorResponse: ErrorResponse = {
    code: 0,
    message: getErrorMessage(error),
    timestamp: Date.now(),
  };

  // 扩展错误对象
  const enhancedNetworkError = enhanceError(error, networkErrorResponse, config);

  // 如果跳过错误处理，直接返回
  if (config?.skipErrorHandler) {
    return enhancedNetworkError;
  }

  // 优先使用单次请求的自定义错误处理
  if (config?.onError) {
    const handled = await config.onError(
      enhancedNetworkError as AxiosError<ErrorResponse>,
      networkErrorResponse,
    );
    if (handled === true) {
      return enhancedNetworkError;
    }
  }

  // 使用全局错误处理或默认处理
  await handleHttpError(enhancedNetworkError as AxiosError<ErrorResponse>, {
    showError: config?.showError !== false,
  });

  return enhancedNetworkError;
}
