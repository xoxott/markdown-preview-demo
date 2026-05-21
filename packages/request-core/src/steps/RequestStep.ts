/** 请求步骤接口（Request Step） 能力插件的基础接口 */

import type { RequestContext } from '../context/RequestContext';
import {
  PIPELINE_RUN_FROM_INDEX_META,
  PIPELINE_STEP_INDEX_META,
  type PipelineRunFromIndex
} from '../meta/pipelineComposeMeta';

/** 请求步骤接口 单一职责、可插拔、可排序、可独立测试 */
export interface RequestStep {
  /**
   * 执行步骤
   *
   * @param ctx 请求上下文
   * @param next 下一个步骤的执行函数
   * @returns Promise<void>
   */
  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void>;
}

/** 步骤组合函数 将多个步骤组合成链式执行 */
export function composeSteps(steps: RequestStep[]): <T>(ctx: RequestContext<T>) => Promise<void> {
  return <T>(ctx: RequestContext<T>): Promise<void> => {
    // 如果没有步骤，直接返回
    if (steps.length === 0) {
      return Promise.resolve();
    }

    // 构建执行链
    let index = 0;

    const runFromIndex: PipelineRunFromIndex = async (fromIndex: number) => {
      let localIndex = fromIndex;

      const runNext = async (): Promise<void> => {
        if (ctx.state.aborted) {
          return;
        }

        if (localIndex < steps.length) {
          const step = steps[localIndex++];
          const stepIndex = localIndex - 1;
          ctx.meta[PIPELINE_STEP_INDEX_META] = stepIndex;
          await step.execute(ctx, runNext);
        }
      };

      await runNext();
    };

    ctx.meta[PIPELINE_RUN_FROM_INDEX_META] = runFromIndex;

    const next = async (): Promise<void> => {
      if (ctx.state.aborted) {
        return;
      }

      if (index < steps.length) {
        const stepIndex = index;
        const step = steps[index++];
        ctx.meta[PIPELINE_STEP_INDEX_META] = stepIndex;
        await step.execute(ctx, next);
      }
    };

    return next();
  };
}
