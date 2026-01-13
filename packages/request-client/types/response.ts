/**
 * API 响应类型定义
 */

/**
 * 标准 API 响应格式
 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** 是否成功（可选） */
  success?: boolean;
  /** 时间戳（可选） */
  timestamp?: number;
}

/**
 * 分页数据
 */
export interface PageData<T = unknown> {
  /** 数据列表 */
  list: T[];
  /** 总条数 */
  total: number;
  /** 当前页码 */
  current: number;
  /** 每页条数 */
  size: number;
  /** 总页数（可选） */
  pages?: number;
}

/**
 * 分页响应
 */
export interface PageResponse<T = unknown> {
  /** 业务状态码 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 分页数据 */
  data: PageData<T>;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  /** 错误码 */
  code: string | number;
  /** 错误消息 */
  message: string;
  /** 错误数据（可选） */
  data?: unknown;
  /** 错误详情（可选） */
  details?: unknown;
  /** 请求路径（可选） */
  path?: string;
  /** 时间戳 */
  timestamp: number;
}

