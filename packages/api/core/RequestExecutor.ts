/**
 * 请求执行模块
 * 负责实际的HTTP请求执行逻辑
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { RequestConfig, ApiResponse } from '../types';
import type { RequestAdapter } from '../adapters/types';
import type { MiddlewareManagerImpl } from '../middleware/MiddlewareManager';
import type { RequestQueueManager, RequestPriority } from '../utils/request/requestQueue';
import { retryRequest } from '../utils/request/retry';
import { responseInterceptor } from '../interceptors/response/index';
import { circuitBreakerManager } from '../utils/request/circuitBreaker';

/**
 * 请求执行器
 */
export class RequestExecutor {
  constructor(
    private adapter: RequestAdapter,
    private middlewareManager: MiddlewareManagerImpl,
    private queueManager: RequestQueueManager | null,
  ) {}

  /**
   * 执行实际的 HTTP 请求
   * @param requestConfig axios 配置
   * @param config 请求配置
   * @returns Promise
   */
  async execute<T>(requestConfig: AxiosRequestConfig, config: RequestConfig): Promise<T> {
    // 创建基础请求执行函数
    const executeRequest = this.createExecuteRequest<T>(requestConfig, config);

    // 执行中间件链
    const executeWithMiddleware = async (): Promise<AxiosResponse<ApiResponse<T>>> => {
      return this.middlewareManager.execute(config, executeRequest);
    };

    // 包装执行函数（用于熔断器和重试）
    const wrappedExecute = async (): Promise<T> => {
      const response = await executeWithMiddleware();
      return this.extractResponseData<T>(response);
    };

    // 如果配置了熔断器，使用熔断器包装
    if (config.circuitBreaker) {
      const breakerExecute = this.wrapWithCircuitBreaker<T>(config, wrappedExecute);
      return this.executeWithQueueAndRetry<T>(config, requestConfig, breakerExecute);
    }

    // 执行请求（带队列和重试）
    return this.executeWithQueueAndRetry<T>(config, requestConfig, wrappedExecute);
  }

  /**
   * 创建请求执行函数
   * @param requestConfig axios 配置
   * @param config 请求配置
   * @returns 请求执行函数
   */
  private createExecuteRequest<T>(
    requestConfig: AxiosRequestConfig,
    config: RequestConfig,
  ): () => Promise<AxiosResponse<ApiResponse<T>>> {
    return async (): Promise<AxiosResponse<ApiResponse<T>>> => {
      // 使用适配器执行请求（适配器内部会调用 instance.request，会触发拦截器）
      const adapterResponse = await this.adapter.request<ApiResponse<T>>(config);
      // 转换为 Axios 响应格式（保持兼容性）
      // 注意：适配器已经通过 instance.request 执行，拦截器已经被调用
      // 但我们需要确保响应格式正确
      // 适配器调用 instance.request，会触发拦截器链
      // 响应拦截器会将 AxiosResponse<ApiResponse<T>> 转换为 T
      // 但适配器在拦截器之前获取响应，所以 adapterResponse.data 是 ApiResponse<T>
      const responseData = adapterResponse.data as ApiResponse<T>;

      // 构建 AxiosResponse 对象，供响应拦截器处理
      const axiosResponse = {
        data: responseData,
        status: adapterResponse.status,
        statusText: '',
        headers: adapterResponse.headers,
        config: requestConfig,
      } as AxiosResponse<ApiResponse<T>>;

      // 手动调用响应拦截器处理（因为适配器绕过了拦截器链）
      // 响应拦截器会提取 data.data 并返回 T
      const processedData = await responseInterceptor(axiosResponse);

      // 响应拦截器返回的是 T，但我们需要返回 AxiosResponse<ApiResponse<T>>
      // 重新包装为 AxiosResponse 格式（供中间件使用）
      return {
        ...axiosResponse,
        data: { code: 0, message: 'success', data: processedData } as ApiResponse<T>,
      } as AxiosResponse<ApiResponse<T>>;
    };
  }

  /**
   * 使用熔断器包装执行函数
   * @param config 请求配置
   * @param wrappedExecute 包装后的执行函数
   * @returns 熔断器包装后的执行函数
   */
  private wrapWithCircuitBreaker<T>(
    config: RequestConfig,
    wrappedExecute: () => Promise<T>,
  ): () => Promise<T> {
    const breakerKey = config.url || 'default';
    const breaker = circuitBreakerManager.getOrCreateBreaker(breakerKey, config.circuitBreaker!);
    return async (): Promise<T> => {
      // 移除不必要的 config 参数
      return breaker.execute(wrappedExecute);
    };
  }

  /**
   * 执行请求（带队列和重试）
   * @param config 请求配置
   * @param requestConfig axios 配置
   * @param executeFn 执行函数
   * @returns Promise
   */
  private async executeWithQueueAndRetry<T>(
    config: RequestConfig,
    requestConfig: AxiosRequestConfig,
    executeFn: () => Promise<T>,
  ): Promise<T> {
    // 如果启用了队列，通过队列执行
    if (this.queueManager) {
      const priority: RequestPriority = (config.priority as RequestPriority) || 'normal';
      const response = await this.queueManager.enqueue(
        config,
        async () => {
          const result = await executeFn();
          return this.wrapResponse<T>(result, requestConfig);
        },
        priority,
      );
      return this.extractResponseData<T>(response);
    }

    // 如果需要重试，包装执行函数
    if (config.retry) {
      return retryRequest(executeFn, config);
    }

    // 直接执行
    return executeFn();
  }

  /**
   * 包装响应数据为 AxiosResponse 格式
   * @param data 响应数据
   * @param requestConfig axios 配置
   * @returns AxiosResponse 格式的响应
   */
  private wrapResponse<T>(
    data: T,
    requestConfig: AxiosRequestConfig,
  ): AxiosResponse<ApiResponse<T>> {
    return {
      data: { code: 0, message: 'success', data } as ApiResponse<T>,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: requestConfig,
    } as AxiosResponse<ApiResponse<T>>;
  }

  /**
   * 从响应中提取数据
   * @param response 响应对象
   * @returns 提取的数据
   */
  private extractResponseData<T>(response: unknown): T {
    if (response && typeof response === 'object' && 'data' in response && 'status' in response) {
      const axiosResponse = response as AxiosResponse<ApiResponse<T>>;
      const responseData = axiosResponse.data;
      if (
        responseData &&
        typeof responseData === 'object' &&
        'code' in responseData &&
        'data' in responseData
      ) {
        return (responseData as ApiResponse<T>).data as T;
      }
      return responseData as T;
    }

    return response as T;
  }
}
