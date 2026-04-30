/** 循环阶段接口与组合器（Loop Phase） 类比 middleware 链的阶段组合模式 */

import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';

/**
 * 循环阶段接口
 *
 * 每个 Phase 通过 `execute` 方法处理上下文，可通过 `yield* next()` 传递控制到下一个阶段。阶段间通过 `ctx` 共享状态。
 *
 * @example
 *   class MyPhase implements LoopPhase {
 *     async *execute(ctx, next) {
 *       // 前置逻辑
 *       ctx.meta.processed = true;
 *       yield* next(); // 传递到下一个阶段
 *       // 后置逻辑
 *     }
 *   }
 */
export interface LoopPhase {
  /**
   * 执行阶段
   *
   * @param ctx 可变 Agent 上下文
   * @param next 下一个阶段（类似 middleware 的 next）
   * @returns AsyncGenerator<AgentEvent> 流式产出事件
   */
  execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent>;
}

/**
 * 组合阶段链（类似 middleware compose）
 *
 * 将多个 LoopPhase 按顺序组合为一个执行链。 每个阶段可通过 `yield* next()` 传递控制到下一个阶段。 上下文有错误时跳过后续阶段。
 *
 * @param phases 阶段列表（按执行顺序）
 * @returns 组合后的执行函数
 */
export function composePhases(
  phases: readonly LoopPhase[]
): (ctx: MutableAgentContext) => AsyncGenerator<AgentEvent> {
  return async function* composed(ctx: MutableAgentContext): AsyncGenerator<AgentEvent> {
    let index = 0;

    const next = async function* next(): AsyncGenerator<AgentEvent> {
      // 有错误时跳过后续阶段
      if (ctx.error) return;
      if (index < phases.length) {
        const phase = phases[index++];
        yield* phase.execute(ctx, next);
      }
    };

    yield* next();
  };
}
