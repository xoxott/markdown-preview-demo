/**
 * 请求拦截器
 */

import type { InternalAxiosRequestConfig } from 'axios';
import { TOKEN_KEY, ContentType } from '../constants';
import { showLoadingIfEnabled, ensureHeaders } from './common';
import { getHttpMethod } from '../utils/common/helpers';
import { logRequest } from '../utils/features/logger';
import { storageManager } from '../utils/storage/storage';
import { eventManager } from '../utils/features/events';
import { internalError } from '../utils/common/internalLogger';
import type { RequestConfig } from '../types';

/**
 * 需要设置请求体的 HTTP 方法
 */
const METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH'] as const;

/**
 * 时间戳参数名（用于防止 GET 请求缓存）
 */
const TIMESTAMP_PARAM = '_t';

/**
 * 获取 Token（使用存储管理器获取）
 */
function getToken(): string | null {
  return storageManager.getItem(TOKEN_KEY);
}

/**
 * 检查是否为指定的 HTTP 方法
 */
function isMethod(config: InternalAxiosRequestConfig, methods: readonly string[]): boolean {
  return methods.includes(getHttpMethod(config));
}

/**
 * 请求拦截器
 * @param config 请求配置
 * @returns 处理后的请求配置
 */
export function requestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  // 1. 添加认证 Token
  addAuthToken(config);

  // 2. 设置默认 Content-Type
  setDefaultContentType(config);

  // 3. 添加请求时间戳（防止缓存）
  addTimestamp(config);

  // 4. 显示 Loading（如果配置了 loading）
  showLoadingIfEnabled(config);

  // 5. 记录请求日志（根据配置决定是否启用）
  const requestConfig = config as RequestConfig & typeof config;
  logRequest(config, requestConfig.logEnabled);

  // 6. 触发请求开始事件
  const startTime = Date.now();
  eventManager.emit('request:start', {
    config: requestConfig,
    timestamp: startTime,
  });

  // 将开始时间存储到配置中，供响应拦截器使用
  (config as RequestConfig & { _startTime?: number })._startTime = startTime;

  return config;
}

/**
 * 添加认证 Token
 * @param config 请求配置
 */
function addAuthToken(config: InternalAxiosRequestConfig): void {
  const token = getToken();
  if (!token) {
    return;
  }

  const headers = ensureHeaders(config);
  headers.Authorization = `Bearer ${token}`;
}

/**
 * 设置默认 Content-Type
 * @param config 请求配置
 */
function setDefaultContentType(config: InternalAxiosRequestConfig): void {
  if (!isMethod(config, METHODS_WITH_BODY)) {
    return;
  }

  const headers = ensureHeaders(config);

  // 检查是否已设置 Content-Type（支持不同的大小写）
  const contentType = headers['Content-Type'] || headers['content-type'];
  if (contentType) {
    return;
  }

  // 如果是 FormData，不设置 Content-Type，让浏览器自动设置（包含 boundary）
  if (config.data instanceof FormData) {
    return;
  }

  headers['Content-Type'] = ContentType.JSON;
}

/**
 * 添加时间戳（防止 GET 请求缓存）
 * @param config 请求配置
 */
function addTimestamp(config: InternalAxiosRequestConfig): void {
  // 只有 GET 请求才需要添加时间戳
  if (getHttpMethod(config) !== 'GET') {
    return;
  }

  // 如果启用了缓存，不添加时间戳
  const requestConfig = config as RequestConfig & typeof config;
  // 如果 cache 为 true 或策略对象，说明启用了缓存，不添加时间戳
  if (requestConfig.cache === true || (typeof requestConfig.cache === 'object' && requestConfig.cache !== null)) {
    return;
  }

  // 确保 params 存在且为对象
  if (!config.params || typeof config.params !== 'object') {
    return;
  }

  // 添加时间戳参数
  (config.params as Record<string, unknown>)[TIMESTAMP_PARAM] = Date.now();
}

/**
 * 请求错误拦截器
 * @param error 错误对象
 * @returns Promise.reject
 */
export function requestErrorInterceptor(error: unknown): Promise<never> {
  internalError('请求拦截器错误:', error);
  return Promise.reject(error);
}
