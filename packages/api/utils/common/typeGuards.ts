/**
 * 类型守卫和类型断言工具函数
 * 提供类型安全的类型检查和转换
 */

import type { AxiosError } from 'axios';
import type { RequestConfig } from '../../types';

/**
 * 检查是否为有效的请求配置对象
 */
export function isRequestConfig(value: unknown): value is RequestConfig {
  return value !== null && typeof value === 'object';
}

/**
 * 检查是否为 AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as { isAxiosError?: boolean }).isAxiosError === true
  );
}

/**
 * 检查是否为包含 code 属性的错误对象
 */
export function hasErrorCode(error: unknown): error is { code: number | string; message?: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (typeof (error as { code?: unknown }).code === 'number' ||
      typeof (error as { code?: unknown }).code === 'string')
  );
}

/**
 * 安全地断言为 RequestConfig 类型
 */
export function assertRequestConfig(value: unknown): RequestConfig {
  if (!isRequestConfig(value)) {
    throw new TypeError('Invalid request config: expected an object');
  }
  return value;
}
