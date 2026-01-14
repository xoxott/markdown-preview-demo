/**
 * 配置适配器
 * 在业务层配置（RequestConfig）和核心层配置（NormalizedRequestConfig + meta）之间转换
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import type { RequestConfig } from '../types';

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
    cancelToken,
    onUploadProgress,
    onDownloadProgress,
    // 提取功能配置到 meta（这些是通用功能，不是业务逻辑）
    retry,
    retryCount,
    retryOnTimeout,
    cancelable,
    requestId,
    dedupe,
    cache,
    cacheExpireTime,
    logEnabled,
    priority,
    circuitBreaker,
    queue,
    logger,
    ...rest
  } = config;

  // 标准化配置（只包含传输层需要的字段）
  // 注意：cancelToken 是 Axios 特有的字段，需要传递到 AxiosTransport
  const normalized: NormalizedRequestConfig & { cancelToken?: unknown } = {
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
    // 传递 cancelToken 到 Axios（Axios 使用 cancelToken，不是 signal）
    cancelToken: cancelToken as unknown,
  };

  // 功能配置放入 meta（这些是通用功能配置，不是业务逻辑）
  const meta: Record<string, unknown> = {
    retry,
    retryCount,
    retryOnTimeout,
    cancelable,
    requestId,
    dedupe,
    cache,
    cacheExpireTime,
    logEnabled,
    priority,
    circuitBreaker,
    queue,
    logger,
    ...rest, // 保留其他扩展字段
  };

  return { normalized, meta };
}

