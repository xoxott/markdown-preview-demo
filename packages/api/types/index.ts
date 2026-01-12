/**
 * API类型定义导出
 */
export * from './response';

// 注意：BusinessErrorCode 已移至 constants/index.ts

/**
 * 请求配置扩展
 */
import type { AxiosRequestConfig, AxiosProgressEvent, AxiosError } from 'axios';
import type { ErrorResponse } from './response';

/**
 * 请求配置接口
 * 扩展了 AxiosRequestConfig，添加了自定义功能配置
 */
export interface RequestConfig extends AxiosRequestConfig {
  /**
   * 是否显示加载提示
   * @default true - 默认显示 Loading
   */
  loading?: boolean;

  /**
   * 是否显示错误提示
   * @default true - 默认显示错误提示
   */
  showError?: boolean;

  /**
   * 是否启用自动重试
   * @default false - 默认不重试
   */
  retry?: boolean;

  /**
   * 重试次数
   * @default 3 - 仅在 retry 为 true 时有效
   */
  retryCount?: number;

  /**
   * 超时时是否重试
   * @default false - 默认超时不重试
   * @description 仅在 retry 为 true 时有效，如果设置为 true，超时错误也会触发重试
   */
  retryOnTimeout?: boolean;

  /**
   * 熔断器配置
   * @description 用于在服务异常时自动降级或熔断请求
   */
  circuitBreaker?: import('../utils/request/circuitBreaker').CircuitBreakerOptions;

  /**
   * 是否可取消请求
   * @default true - 默认可取消
   */
  cancelable?: boolean;

  /**
   * 请求唯一标识，用于取消请求
   * 如果不提供，会根据 URL + method + params 自动生成
   */
  requestId?: string;

  /**
   * 是否跳过错误处理
   * @default false - 默认执行错误处理
   */
  skipErrorHandler?: boolean;

  /**
   * 是否跳过 Token 刷新
   * @default false - 遇到 401 时会自动刷新 Token
   */
  skipTokenRefresh?: boolean;

  /**
   * 是否启用请求去重
   * @default true - 相同请求在时间窗口内只发送一次
   */
  dedupe?: boolean;

  /**
   * 上传进度回调函数
   * @param progressEvent - Axios 进度事件对象
   */
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;

  /**
   * 下载进度回调函数
   * @param progressEvent - Axios 进度事件对象
   */
  onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;

  /**
   * 单次请求的自定义错误处理函数
   * @param error - Axios 错误对象
   * @param errorResponse - 错误响应对象
   * @returns 返回 true 表示已处理，不再执行默认错误处理；返回 false/undefined 会继续执行默认处理
   */
  onError?: (
    error: AxiosError<ErrorResponse>,
    errorResponse: ErrorResponse,
  ) => boolean | void | Promise<boolean | void>;

  /**
   * 是否使用缓存
   * @default false - 默认不使用缓存
   * @description 仅对 GET 请求有效，其他请求方法会被忽略
   */
  cache?: boolean;

  /**
   * 缓存过期时间（毫秒）
   * @description 仅在 cache 为 true 时有效，如果不设置则使用默认值（5分钟）
   */
  cacheExpireTime?: number;

  /**
   * 是否启用日志记录
   * @default undefined - 默认使用全局日志配置（开发环境启用，生产环境禁用）
   * @description 如果设置为 true/false，会覆盖全局日志配置
   */
  logEnabled?: boolean;

  /**
   * 请求优先级（用于队列管理）
   * @default 'normal' - 默认优先级
   * @description 仅在启用请求队列时有效
   */
  priority?: 'high' | 'normal' | 'low';

  /** 请求方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

  /** 请求URL */
  url?: string;

  /** 请求参数（用于 GET 请求的查询参数） */
  params?: unknown;

  /** 请求数据（用于 POST/PUT/PATCH 请求的请求体） */
  data?: unknown;
}

/**
 * 请求方法类型
 */
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
