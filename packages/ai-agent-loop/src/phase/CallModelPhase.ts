/** LLM 调用阶段（CallModel Phase） 流式调用 LLM + tool_use 检测 */

import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import type { LLMProvider, ToolDefinition } from '../types/provider';
import type { LoopPhase } from './LoopPhase';

/**
 * LLM 调用阶段
 *
 * 核心流式阶段：
 *
 * 1. 调用 LLM Provider 流式获取文本增量
 * 2. 累积文本和思考内容到 AgentContext
 * 3. 检测 tool_use blocks，追加到 ctx.toolUses
 * 4. done=true 时设置 needsToolExecution 标记
 */
export class CallModelPhase implements LoopPhase {
  constructor(
    private readonly provider: LLMProvider,
    private readonly tools?: readonly ToolDefinition[]
  ) {}

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 产出轮次开始事件
    yield { type: 'turn_start', turnCount: ctx.state.turnCount };

    try {
      const stream = this.provider.callModel(
        ctx.state.messages,
        this.tools,
        ctx.state.toolUseContext.abortController.signal
      );

      for await (const chunk of stream) {
        // 文本增量
        if (chunk.textDelta) {
          ctx.appendText(chunk.textDelta);
          yield { type: 'text_delta', delta: chunk.textDelta };
        }

        // 思考增量
        if (chunk.thinkingDelta) {
          ctx.appendThinking(chunk.thinkingDelta);
          yield { type: 'thinking_delta', delta: chunk.thinkingDelta };
        }

        // tool_use block
        if (chunk.toolUse) {
          ctx.pushToolUse(chunk.toolUse);
          yield { type: 'tool_use_start', toolUse: chunk.toolUse };
        }

        // 流结束标记
        if (chunk.done) {
          ctx.setNeedsToolExecution(ctx.toolUses.length > 0);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        ctx.setError(err);
        return;
      }
      ctx.setError(err);
      return;
    }

    yield* next();
  }
}
