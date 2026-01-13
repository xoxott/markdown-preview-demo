/**
 * 配置适配器
 * 在业务层配置（RequestConfig）和核心层配置（NormalizedRequestConfig + meta）之间转换
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import type { RequestConfig } from '../../types';

/**
 * 将业务层配置转换为标准化配置和元数据
 */
export function adaptRequestConfigToCore(
  config: RequestConfig,
): {
  normalized: NormalizedRequestConfig;
  meta: Record<string, unknown>;
} {
  const {
    url,
    method,
    baseURL,
    timeout,
    headers,
    params,
    data,
    responseType,
    signal,
    onUploadProgress,
    onDownloadProgress,
    // 提取业务配置到 meta
    loading,
    showError,
    retry,
    retryCount,
    retryOnTimeout,
    cancelable,
    requestId,
    skipErrorHandler,
    skipTokenRefresh,
    dedupe,
    cache,
    cacheExpireTime,
    onError,
    logEnabled,
    priority,
    circuitBreaker,
    ...rest
  } = config;

  // 标准化配置（只包含传输层需要的字段）
  const normalized: NormalizedRequestConfig = {
    url: url || '',
    method: (method || 'GET').toUpperCase(),
    baseURL,
    timeout,
    headers: headers as Record<string, string> | undefined,
    params,
    data,
    responseType: responseType as string | undefined,
    signal: signal as AbortSignal | undefined,
    onUploadProgress: onUploadProgress as ((progressEvent: unknown) => void) | undefined,
    onDownloadProgress: onDownloadProgress as ((progressEvent: unknown) => void) | undefined,
  };

  // 业务配置放入 meta
  const meta: Record<string, unknown> = {
    loading,
    showError,
    retry,
    retryCount,
    retryOnTimeout,
    cancelable,
    requestId,
    skipErrorHandler,
    skipTokenRefresh,
    dedupe,
    cache,
    cacheExpireTime,
    onError,
    logEnabled,
    priority,
    circuitBreaker,
    ...rest, // 保留其他扩展字段
  };

  return { normalized, meta };
}

