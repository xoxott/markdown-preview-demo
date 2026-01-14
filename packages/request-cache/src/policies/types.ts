/**
 * 缓存策略类型定义
 */

import type { NormalizedRequestConfig } from '@suga/request-core';

/**
 * 缓存元数据接口
 * 定义缓存相关的元数据字段
 */
export interface CacheMeta {
  /**
   * 缓存配置
   * - `true`: 启用缓存（使用默认策略）
   * - `false`: 禁用缓存
   * - `CachePolicy`: 使用自定义策略
   * - `undefined`: 不指定，由策略决定
   */
  cache?: CacheConfig;

  /**
   * 缓存过期时间（毫秒）
   * 如果指定，将覆盖策略中的 TTL 设置
   */
  cacheExpireTime?: number;

  /**
   * 其他扩展字段
   * 允许策略实现添加自定义字段
   */
  [key: string]: unknown;
}

/**
 * 缓存策略接口
 * 定义缓存行为的决策逻辑
 */
export interface CachePolicy {
  /**
   * 判断是否应该从缓存读取
   * @param config 请求配置
   * @param meta 缓存元数据
   * @returns 是否应该读取缓存
   */
  shouldRead(config: NormalizedRequestConfig, meta?: CacheMeta): boolean;

  /**
   * 判断是否应该写入缓存
   * @param config 请求配置
   * @param data 响应数据
   * @param meta 缓存元数据
   * @returns 是否应该写入缓存
   */
  shouldWrite(config: NormalizedRequestConfig, data: unknown, meta?: CacheMeta): boolean;

  /**
   * 获取缓存 TTL（过期时间，毫秒）
   * @param config 请求配置
   * @param meta 缓存元数据
   * @returns TTL，返回 undefined 表示使用默认值
   */
  getTTL(config: NormalizedRequestConfig, meta?: CacheMeta): number | undefined;
}

/**
 * 缓存配置类型
 * 可以是 boolean、CachePolicy 对象或 undefined
 */
export type CacheConfig = boolean | CachePolicy | undefined;

