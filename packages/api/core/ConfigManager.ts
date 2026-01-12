/**
 * 配置管理模块
 * 负责配置的合并、提取和准备
 */

import type { AxiosRequestConfig } from 'axios';
import type { RequestConfig } from '../types';
import { generateRequestId } from '../utils/request/cancel';
import { cancelTokenManager } from '../utils/request/cancel';

/**
 * 配置管理器
 */
export class ConfigManager {
  /**
   * 深度合并对象
   * @param target 目标对象
   * @param source 源对象
   * @returns 合并后的对象
   */
  static deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const output = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = this.deepMerge(
          (target[key] || {}) as Record<string, unknown>,
          source[key] as Record<string, unknown>,
        ) as T[Extract<keyof T, string>];
      } else if (source[key] !== undefined) {
        output[key] = source[key] as T[Extract<keyof T, string>];
      }
    }

    return output;
  }

  /**
   * 合并配置（深度合并，支持数组和对象）
   * @param defaultConfig 默认配置
   * @param requestConfig 请求配置
   * @returns 合并后的配置
   */
  static mergeConfig(
    defaultConfig: Partial<RequestConfig>,
    requestConfig: RequestConfig,
  ): RequestConfig {
    return this.deepMerge(defaultConfig, requestConfig);
  }

  /**
   * 提取 axios 配置（排除自定义配置项）
   * @param config 请求配置
   * @returns axios 配置对象
   */
  static extractAxiosConfig(config: RequestConfig): AxiosRequestConfig {
    const axiosConfig: Partial<AxiosRequestConfig> = {};
    // 自定义配置项列表（这些不应该传递给 axios）
    const customConfigKeys: ReadonlyArray<keyof RequestConfig> = [
      'loading',
      'showError',
      'retry',
      'retryCount',
      'retryOnTimeout',
      'cancelable',
      'requestId',
      'skipErrorHandler',
      'skipTokenRefresh',
      'dedupe',
      'cache',
      'cacheExpireTime',
      'onError',
      'logEnabled',
      'priority',
      'circuitBreaker',
      // 注意：onUploadProgress 和 onDownloadProgress 应该传递给 axios，不在自定义配置列表中
    ] as const;
    const customConfigSet = new Set(customConfigKeys);

    // 只复制非自定义配置项到 axios 配置
    // 使用类型安全的键列表，确保只复制 AxiosRequestConfig 支持的属性
    const axiosConfigKeys: (keyof AxiosRequestConfig)[] = [
      'url',
      'method',
      'baseURL',
      'timeout',
      'headers',
      'params',
      'data',
      'responseType',
      'responseEncoding',
      'validateStatus',
      'auth',
      'withCredentials',
      'adapter',
      'transformRequest',
      'transformResponse',
      'cancelToken',
      'signal',
      'xsrfCookieName',
      'xsrfHeaderName',
      'onUploadProgress',
      'onDownloadProgress',
      'maxContentLength',
      'maxBodyLength',
      'maxRedirects',
      'socketPath',
      'httpAgent',
      'httpsAgent',
      'proxy',
      'decompress',
      'transitional',
      'env',
      'paramsSerializer',
    ];

    // 遍历 AxiosRequestConfig 支持的键，从 config 中提取
    for (const key of axiosConfigKeys) {
      if (key in config && !customConfigSet.has(key as keyof RequestConfig)) {
        const value = config[key as keyof RequestConfig];
        if (value !== undefined) {
          // 类型安全：key 是 AxiosRequestConfig 的键，value 的类型匹配
          (axiosConfig as Record<string, unknown>)[key] = value as AxiosRequestConfig[typeof key];
        }
      }
    }

    return axiosConfig as AxiosRequestConfig;
  }

  /**
   * 准备请求配置
   * @param config 请求配置
   * @param getTimeout 获取超时时间的函数
   * @returns 处理后的配置
   */
  static prepareConfig(
    config: RequestConfig,
    getTimeout: (config: RequestConfig) => number,
  ): AxiosRequestConfig {
    // 提取 axios 配置
    const axiosConfig = this.extractAxiosConfig(config);

    // 应用超时策略（如果配置中没有指定 timeout）
    if (config.timeout === undefined) {
      axiosConfig.timeout = getTimeout(config);
    }

    // 处理请求取消
    if (config.cancelable !== false) {
      const requestId =
        config.requestId ||
        generateRequestId(
          axiosConfig.url || '',
          axiosConfig.method || 'GET',
          axiosConfig.params || axiosConfig.data,
        );
      const cancelToken = cancelTokenManager.createCancelToken(requestId);
      axiosConfig.cancelToken = cancelToken.token;
      // requestId 需要存储到配置中供取消功能使用
      // 类型扩展：AxiosRequestConfig 不包含 requestId，但我们需要它
      (axiosConfig as AxiosRequestConfig & { requestId?: string }).requestId = requestId;
    }

    return axiosConfig;
  }
}
