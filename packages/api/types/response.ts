/**
 * API响应类型定义
 */

/**
 * 统一API响应格式
 * @template T - 响应数据的类型
 */
export interface ApiResponse<T = unknown> {
  /** 响应码，0 表示成功，其他值表示失败 */
  code: number;

  /** 响应消息，成功或失败的消息提示 */
  message: string;

  /** 响应数据，具体类型由泛型 T 指定 */
  data: T;

  /**
   * 是否成功
   * @optional
   */
  success?: boolean;

  /**
   * 时间戳
   * @optional
   */
  timestamp?: number;
}

/**
 * 分页响应数据
 * @template T - 列表项的数据类型
 */
export interface PageData<T = unknown> {
  /** 数据列表 */
  list: T[];

  /** 总记录数 */
  total: number;

  /** 当前页码（从 1 开始） */
  current: number;

  /** 每页大小 */
  size: number;

  /**
   * 总页数
   * @optional - 可以由 current、size、total 计算得出
   */
  pages?: number;
}

/**
 * 分页API响应
 * @template T - 列表项的数据类型
 */
export type PageResponse<T = unknown> = ApiResponse<PageData<T>>;

/**
 * 错误响应接口
 */
export interface ErrorResponse {
  /** 错误码，HTTP 状态码或业务错误码 */
  code: number;

  /** 错误消息，用于展示给用户 */
  message: string;

  /**
   * 错误详情
   * @optional - 用于调试或详细错误信息
   */
  details?: unknown;

  /**
   * 请求路径
   * @optional - 发生错误的请求路径
   */
  path?: string;

  /**
   * 时间戳
   * @optional - 错误发生的时间戳
   */
  timestamp?: number;
}
