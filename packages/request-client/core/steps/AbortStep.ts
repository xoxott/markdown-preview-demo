/**
 * 取消步骤（Abort Step）
 * 职责：检查取消状态、使用 AbortController
 */

import type { RequestStep, RequestContext } from '@suga/request-core';

/**
 * 取消步骤
 */
export class AbortStep implements RequestStep {
  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 检查是否已取消
    if (ctx.state.aborted) {
      return Promise.resolve();
    }

    // 如果配置中已有 signal，检查是否已取消
    if (ctx.config.signal) {
      if (ctx.config.signal.aborted) {
        ctx.state.aborted = true;
        ctx.error = new Error('Request aborted');
        return Promise.resolve();
      }
    }

    return next();
  }
}

