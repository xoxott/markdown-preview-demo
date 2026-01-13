/**
 * 响应处理逻辑
 */

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { BusinessErrorCode } from '../../constants';
import type { ApiResponse, ErrorResponse, RequestConfig } from '../../types';
import { handleBusinessError } from '../../utils/errors/errorHandler';

/**
 * 处理业务错误
 */
export async function handleBusinessErrorResponse(
  error: AxiosError<ErrorResponse> & { code?: number },
  errorResponse: ErrorResponse,
  config: RequestConfig,
): Promise<void> {
  // 如果跳过错误处理，直接返回（早期返回模式）
  if (config.skipErrorHandler) {
    return;
  }

  // 优先使用单次请求的自定义错误处理
  if (config.onError) {
    const handled = await config.onError(error, errorResponse);
    // 如果已处理，不再执行默认处理（早期返回模式）
    if (handled === true) {
      return;
    }
  }

  // 使用全局错误处理
  await handleBusinessError(errorResponse, { showError: config.showError !== false }, error);
}

/**
 * 处理响应数据
 * @param data 响应数据
 * @param config 请求配置
 * @returns 处理后的数据
 */
export async function handleResponseData<T>(
  data: unknown,
  config: RequestConfig,
): Promise<T> {
  // 如果响应数据本身就是目标类型（非标准格式），直接返回
  if (!data || typeof data !== 'object' || data === null || !('code' in data)) {
    return data as T;
  }

  // 类型守卫：确保是 ApiResponse 格式
  // 检查是否具有 ApiResponse 的结构
  if (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    'message' in data &&
    'data' in data
  ) {
    const apiResponse = data as ApiResponse<T>;

    // 标准响应格式处理
    const { code, message, data: responseData } = apiResponse;

    // 成功响应
    if (code === BusinessErrorCode.SUCCESS || code === 0) {
      return responseData as T;
    }

    // 业务错误处理
    const errorResponse: ErrorResponse = {
      code,
      message: message || '操作失败',
      timestamp: Date.now(),
    };

    // 构造错误对象（用于自定义处理）
    const error = new Error(message || '操作失败') as AxiosError<ErrorResponse> & {
      code?: number;
      config?: InternalAxiosRequestConfig;
    };
    Object.defineProperty(error, 'code', {
      value: code,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    error.config = config as InternalAxiosRequestConfig;

    // 处理业务错误
    await handleBusinessErrorResponse(error, errorResponse, config);

    // 抛出业务错误
    throw error;
  }

  // 如果不是 ApiResponse 格式，直接返回原数据
  return data as T;
}
