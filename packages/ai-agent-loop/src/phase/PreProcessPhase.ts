/** 预处理阶段（PreProcess Phase） 消息边界过滤和预处理标记 */

import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import type { LoopPhase } from './LoopPhase';

/**
 * 预处理阶段
 *
 * 当前仅标记 meta.preProcessed = true。 P2-P3 包可通过替换此阶段添加上下文压缩等预处理逻辑。
 */
export class PreProcessPhase implements LoopPhase {
  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 标记预处理完成
    ctx.meta.preProcessed = true;
    yield* next();
  }
}
