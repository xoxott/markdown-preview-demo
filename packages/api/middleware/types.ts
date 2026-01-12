/**
 * 中间件系统类型定义
 */

import type { RequestConfig } from '../types';
import type { AxiosResponse } from 'axios';

/**
 * 中间件函数类型
 */
export type Middleware = (
  config: RequestConfig,
  next: () => Promise<AxiosResponse>,
) => Promise<AxiosResponse>;

/**
 * 中间件管理器接口
 */
export interface MiddlewareManager {
  /** 添加中间件 */
  use(middleware: Middleware): void;
  /** 移除中间件 */
  remove(middleware: Middleware): void;
  /** 清除所有中间件 */
  clear(): void;
  /** 执行中间件链 */
  execute(config: RequestConfig, requestFn: () => Promise<AxiosResponse>): Promise<AxiosResponse>;
}
