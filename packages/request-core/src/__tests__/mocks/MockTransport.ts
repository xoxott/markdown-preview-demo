/**
 * Mock Transport 用于测试
 */

import type { Transport, TransportResponse } from '../../transport/Transport';
import type { NormalizedRequestConfig } from '../../context/RequestContext';

export class MockTransport implements Transport {
  private responses: Map<string, TransportResponse> = new Map();
  private requestHistory: NormalizedRequestConfig[] = [];
  private shouldFail = false;
  private failError: Error | null = null;
  private delay = 0;

  /**
   * 设置响应
   */
  setResponse<T>(key: string, response: TransportResponse<T>): void {
    this.responses.set(key, response);
  }

  /**
   * 设置默认响应
   */
  setDefaultResponse<T>(data: T, status = 200): void {
    this.responses.set('default', {
      data,
      status,
      headers: {},
      config: { url: '', method: 'GET' },
    });
  }

  /**
   * 设置是否应该失败
   */
  setShouldFail(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    this.failError = error || new Error('Mock transport error');
  }

  /**
   * 设置延迟
   */
  setDelay(delay: number): void {
    this.delay = delay;
  }

  /**
   * 获取请求历史
   */
  getRequestHistory(): NormalizedRequestConfig[] {
    return this.requestHistory;
  }

  /**
   * 清空请求历史
   */
  clearHistory(): void {
    this.requestHistory = [];
  }

  /**
   * 清空所有设置
   */
  reset(): void {
    this.responses.clear();
    this.requestHistory = [];
    this.shouldFail = false;
    this.failError = null;
    this.delay = 0;
  }

  async request<T>(config: NormalizedRequestConfig): Promise<TransportResponse<T>> {
    // 记录请求历史
    this.requestHistory.push(config);

    // 模拟延迟
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    // 如果应该失败，抛出错误
    if (this.shouldFail) {
      throw this.failError || new Error('Mock transport error');
    }

    // 生成键
    const key = `${config.method}:${config.url}`;

    // 查找响应
    const response = this.responses.get(key) || this.responses.get('default');

    if (response) {
      return {
        ...response,
        config,
      } as TransportResponse<T>;
    }

    // 默认响应
    return {
      data: {} as T,
      status: 200,
      headers: {},
      config,
    };
  }
}

