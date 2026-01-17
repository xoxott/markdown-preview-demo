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
    // 提取功能配置到 meta（这些是通用功能配置，不是业务逻辑）
    retry,
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
  // signal 是原生 Web API，可以直接放在 normalized 中
  // 如果传入了 signal，直接使用；如果传入了已废弃的 cancelToken，忽略（应该使用 signal）
  const normalized: NormalizedRequestConfig = {
    url: url || '',
    method: (method || 'GET').toUpperCase(),
    baseURL,
    timeout,
    headers: headers as Record<string, string> | undefined,
    params,
    data,
    responseType: responseType as string | undefined,
    signal: signal as AbortSignal | undefined, // 优先使用 signal
    onUploadProgress: onUploadProgress as ((progressEvent: unknown) => void) | undefined,
    onDownloadProgress: onDownloadProgress as ((progressEvent: unknown) => void) | undefined,
  };

  // 功能配置放入 meta（这些是通用功能配置，不是业务逻辑）
  // 如果业务层直接传入了 signal 且未启用 cancelable，将其放到 meta.signal 中
  // CancelStep 会优先使用自己创建的 signal
  const meta: Record<string, unknown> = {
    retry,
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
    // 如果业务层直接传入了 signal 且未启用 cancelable，将其放到 meta 中
    // 注意：如果同时存在 cancelable 和 signal，CancelStep 创建的 signal 会覆盖此值
    ...(signal && !cancelable ? { signal } : {}),
    ...rest, // 保留其他扩展字段
  };

  return { normalized, meta };
}

