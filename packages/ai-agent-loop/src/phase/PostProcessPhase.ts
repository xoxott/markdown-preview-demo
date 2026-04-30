/** 后处理阶段（PostProcess Phase） 过渡判定 + 轮次结束标记 */

import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import type { LoopPhase } from './LoopPhase';

/**
 * 后处理阶段
 *
 * 决定循环过渡类型（继续或终止）：
 *
 * - 无错误 + 无 tool_use → completed（对话结束）
 * - 无错误 + 有 tool_use + 未超限 → next_turn（继续循环）
 * - 无错误 + 有 tool_use + 已超限 → max_turns（达到上限）
 * - AbortError → aborted（用户中断）
 * - 其他错误 → model_error（LLM/API 错误）
 */
export class PostProcessPhase implements LoopPhase {
  constructor(private readonly maxTurns: number) {}

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 产出轮次结束事件
    yield { type: 'turn_end', turnCount: ctx.state.turnCount };

    // 判断过渡类型
    if (ctx.error) {
      if (ctx.error instanceof DOMException && ctx.error.name === 'AbortError') {
        ctx.state.transition = { type: 'aborted', reason: 'Agent loop 被中断' };
      } else {
        ctx.state.transition = { type: 'model_error', error: ctx.error as Error };
      }
    } else if (ctx.needsToolExecution && ctx.state.turnCount + 1 > this.maxTurns) {
      // 注意：turnCount + 1 因为当前轮即将结束，下一轮才会超出限制
      ctx.state.transition = { type: 'max_turns', maxTurns: this.maxTurns };
    } else if (ctx.needsToolExecution) {
      ctx.state.transition = { type: 'next_turn' };
    } else {
      ctx.state.transition = { type: 'completed', reason: 'LLM 无工具调用，对话结束' };
    }

    yield* next();
  }
}
