/**
 * 请求步骤接口（Request Step）
 * 能力插件的基础接口
 */

import type { RequestContext } from '../context/RequestContext';

/**
 * 请求步骤接口
 * 单一职责、可插拔、可排序、可独立测试
 */
export interface RequestStep {
  /**
   * 执行步骤
   * @param ctx 请求上下文
   * @param next 下一个步骤的执行函数
   * @returns Promise<void>
   */
  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void>;
}

/**
 * 步骤组合函数
 * 将多个步骤组合成链式执行
 */
export function composeSteps(steps: RequestStep[]): <T>(ctx: RequestContext<T>) => Promise<void> {
  return <T>(ctx: RequestContext<T>): Promise<void> => {
    // 如果没有步骤，直接返回
    if (steps.length === 0) {
      return Promise.resolve();
    }

    // 构建执行链
    let index = 0;

    const next = async (): Promise<void> => {
      // 如果已取消，不再执行后续步骤
      if (ctx.state.aborted) {
        return;
      }

      // 如果还有步骤，执行下一个
      if (index < steps.length) {
        const step = steps[index++];
        await step.execute(ctx, next);
      }
    };

    return next();
  };
}

