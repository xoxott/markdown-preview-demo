/** CompressPhase — P1 集成阶段，替换 PreProcessPhase */

import type { MutableAgentContext } from '@suga/ai-agent-loop';
import type { AgentEvent } from '@suga/ai-agent-loop';
import type { LoopPhase } from '@suga/ai-agent-loop';
import type { CompressPipeline } from '../core/CompressPipeline';

/**
 * 压缩预处理阶段 — 替换 P1 的 PreProcessPhase
 *
 * 在 CallModelPhase 之前执行压缩管线，将压缩后的消息写入 ctx.meta.compressedMessages。
 * CallModelPhase 需感知此 meta 字段来决定使用哪组消息调用 LLM。
 */
export class CompressPhase implements LoopPhase {
  constructor(private readonly pipeline: CompressPipeline) {}

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 执行压缩管线
    const result = await this.pipeline.compress(ctx.state.messages);

    // 压缩后消息写入 meta
    if (result.didCompress) {
      ctx.meta.compressedMessages = result.messages;
      ctx.meta.compressStats = result.stats;
    }

    // 保持 P1 PreProcessPhase 的兼容标记
    ctx.meta.preProcessed = true;
    yield* next();
  }
}
