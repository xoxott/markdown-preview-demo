import type { AxiosRequestConfig } from 'axios';
import type { NormalizedRequestConfig } from '@suga/request-core';

/** 将 AxiosHeaders / 普通对象转为步骤链使用的扁平 headers */
function flattenHeaders(
  headers: AxiosRequestConfig['headers']
): Record<string, string> | undefined {
  if (headers === undefined || headers === null) return undefined;
  if (typeof headers !== 'object' || Array.isArray(headers)) return undefined;

  const out: Record<string, string> = {};
  const h = headers as Record<string, unknown> & { toJSON?: () => Record<string, unknown> };
  const source = typeof h.toJSON === 'function' ? h.toJSON() : (headers as Record<string, unknown>);

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;
    out[key] = Array.isArray(value) ? value.join(', ') : String(value);
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/** 将 Axios 请求配置转为 @suga/request-core 的 NormalizedRequestConfig（含 index 签名透传其余字段）。 */
export function axiosRequestConfigToNormalized(
  config: AxiosRequestConfig
): NormalizedRequestConfig {
  const method = (config.method || 'get').toString().toUpperCase();
  const url = String(config.url ?? '');
  const headers = flattenHeaders(config.headers);

  return {
    ...(config as unknown as NormalizedRequestConfig),
    url,
    method,
    headers: headers ?? (config.headers as NormalizedRequestConfig['headers']),
    params: config.params,
    data: config.data,
    signal: config.signal as AbortSignal | undefined,
    responseType: config.responseType as string | undefined,
    timeout: config.timeout,
    baseURL: config.baseURL,
    onUploadProgress: config.onUploadProgress as ((progressEvent: unknown) => void) | undefined,
    onDownloadProgress: config.onDownloadProgress as ((progressEvent: unknown) => void) | undefined
  };
}
