/** LLM 调用阶段（CallModel Phase） 流式调用 LLM + tool_use 检测 + 溢出错误分类 */

import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import type { AgentMessage } from '../types/messages';
import type { LLMProvider, SystemPrompt, ToolDefinition } from '../types/provider';
import type { LoopPhase } from './LoopPhase';
import { classifyLLMError } from './classifyLLMError';

/**
 * LLM 调用阶段
 *
 * 核心流式阶段：
 *
 * 1. 调用 LLM Provider 流式获取文本增量
 * 2. 累积文本和思考内容到 AgentContext
 * 3. 检测 tool_use blocks，追加到 ctx.toolUses
 * 4. 捕获 stopReason/usage → ctx.meta（供 RecoveryPhase/PostProcessPhase 使用）
 * 5. done=true 时设置 needsToolExecution 标记
 * 6. 错误分类：可恢复溢出写 ctx.meta.apiError（不短路），不可恢复设 ctx.error（短路）
 */
export class CallModelPhase implements LoopPhase {
  constructor(
    private readonly provider: LLMProvider,
    private readonly tools?: readonly ToolDefinition[],
    private readonly systemPrompt?: SystemPrompt
  ) {}

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 产出轮次开始事件
    yield { type: 'turn_start', turnCount: ctx.state.turnCount };

    try {
      // 优先使用压缩后的消息（P8 CompressPhase 写入 ctx.meta.compressedMessages）
      const messages: readonly AgentMessage[] =
        (ctx.meta.compressedMessages as readonly AgentMessage[] | undefined) ?? ctx.state.messages;

      const stream = this.provider.callModel(messages, this.tools, {
        signal: ctx.state.toolUseContext.abortController.signal,
        systemPrompt: this.systemPrompt
      });

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

        // stopReason → ctx.meta（RecoveryPhase 检测 max_output_tokens）
        if (chunk.stopReason) {
          ctx.meta.stopReason = chunk.stopReason;
          if (chunk.stopReason === 'max_tokens') {
            ctx.meta.maxOutputTokensReached = true;
          }
        }

        // usage → ctx.meta（RecoveryPhase token budget 检测）
        if (chunk.usage) {
          ctx.meta.usage = chunk.usage;
          ctx.meta.tokenBudgetUsed = chunk.usage.outputTokens;
        }

        // 流结束标记
        if (chunk.done) {
          ctx.setNeedsToolExecution(ctx.toolUses.length > 0);
        }
      }
    } catch (err) {
      const classification = classifyLLMError(err);

      if (
        classification.kind === 'recoverable_overflow' ||
        classification.kind === 'recoverable_overloaded'
      ) {
        // 可恢复错误：写 ctx.meta.apiError，不设 ctx.error → composePhases 不短路
        // RecoveryPhase 可在下游读取 apiError 并触发恢复 transition
        ctx.meta.apiError = classification.apiError;
        yield* next();
        return;
      }

      // 不可恢复错误：设 ctx.error → composePhases 短路终止
      ctx.setError(err);
      return;
    }

    yield* next();
  }
}
