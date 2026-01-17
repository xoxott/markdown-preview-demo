/**
 * 传输步骤（Transport Step）
 * 职责：调用 Transport 执行实际请求
 *
 * 注意：此包不处理业务层响应格式，响应格式处理应由应用层实现
 */

import type { RequestStep, RequestContext, Transport, NormalizedRequestConfig } from '@suga/request-core';

/**
 * 传输步骤
 * 扩展核心 TransportStep，支持从 meta 读取 signal（用于 Axios）
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

    // 从 meta 读取 signal（使用原生 AbortController）
    // - 如果使用了 CancelStep，CancelStep 会在 meta.signal 中设置
    // - 如果业务层直接传入了 signal，configAdapter 会将其放到 meta.signal 中
    // - 如果业务层在 config 中直接传入了 signal，优先使用
    // 统一使用 signal，符合 Web 标准
    const signal = (ctx.meta.signal as AbortSignal | undefined) || ctx.config.signal;

    // 如果存在 signal，创建新的 config 对象（不修改原 config）
    let config: NormalizedRequestConfig = ctx.config;
    if (signal) {
      config = {
        ...ctx.config,
        signal, // Axios 和原生 fetch 都支持 signal
      };
    }

    try {
      // 使用可能包含 signal 的 config 调用 Transport
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
