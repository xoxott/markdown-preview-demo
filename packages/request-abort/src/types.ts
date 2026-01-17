/**
 * 请求中止类型定义
 */

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
 * AbortController 管理器选项
 */
export interface AbortControllerManagerOptions {
  /** 是否在创建新 controller 时自动取消旧请求，默认 true */
  autoCancelPrevious?: boolean;
  /** 默认取消消息 */
  defaultCancelMessage?: string;
}

/**
 * 中止配置选项
 */
export interface CancelOptions {
  /** 是否启用取消功能，默认 true */
  enabled?: boolean;
  /** 是否在创建新 controller 时自动取消旧请求，默认 true */
  autoCancelPrevious?: boolean;
}

/**
 * 中止元数据接口
 * 定义中止相关的元数据字段
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
   * AbortController（由 CancelStep 设置，用于外部取消）
   * @internal
   */
  _abortController?: AbortController;

  /**
   * AbortSignal（由 CancelStep 设置，或业务层直接传入）
   * 统一使用此字段传递 signal，最终传给请求
   */
  signal?: AbortSignal;

  /**
   * 取消消息（用于存储取消原因，AbortController 不支持自定义消息）
   * @internal
   */
  _cancelMessage?: string;

  /**
   * 其他扩展字段
   */
  [key: string]: unknown;
}

