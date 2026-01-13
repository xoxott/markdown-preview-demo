/**
 * 错误分类策略实现
 */

import type { ErrorClassificationStrategy } from '../types';
import {
  NETWORK_ERROR_CODES,
  NETWORK_ERROR_KEYWORDS,
  SERVER_ERROR_STATUS_MIN,
  SERVER_ERROR_STATUS_MAX,
} from '../constants';

/**
 * 检查是否为对象类型
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}


/**
 * 检查对象是否有 code 属性
 */
function hasCode(error: unknown): error is { code: string } {
  return isObject(error) && 'code' in error && typeof error.code === 'string';
}

/**
 * 检查对象是否有 message 属性
 */
function hasMessage(error: unknown): error is { message: string } {
  return isObject(error) && 'message' in error && typeof error.message === 'string';
}

/**
 * 检查对象是否有 response.status 属性
 */
function hasResponseStatus(error: unknown): error is {
  response: { status: number };
} {
  if (!isObject(error)) {
    return false;
  }

  const response = error.response;
  return (
    isObject(response) &&
    'status' in response &&
    typeof response.status === 'number'
  );
}


/**
 * 检查是否为服务器错误（5xx）
 */
function isServerError(error: unknown): boolean {
  if (!hasResponseStatus(error)) {
    return false;
  }

  const status = error.response.status;
  return status >= SERVER_ERROR_STATUS_MIN && status <= SERVER_ERROR_STATUS_MAX;
}

/**
 * 检查是否为网络错误代码
 */
function isNetworkErrorCode(error: unknown): boolean {
  if (!hasCode(error)) {
    return false;
  }

  return NETWORK_ERROR_CODES.includes(error.code);
}

/**
 * 检查错误消息中是否包含网络关键词
 */
function hasNetworkKeywords(error: unknown): boolean {
  if (!hasMessage(error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return NETWORK_ERROR_KEYWORDS.some((keyword) => message.includes(keyword));
}

/**
 * 默认错误分类策略：只统计明确的服务器错误和网络错误
 */
export class DefaultErrorClassificationStrategy implements ErrorClassificationStrategy {
  shouldCountAsFailure(error: unknown): boolean {
    // 检查是否为服务器错误（5xx）
    if (isServerError(error)) {
      return true;
    }

    // 检查网络错误代码
    if (isNetworkErrorCode(error)) {
      return true;
    }

    // 检查错误消息中的网络关键词
    if (hasNetworkKeywords(error)) {
      return true;
    }

    return false;
  }
}

