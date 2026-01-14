/**
 * 传输步骤（Transport Step）
 * 职责：调用 Transport 执行实际请求
 *
 * 注意：此包不处理业务层响应格式，响应格式处理应由应用层实现
 */

import type { RequestStep, RequestContext, Transport, NormalizedRequestConfig } from '@suga/request-core';

/**
 * 传输步骤
 * 扩展核心 TransportStep，支持从 meta 读取 cancelToken（用于 Axios）
 */
export class TransportStep implements RequestStep {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 检查是否已取消
    if (ctx.state.aborted) {
      return Promise.resolve();
    }

    // 从 meta 读取 cancelToken（由 CancelStep 设置）
    // 优先使用 CancelStep 创建的 cancelToken，如果没有则使用 config 中可能存在的 cancelToken
    const cancelToken = (ctx.meta._cancelToken as unknown) || (ctx.config.cancelToken as unknown);

    // 如果存在 cancelToken，创建新的 config 对象（不修改原 config）
    let config: NormalizedRequestConfig = ctx.config;
    if (cancelToken) {
      config = {
        ...ctx.config,
        cancelToken, // Axios 使用 cancelToken
      };
    }

    try {
      // 使用可能包含 cancelToken 的 config 调用 Transport
      const response = await this.transport.request<T>(config);

      // 更新上下文
      ctx.result = response.data as T;
      ctx.error = undefined;
    } catch (error) {
      // 更新上下文错误
      ctx.error = error;
      throw error;
    }
  }
}

