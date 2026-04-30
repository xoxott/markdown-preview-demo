/** 中断检查阶段（CheckInterrupt Phase） AbortController 信号检测 */

import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import type { LoopPhase } from './LoopPhase';

/**
 * 中断检查阶段
 *
 * 检查 AbortController 信号是否已触发：
 *
 * - 已中断 → 设置 error，跳过后续阶段
 * - 未中断 → 正常传递到 next
 */
export class CheckInterruptPhase implements LoopPhase {
  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    if (ctx.state.toolUseContext.abortController.signal.aborted) {
      ctx.setError(new DOMException('Agent loop 被 AbortSignal 中断', 'AbortError'));
      return;
    }
    yield* next();
  }
}
