/**
 * 辅助工具函数
 */

import type { InternalAxiosRequestConfig } from 'axios';

/**
 * 获取 HTTP 方法
 * @param config 请求配置
 * @returns HTTP 方法（大写）
 */
export function getHttpMethod(config: InternalAxiosRequestConfig): string {
  return (config.method || 'GET').toUpperCase();
}

