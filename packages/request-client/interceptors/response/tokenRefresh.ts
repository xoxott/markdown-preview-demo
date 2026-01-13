/**
 * Token 刷新逻辑
 */

import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { RequestConfig } from '../../types';
import { tokenRefreshManager } from '../../utils/storage/tokenRefresh';
import { ensureHeaders } from '../common';
import { requestInterceptor } from '../request';
import { internalError } from '../../utils/common/internalLogger';

/**
 * 尝试刷新 Token 并重试请求
 */
export async function tryRefreshTokenAndRetry(
  config: RequestConfig & InternalAxiosRequestConfig,
): Promise<AxiosResponse | null> {
  try {
    const newToken = await tokenRefreshManager.refreshToken();
    if (!newToken) {
      return null;
    }

    // 更新请求配置中的 token
    const headers = ensureHeaders(config);
    headers.Authorization = `Bearer ${newToken}`;

    // 如果重试还是 401，应该走正常错误处理流程，而不是再次尝试刷新
    const retryConfig: RequestConfig = {
      ...config,
      skipTokenRefresh: true,
    };

    // 创建一个新的 axios 实例，不经过拦截器，直接返回 AxiosResponse
    // 这样 responseErrorInterceptor 可以正确处理返回值
    const retryAxios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: config.headers,
    });

    // 手动调用请求拦截器（添加 token 等）
    const processedConfig = requestInterceptor(retryConfig as InternalAxiosRequestConfig);

    // 执行请求，不经过拦截器链，直接返回 AxiosResponse
    const response = await retryAxios.request(processedConfig);

    // 确保响应对象的 config 包含必要的配置信息，以便 responseInterceptor 正确处理
    if (response.config) {
      // 将 RequestConfig 的属性合并到 response.config 中
      Object.assign(response.config, retryConfig);
    }

    return response;
  } catch (refreshError) {
    internalError('Token 刷新失败:', refreshError);
    return null;
  }
}
