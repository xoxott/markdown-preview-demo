/**
 * 日志工具
 */

import type { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getHttpMethod, isDevelopment } from '../common/helpers';
import type { RequestConfig } from '../../types';

/**
 * 日志配置
 */
export interface LoggerOptions {
  /** 是否启用日志（默认：开发环境启用，生产环境禁用） */
  enabled?: boolean;
  /** 是否记录请求日志 */
  logRequest?: boolean;
  /** 是否记录响应日志 */
  logResponse?: boolean;
  /** 是否记录错误日志 */
  logError?: boolean;
}

/**
 * 日志管理器
 */
class LoggerManager {
  private options: LoggerOptions;

  constructor() {
    this.options = {
      enabled: undefined, // 未设置时，根据环境自动判断
      logRequest: true,
      logResponse: true,
      logError: true,
    };
  }

  /**
   * 设置日志配置
   */
  setOptions(options: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 检查是否应该记录日志
   */
  shouldLog(override?: boolean): boolean {
    // 如果请求配置中明确指定，优先使用
    if (override !== undefined) {
      return override;
    }

    // 如果全局配置中明确指定，使用全局配置
    if (this.options.enabled !== undefined) {
      return this.options.enabled;
    }

    // 默认：开发环境启用，生产环境禁用
    return isDevelopment();
  }

  /**
   * 检查是否应该记录请求日志
   */
  shouldLogRequest(override?: boolean): boolean {
    return this.shouldLog(override) && this.options.logRequest !== false;
  }

  /**
   * 检查是否应该记录响应日志
   */
  shouldLogResponse(override?: boolean): boolean {
    return this.shouldLog(override) && this.options.logResponse !== false;
  }

  /**
   * 检查是否应该记录错误日志
   */
  shouldLogError(override?: boolean): boolean {
    return this.shouldLog(override) && this.options.logError !== false;
  }
}

// 创建全局日志管理器实例
export const loggerManager = new LoggerManager();

/**
 * 记录请求日志
 * @param config 请求配置
 * @param enabled 是否启用（可选，默认使用全局配置）
 */
export function logRequest(
  config: InternalAxiosRequestConfig | RequestConfig,
  enabled?: boolean,
): void {
  if (!loggerManager.shouldLogRequest(enabled)) {
    return;
  }

  const internalConfig = config as InternalAxiosRequestConfig;
  const method = getHttpMethod(internalConfig);
  const { url, params, data } = internalConfig;

  console.group(`🚀 [${method}] ${url}`);
  if (params) {
    console.log('📤 Params:', params);
  }
  if (data) {
    console.log('📤 Data:', data);
  }
  console.log('📋 Config:', {
    timeout: internalConfig.timeout,
    headers: internalConfig.headers,
  });
  console.groupEnd();
}

/**
 * 记录响应日志
 * @param response 响应对象
 * @param enabled 是否启用（可选，默认使用全局配置）
 */
export function logResponse(response: AxiosResponse, enabled?: boolean): void {
  if (!loggerManager.shouldLogResponse(enabled)) {
    return;
  }

  const { config, data, status } = response;
  const method = getHttpMethod(config);
  const { url } = config;

  console.group(`✅ [${method}] ${url} - ${status}`);
  console.log('📥 Response:', data);
  console.log('⏱️  Time:', `${Date.now()}ms`);
  console.groupEnd();
}

/**
 * 记录错误日志
 * @param error 错误对象
 * @param enabled 是否启用（可选，默认使用全局配置）
 */
export function logError(error: AxiosError, enabled?: boolean): void {
  if (!loggerManager.shouldLogError(enabled)) {
    return;
  }

  const { config, response, message } = error;
  const method = getHttpMethod(config);
  const url = config?.url || 'UNKNOWN';

  console.group(`❌ [${method}] ${url}`);
  if (response) {
    console.error('📥 Error Response:', response.data);
    console.error('📊 Status:', response.status);
  } else {
    console.error('📥 Error Message:', message);
  }
  console.error('📋 Config:', config);
  console.groupEnd();
}

/**
 * 配置日志选项
 */
export function configureLogger(options: Partial<LoggerOptions>): void {
  loggerManager.setOptions(options);
}
