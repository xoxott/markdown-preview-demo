/**
 * 请求键生成工具
 * 提供统一的请求键生成函数，供其他包复用
 */

import type { NormalizedRequestConfig } from '../context/RequestContext';
import { generateKey } from '@suga/utils';

/**
 * 生成请求键（精确匹配）
 * 基于 method + url + params + data 生成唯一标识
 * 
 * 注意：此函数生成的键用于识别"相同的请求"（相同配置的请求）
 * 与 ctx.id 的用途相同，但格式统一，便于其他包复用
 * 
 * @param config 标准化请求配置
 * @returns 请求键
 */
export function generateRequestKey(config: NormalizedRequestConfig): string {
  const { url, method, params, data } = config;
  return generateKey(method || 'GET', url || '', params, data);
}

