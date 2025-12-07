import type { AxiosHeaderValue, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export function getContentType(config: InternalAxiosRequestConfig) {
  const contentType: AxiosHeaderValue = config.headers?.['Content-Type'] || 'application/json';

  return contentType;
}

/**
 * check if http status is success
 *
 * @param status
 */
export function isHttpSuccess(status: number) {
  const isSuccessCode = status >= 200 && status < 300;
  // 401 也视为成功，因为业务错误（如 token 过期）应该由 isBackendSuccess 和 onBackendFail 处理
  // 真正的业务状态由响应体中的 code 字段决定，而不是 HTTP 状态码
  return isSuccessCode || status === 304 || status === 401;
}

/**
 * is response json
 *
 * @param response axios response
 */
export function isResponseJson(response: AxiosResponse) {
  const { responseType } = response.config;

  return responseType === 'json' || responseType === undefined;
}
