/**
 * 请求键生成器
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import { generateRequestKey as generateCoreRequestKey } from '@suga/request-core';
import { generateKey } from '@suga/utils';
import type { DedupeStrategy } from '../types';

/**
 * 键生成器选项
 */
export interface KeyGeneratorOptions {
  /** 去重策略 */
  strategy: DedupeStrategy;
  /** 忽略的参数名列表 */
  ignoreParams: string[];
  /** 自定义键生成函数 */
  customKeyGenerator?: (config: NormalizedRequestConfig) => string;
}

/**
 * 过滤掉需要忽略的参数
 */
function filterIgnoredParams(obj: unknown, ignoreParams: string[]): unknown {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // 如果参数名不在忽略列表中，保留该参数
    if (!ignoreParams.includes(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * 生成请求唯一标识（精确匹配）
 * 复用 request-core 的键生成函数，确保格式一致
 */
function generateExactKey(config: NormalizedRequestConfig): string {
  return generateCoreRequestKey(config);
}

/**
 * 生成请求唯一标识（忽略参数）
 * 如果配置了 ignoreParams，则只忽略指定的参数；否则忽略所有参数
 */
function generateIgnoreParamsKey(config: NormalizedRequestConfig, ignoreParams: string[]): string {
  const { url, method, params, data } = config;
  const methodUpper = (method || 'GET').toUpperCase();

  // 如果没有配置 ignoreParams，忽略所有参数
  if (ignoreParams.length === 0) {
    return `${methodUpper}_${url || ''}`;
  }

  // 过滤掉需要忽略的参数
  const filteredParams = filterIgnoredParams(params, ignoreParams);
  const filteredData = filterIgnoredParams(data, ignoreParams);

  // 使用过滤后的参数生成键
  return generateKey(methodUpper, url || '', filteredParams, filteredData);
}

/**
 * 生成请求唯一标识
 */
export function generateRequestKey(
  config: NormalizedRequestConfig,
  options: KeyGeneratorOptions,
): string {
  if (options.customKeyGenerator) {
    return options.customKeyGenerator(config);
  }

  if (options.strategy === 'ignore-params') {
    return generateIgnoreParamsKey(config, options.ignoreParams);
  }

  // 默认精确匹配
  return generateExactKey(config);
}

