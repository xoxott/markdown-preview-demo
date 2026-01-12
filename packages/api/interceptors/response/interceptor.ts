/**
 * 响应拦截器实现
 */

import axios, { type AxiosResponse, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { HttpStatus } from '../../constants';
import type { ApiResponse, ErrorResponse, RequestConfig } from '../../types';
import { getErrorMessage } from '../../utils/errors/errorHandler';
import { hideLoadingIfEnabled, cleanupCancelToken } from '../common';
import { logResponse, logError } from '../../utils/features/logger';
import { enhanceError } from '../../utils/errors/errorEnhancer';
import { eventManager } from '../../utils/features/events';
import { handleResponseData } from './handlers';
import { handleHttpErrorResponse, handleNetworkError } from './errorHandlers';
import { tryRefreshTokenAndRetry } from './tokenRefresh';
import { internalError, internalLog } from '../../utils/common/internalLogger';

/**
 * 响应拦截器
 * @param response 响应对象
 * @returns 处理后的响应数据
 */
export async function responseInterceptor<T = unknown>(
  response: AxiosResponse<ApiResponse<T>>,
): Promise<T> {
  const { data, config } = response;

  // 移除取消Token（请求完成）
  cleanupCancelToken(config);

  // 隐藏 Loading（如果配置了 loading）
  hideLoadingIfEnabled(config);

  // 记录响应日志（根据配置决定是否启用）
  const requestConfig = (config || {}) as RequestConfig & typeof config;
  logResponse(response, requestConfig.logEnabled);

  // 计算请求耗时
  const startTime = (config as RequestConfig & { _startTime?: number })._startTime ?? Date.now();
  const duration = Date.now() - startTime;

  // 处理响应数据（await 处理，因为 handleResponseData 现在是异步的）
  const result = await handleResponseData(data, requestConfig);

  // 触发请求成功事件
  eventManager.emit('request:success', {
    config: requestConfig,
    response,
    timestamp: Date.now(),
    duration,
  });

  // 触发请求完成事件
  eventManager.emit('request:complete', {
    config: requestConfig,
    timestamp: Date.now(),
    duration,
    success: true,
  });

  return result;
}

/**
 * 响应错误拦截器
 * @param error 错误对象
 * @returns Promise.reject
 */
export async function responseErrorInterceptor(error: AxiosError<ErrorResponse>): Promise<never> {
  const config = error.config as RequestConfig | undefined;

  // 移除取消Token
  cleanupCancelToken(config);

  // 隐藏 Loading（如果配置了 loading）
  hideLoadingIfEnabled(config);

  // 请求被取消
  if (error.code === 'ERR_CANCELED' || axios.isCancel(error)) {
    internalLog('请求已取消:', error.message);
    return Promise.reject(error);
  }

  // 记录错误日志（根据配置决定是否启用）
  logError(error, config?.logEnabled);

  // 类型断言：确保 error 是 AxiosError 类型
  const axiosError = error as AxiosError<ErrorResponse>;

  // 计算请求耗时
  const startTime =
    (axiosError.config as RequestConfig & { _startTime?: number })?._startTime ?? Date.now();
  const duration = Date.now() - startTime;

  // HTTP错误处理
  if (axiosError.response) {
    const status = axiosError.response.status;
    const errorData = axiosError.response.data;

    // 处理 401 未授权错误 - Token 刷新
    if (status === HttpStatus.UNAUTHORIZED && config && !config.skipTokenRefresh) {
      const retryResponse = await tryRefreshTokenAndRetry(
        config as RequestConfig & InternalAxiosRequestConfig,
      ).catch(retryError => {
        // 如果重试失败，返回 null，继续走正常错误处理流程
        internalError('Token 刷新后重试请求失败:', retryError);
        return null;
      });

      if (retryResponse) {
        // 重试成功，需要经过响应拦截器处理，然后返回处理后的数据
        // 在 Axios 的错误拦截器中，返回一个值会被视为成功响应
        const processedData = await responseInterceptor(retryResponse);
        // 返回处理后的数据，Axios 会将其视为成功响应
        // 注意：在 Axios 的错误拦截器中，直接返回一个值会被视为成功响应
        // 类型转换原因：responseInterceptor 返回 Promise<T>，但错误拦截器需要返回 Promise<never>
        // 这是 Axios 的类型系统限制，实际运行时返回的值会被视为成功响应
        return processedData as unknown as Promise<never>;
      }
    }

    // 构造错误响应
    const errorResponse: ErrorResponse = {
      code: errorData?.code || status,
      message: errorData?.message || getErrorMessage(axiosError),
      details: errorData?.details,
      path: axiosError.config?.url,
      timestamp: Date.now(),
    };

    // 处理HTTP状态码错误
    await handleHttpErrorResponse(axiosError, errorResponse, config, status);
    const enhancedError = enhanceError(axiosError, errorResponse, config);

    // 触发请求错误事件
    eventManager.emit('request:error', {
      config: config || {},
      error: enhancedError,
      errorResponse,
      timestamp: Date.now(),
      duration,
    });

    // 触发请求完成事件
    eventManager.emit('request:complete', {
      config: config || {},
      timestamp: Date.now(),
      duration,
      success: false,
    });

    return Promise.reject(enhancedError);
  }

  // 处理网络错误
  const enhancedNetworkError = await handleNetworkError(axiosError, config);

  // 触发请求错误事件
  eventManager.emit('request:error', {
    config: config || {},
    error: enhancedNetworkError,
    timestamp: Date.now(),
    duration,
  });

  // 触发请求完成事件
  eventManager.emit('request:complete', {
    config: config || {},
    timestamp: Date.now(),
    duration,
    success: false,
  });

  return Promise.reject(enhancedNetworkError);
}
