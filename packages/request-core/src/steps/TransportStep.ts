/**
 * 传输步骤（Transport Step）
 * 职责：调用 Transport 执行实际请求
 */

import type { RequestStep } from './RequestStep';
import type { RequestContext } from '../context/RequestContext';
import type { Transport } from '../transport/Transport';

/**
 * 传输步骤
 */
export class TransportStep implements RequestStep {
  constructor(private readonly transport: Transport) {}

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 检查是否已取消
    if (ctx.state.aborted) {
      return Promise.resolve();
    }

    try {
      // 调用 Transport 执行请求
      const response = await this.transport.request<T>(ctx.config);

      // 更新上下文（Transport 返回的 data 就是最终结果）
      // 注意：业务层的响应处理（如提取 data.data）应该在业务层 Step 中处理
      ctx.result = response.data as T;
      ctx.error = undefined;
    } catch (error) {
      // 更新上下文错误
      ctx.error = error;
      throw error;
    }
  }
}

