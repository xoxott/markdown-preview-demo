/**
 * 请求取消类型定义
 */

import type { CancelTokenSource } from 'axios';

/**
 * 请求配置接口（用于按条件取消）
 * 这是一个通用接口，实际使用时由调用方传入具体的配置类型
 */
export interface CancelableRequestConfig {
  url?: string;
  method?: string;
  [key: string]: unknown;
}

/**
 * 取消Token管理器选项
 */
export interface CancelTokenManagerOptions {
  /** 是否在创建新token时自动取消旧请求，默认 true */
  autoCancelPrevious?: boolean;
  /** 默认取消消息 */
  defaultCancelMessage?: string;
}

/**
 * 取消配置选项
 */
export interface CancelOptions {
  /** 是否启用取消功能，默认 true */
  enabled?: boolean;
  /** 是否在创建新token时自动取消旧请求，默认 true */
  autoCancelPrevious?: boolean;
}

/**
 * 取消元数据接口
 * 定义取消相关的元数据字段
 */
export interface CancelMeta {
  /**
   * 取消配置（与 RequestConfig.cancelable 保持一致）
   * - `true`: 启用取消（使用默认配置）
   * - `false`: 禁用取消
   * - `CancelOptions`: 使用自定义配置
   * - `undefined`: 不指定，默认启用取消
   */
  cancelable?: boolean | CancelOptions;

  /**
   * 内部字段：取消Token源（由 CancelStep 设置）
   * @internal
   */
  _cancelTokenSource?: CancelTokenSource;

  /**
   * 内部字段：取消Token（由 CancelStep 设置）
   * @internal
   */
  _cancelToken?: CancelTokenSource['token'];

  /**
   * 其他扩展字段
   */
  [key: string]: unknown;
}

