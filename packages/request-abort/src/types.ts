/**
 * 请求中止类型定义
 */

/**
 * 请求配置接口（用于按条件中止）
 * 这是一个通用接口，实际使用时由调用方传入具体的配置类型
 */
export interface AbortableRequestConfig {
  url?: string;
  method?: string;
  [key: string]: unknown;
}

/**
 * AbortController 管理器选项
 */
export interface AbortControllerManagerOptions {
  /** 是否在创建新 controller 时自动中止旧请求，默认 true */
  autoAbortPrevious?: boolean;
  /** 默认中止消息 */
  defaultAbortMessage?: string;
}

/**
 * 中止配置选项
 */
export interface AbortOptions {
  /** 是否启用中止功能，默认 true */
  enabled?: boolean;
  /** 是否在创建新 controller 时自动中止旧请求，默认 true */
  autoAbortPrevious?: boolean;
}

/**
 * 中止元数据接口
 * 定义中止相关的元数据字段
 */
export interface AbortMeta {
  /**
   * 中止配置（与 RequestConfig.abortable 保持一致）
   * - `true`: 启用中止（使用默认配置）
   * - `false`: 禁用中止
   * - `AbortOptions`: 使用自定义配置
   * - `undefined`: 不指定，默认启用中止
   */
  abortable?: boolean | AbortOptions;

  /**
   * AbortController（由 AbortStep 设置，用于外部中止）
   * @internal
   */
  _abortController?: AbortController;

  /**
   * AbortSignal（由 AbortStep 设置，或业务层直接传入）
   * 统一使用此字段传递 signal，最终传给请求
   */
  signal?: AbortSignal;

  /**
   * 中止消息（用于存储中止原因，AbortController 不支持自定义消息）
   * @internal
   */
  _abortMessage?: string;

  /**
   * 其他扩展字段
   */
  [key: string]: unknown;
}

