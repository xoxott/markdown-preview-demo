/**
 * 拦截器公共工具函数
 */

import type { InternalAxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import type { RequestConfig } from '../types';
import { hideLoading, showLoading } from '../utils/features/loading';
import { cancelTokenManager } from '../utils/request/cancel';

/**
 * 显示 Loading（如果配置允许）
 * @param config 请求配置，默认为 true，只有明确设置为 false 时才不显示
 */
export function showLoadingIfEnabled(config?: InternalAxiosRequestConfig | RequestConfig): void {
  const requestConfig = config as RequestConfig | undefined;
  if (requestConfig?.loading !== false) {
    showLoading();
  }
}

/**
 * 隐藏 Loading（如果配置允许）
 * @param config 请求配置，默认为 true，只有明确设置为 false 时才不隐藏
 */
export function hideLoadingIfEnabled(config?: InternalAxiosRequestConfig | RequestConfig): void {
  const requestConfig = config as RequestConfig | undefined;
  if (requestConfig?.loading !== false) {
    hideLoading();
  }
}

/**
 * 清理请求取消 Token
 */
export function cleanupCancelToken(config?: InternalAxiosRequestConfig | RequestConfig): void {
  const requestConfig = config as RequestConfig | undefined;
  if (requestConfig?.requestId) {
    cancelTokenManager.remove(requestConfig.requestId);
  }
}

/**
 * 确保 headers 对象存在
 * @param config 请求配置
 * @returns 返回 headers 对象（确保不为 undefined）
 */
export function ensureHeaders(config: InternalAxiosRequestConfig): AxiosRequestHeaders {
  if (!config.headers) {
    config.headers = {} as AxiosRequestHeaders;
  }
  return config.headers;
}
