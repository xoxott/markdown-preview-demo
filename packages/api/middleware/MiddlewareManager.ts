/**
 * 中间件管理器
 * 实现请求中间件系统，支持灵活的处理流程
 */

import type { RequestConfig } from '../types';
import type { AxiosResponse } from 'axios';
import type { Middleware, MiddlewareManager } from './types';

/**
 * 中间件管理器实现
 */
class MiddlewareManagerImpl implements MiddlewareManager {
  private middlewares: Middleware[] = [];

  /**
   * 添加中间件
   * @param middleware 中间件函数
   */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * 移除中间件
   * @param middleware 中间件函数
   */
  remove(middleware: Middleware): void {
    const index = this.middlewares.indexOf(middleware);
    if (index > -1) {
      this.middlewares.splice(index, 1);
    }
  }

  /**
   * 清除所有中间件
   */
  clear(): void {
    this.middlewares = [];
  }

  /**
   * 执行中间件链
   * @param config 请求配置
   * @param requestFn 原始请求函数
   * @returns Promise<AxiosResponse>
   */
  execute(config: RequestConfig, requestFn: () => Promise<AxiosResponse>): Promise<AxiosResponse> {
    // 如果没有中间件，直接执行请求
    if (this.middlewares.length === 0) {
      return requestFn();
    }

    // 构建中间件链
    let index = 0;
    const next = (): Promise<AxiosResponse> => {
      if (index >= this.middlewares.length) {
        return requestFn();
      }
      const middleware = this.middlewares[index++];
      return middleware(config, next);
    };

    return next();
  }
}

export { MiddlewareManagerImpl };
