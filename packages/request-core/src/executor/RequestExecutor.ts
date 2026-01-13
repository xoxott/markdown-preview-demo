/**
 * 请求执行器（Request Executor）
 * 基于 Step 链式执行的执行调度器
 */

import type { NormalizedRequestConfig } from '../context/RequestContext';
import { createRequestContext } from '../context/RequestContext';
import type { RequestStep } from '../steps/RequestStep';
import { composeSteps } from '../steps/RequestStep';

/**
 * 请求执行器
 */
export class RequestExecutor {
  constructor(private readonly steps: RequestStep[]) {}

  /**
   * 执行请求
   * @param config 标准化请求配置
   * @param meta 元数据（可选，用于业务层传递额外信息）
   * @returns Promise<T>
   */
  async execute<T>(
    config: NormalizedRequestConfig,
    meta?: Record<string, unknown>,
  ): Promise<T> {
    // 创建请求上下文
    const ctx = createRequestContext<T>(config, undefined, meta);

    // 组合步骤链
    const composed = composeSteps(this.steps);

    // 执行步骤链
    await composed(ctx);

    // 如果有错误，抛出
    if (ctx.error) {
      throw ctx.error;
    }

    // 返回结果
    if (ctx.result === undefined) {
      throw new Error('Request completed but no result');
    }

    return ctx.result;
  }
}

