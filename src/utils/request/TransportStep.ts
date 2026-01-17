/**
 * 传输步骤（Transport Step）
 */

import type { RequestStep, RequestContext, Transport, NormalizedRequestConfig } from '@suga/request-core';

/**
 * 传输步骤
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
    const signal = (ctx.meta.signal as AbortSignal | undefined) || ctx.config.signal;

    let config: NormalizedRequestConfig = ctx.config;
    if (signal) {
      config = {
        ...ctx.config,
        signal,
      };
    }

    try {
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

