/**
 * 请求客户端（Request Client）
 * 对外 API，支持链式配置
 */

import type { NormalizedRequestConfig } from '../context/RequestContext';
import { RequestExecutor } from '../executor/RequestExecutor';
import type { RequestStep } from '../steps/RequestStep';
import type { Transport } from '../transport/Transport';
import { TransportStep } from '../steps/TransportStep';
import { PrepareContextStep } from '../steps/PrepareContextStep';

/**
 * 请求客户端
 */
export class RequestClient {
  private steps: RequestStep[] = [];
  private executor: RequestExecutor | null = null;

  constructor(transport: Transport) {
    // 默认步骤顺序
    this.steps = [
      new PrepareContextStep(),
      new TransportStep(transport),
    ];

    this.executor = new RequestExecutor(this.steps);
  }

  /**
   * 添加步骤（链式调用）
   * @param step 请求步骤
   * @returns RequestClient
   */
  with(step: RequestStep): RequestClient {
    this.steps.push(step);
    this.executor = new RequestExecutor(this.steps);
    return this;
  }

  /**
   * 执行请求
   * @param config 标准化请求配置
   * @param meta 元数据（可选，用于业务层传递额外信息）
   * @returns Promise<T>
   */
  request<T = unknown>(
    config: NormalizedRequestConfig,
    meta?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.executor) {
      throw new Error('RequestClient not initialized');
    }
    return this.executor.execute<T>(config, meta);
  }

  /**
   * GET 请求
   */
  get<T = unknown>(
    url: string,
    params?: unknown,
    config?: Partial<NormalizedRequestConfig>,
    meta?: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(
      {
        url,
        method: 'GET',
        params,
        ...config,
      },
      meta,
    );
  }

  /**
   * POST 请求
   */
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<NormalizedRequestConfig>,
    meta?: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(
      {
        url,
        method: 'POST',
        data,
        ...config,
      },
      meta,
    );
  }

  /**
   * PUT 请求
   */
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<NormalizedRequestConfig>,
    meta?: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(
      {
        url,
        method: 'PUT',
        data,
        ...config,
      },
      meta,
    );
  }

  /**
   * DELETE 请求
   */
  delete<T = unknown>(
    url: string,
    config?: Partial<NormalizedRequestConfig>,
    meta?: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(
      {
        url,
        method: 'DELETE',
        ...config,
      },
      meta,
    );
  }

  /**
   * PATCH 请求
   */
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<NormalizedRequestConfig>,
    meta?: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(
      {
        url,
        method: 'PATCH',
        data,
        ...config,
      },
      meta,
    );
  }
}

